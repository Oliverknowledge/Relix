import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataDirectory } from "@/app/lib/data-path";
import type { SpecialistJobContext } from "@/app/lib/specialist-agents";
import { getCoralConfig, type CoralConfig } from "@/app/lib/coralos/config";
import type {
  CoralCollectedBid,
  CoralMarketJob,
  CoralMarketResult
} from "@/app/lib/coralos/types";

// Thrown when the CoralOS coordination path cannot be used or completed. The
// campaign flow catches this and falls back to local in-process bidding.
export class CoralUnavailableError extends Error {}

const RESULT_POLL_MS = 1000;
const RESULT_TIMEOUT_MS = 60000;

function jobFilePath(sessionId: string) {
  return path.join(dataDirectory(), "coralos", "jobs", `${sessionId}.json`);
}
function resultFilePath(sessionId: string) {
  return path.join(dataDirectory(), "coralos", "results", `${sessionId}.json`);
}

async function coralFetch(config: CoralConfig, apiPath: string, body: unknown) {
  const res = await fetch(`${config.serverUrl}${apiPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new CoralUnavailableError(
      `Coral Server ${apiPath} -> ${res.status} ${await res.text()}`
    );
  }
  return res;
}

function graphAgent(ref: { registryName: string; version: string; graphName: string }) {
  return {
    id: { name: ref.registryName, version: ref.version, registrySourceId: { type: "local" } },
    name: ref.graphName,
    provider: { type: "local", runtime: "executable" },
    proxies: {}
  };
}

/**
 * Runs one real CoralOS market round for the built-in specialists: the buyer
 * (Growth Employee) posts a launch job over the Coral market protocol, the
 * seller agents bid, and the buyer collects them. Returns the collected bids
 * and the session/thread ids for the Protocol Proof panel.
 *
 * Uses deferred execution so the job file is written (keyed by session id)
 * before the agents launch — no race, no per-session agent options.
 *
 * @throws CoralUnavailableError if CoralOS is disabled, unreachable, or times
 *   out, so the caller can fall back to local bidding.
 */
export async function runCoralMarket(
  jobContext: SpecialistJobContext
): Promise<CoralMarketResult> {
  const config = getCoralConfig();
  if (!config) {
    throw new CoralUnavailableError("CoralOS is not enabled in this environment");
  }

  const sessionRequest = {
    agentGraphRequest: {
      agents: [
        graphAgent(config.buyer),
        ...config.sellers.map((s) => graphAgent(s))
      ],
      groups: [[config.buyer.graphName, ...config.sellers.map((s) => s.graphName)]],
      customTools: {}
    },
    namespaceProvider: {
      type: "create_if_not_exists",
      namespaceRequest: {
        name: config.namespace,
        deleteOnLastSessionExit: true,
        annotations: { app: "relix" }
      }
    },
    execution: { mode: "defer" }
  };

  // 1. Create the session (deferred — agents not launched yet).
  const created = (await (
    await coralFetch(config, "/api/v1/local/session", sessionRequest)
  ).json()) as { sessionId: string; namespace: string };
  const { sessionId, namespace } = created;

  // 2. Write the job file the agents will read (keyed by session id).
  const job: CoralMarketJob = {
    jobId: sessionId,
    jobContext,
    sellers: config.sellers.map((s) => ({ name: s.graphName, specialistId: s.specialistId }))
  };
  const jobPath = jobFilePath(sessionId);
  await mkdir(path.dirname(jobPath), { recursive: true });
  await mkdir(path.dirname(resultFilePath(sessionId)), { recursive: true });
  await writeFile(jobPath, JSON.stringify(job, null, 2));

  // 3. Launch the deferred session — the server starts every agent process.
  await coralFetch(
    config,
    `/api/v1/local/session/${encodeURIComponent(namespace)}/${encodeURIComponent(sessionId)}`,
    {}
  );

  // 4. Poll for the buyer's collected result.
  const result = await pollResult(sessionId);

  const bids = result.bids ?? [];
  if (bids.length === 0) {
    throw new CoralUnavailableError("CoralOS market returned no bids");
  }

  return {
    sessionId,
    namespace,
    jobId: sessionId,
    threadId: result.threadId,
    buyerAgent: config.buyer.graphName,
    sellerAgents: config.sellers.map((s) => s.graphName),
    serverUrl: config.serverUrl,
    bids,
    bidIds: bids.map((b) => b.bid.id)
  };
}

async function pollResult(sessionId: string): Promise<{
  bids: CoralCollectedBid[];
  threadId: string;
}> {
  const deadline = Date.now() + RESULT_TIMEOUT_MS;
  const file = resultFilePath(sessionId);
  while (Date.now() < deadline) {
    try {
      const raw = await readFile(file, "utf8");
      const parsed = JSON.parse(raw) as {
        bids: CoralCollectedBid[];
        threadId: string;
      };
      return parsed;
    } catch {
      await new Promise((r) => setTimeout(r, RESULT_POLL_MS));
    }
  }
  throw new CoralUnavailableError("CoralOS market timed out waiting for bids");
}
