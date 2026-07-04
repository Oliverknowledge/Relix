// Relix CoralOS market agent. One bundle, two roles, launched by the Coral
// Server's executable runtime (one process per agent in the session graph).
//
//   role "buyer"  -> the Growth Employee: opens a market thread, posts the
//                    launch job, collects every seller's bid, writes the result.
//   role "seller" -> a specialist: reads the job, computes its REAL Relix bid
//                    (the exact same logic the app uses), posts it back.
//
// Coordination is real CoralOS: create_thread / send_message / wait_for_mention
// over MCP-SSE. The bid content is Relix's own Bid object, so the app's existing
// selection/scoring/delivery flow consumes CoralOS bids unchanged.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { getSpecialistAdapter } from "@/app/lib/specialist-agents";
import type { Bid, SpecialistJobContext } from "@/app/lib/specialist-agents";

type SellerRef = { name: string; specialistId: string };
type MarketJob = {
  jobId: string;
  jobContext: SpecialistJobContext;
  sellers: SellerRef[];
};
type CollectedBid = { specialistId: string; sellerName: string; bid: Bid };

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const positional = args.filter((a) => !a.startsWith("--"));
const flagValue = (name: string) =>
  flags.find((f) => f.startsWith(`${name}=`))?.split("=").slice(1).join("=");

const role = positional[0];
const specialistId = positional[1];
const agentId = process.env.CORAL_AGENT_ID ?? role ?? "agent";
const connectionUrl = process.env.CORAL_CONNECTION_URL;
// The session id is injected by the Coral runtime and keys the job file that
// Relix wrote before launching the (deferred) session — no race, no options.
const jobId = process.env.CORAL_SESSION_ID ?? process.env.RELIX_JOB_ID;
const dataDir =
  flagValue("--data-dir") ?? process.env.RELIX_DATA_DIR ?? `${process.cwd()}/data`;

const log = (...a: unknown[]) => console.log(`[${agentId}]`, ...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function jobPath(id: string) {
  return `${dataDir}/coralos/jobs/${id}.json`;
}
function resultPath(id: string) {
  return `${dataDir}/coralos/results/${id}.json`;
}

function loadJob(): MarketJob {
  if (!jobId) throw new Error("RELIX_JOB_ID not set");
  return JSON.parse(readFileSync(jobPath(jobId), "utf8")) as MarketJob;
}

// Resolve exact Coral tool names from the server (they are namespaced, e.g.
// coral_create_thread) instead of hard-coding, so a version bump can't break us.
function pickTool(tools: { name: string }[], ...keywords: string[]) {
  const t = tools.find((t) =>
    keywords.every((k) => t.name.toLowerCase().includes(k))
  );
  if (!t) {
    throw new Error(
      `no Coral tool matching ${keywords.join("+")} in [${tools
        .map((t) => t.name)
        .join(", ")}]`
    );
  }
  return t.name;
}

function textOf(result: unknown) {
  const content = (result as { content?: { type: string; text?: string }[] }).content;
  const block = (content ?? []).find((c) => c.type === "text");
  return block?.text ?? JSON.stringify(result);
}

async function connect() {
  if (!connectionUrl) throw new Error("CORAL_CONNECTION_URL not set");
  const client = new Client({ name: `relix-${agentId}`, version: "0.1.0" });
  await client.connect(new SSEClientTransport(new URL(connectionUrl)));
  const { tools } = await client.listTools();
  return {
    client,
    createThread: pickTool(tools, "thread", "creat"),
    sendMessage: pickTool(tools, "send", "message"),
    waitMention: pickTool(tools, "wait", "mention"),
    waitAgent: pickTool(tools, "wait", "agent")
  };
}

async function runBuyer() {
  const job = loadJob();
  const { client, createThread, sendMessage, waitAgent } = await connect();
  const sellerNames = job.sellers.map((s) => s.name);
  log("market open, inviting sellers:", sellerNames.join(", "));

  // Give the seller processes a moment to reach their wait loop.
  await sleep(1500);

  // Capture the replay cursor BEFORE posting the job so per-seller waits below
  // see every bid, even bids that land in the same millisecond.
  const since = Date.now() - 1;

  const created = await client.callTool({
    name: createThread,
    arguments: { threadName: `relix-market-${job.jobId}`, participantNames: sellerNames }
  });
  const parsed = JSON.parse(textOf(created)) as { thread?: { id: string }; id?: string };
  const threadId = parsed.thread?.id ?? parsed.id!;
  log("thread", threadId);

  await client.callTool({
    name: sendMessage,
    arguments: {
      threadId,
      content: `JOB ${job.jobId}: submit your bid for "${job.jobContext.goal}"`,
      mentions: sellerNames
    }
  });
  log("job posted, collecting bids...");

  // Collect one bid per seller. wait_for_agent filters by sender, so it is
  // immune to same-millisecond ordering (unlike wait_for_mention, whose
  // replay cursor is millisecond-limited).
  const bids: CollectedBid[] = [];
  for (const seller of job.sellers) {
    try {
      const got = await client.callTool({
        name: waitAgent,
        arguments: { agentName: seller.name, maxWaitMs: 20000, currentUnixTime: since }
      });
      const out = JSON.parse(textOf(got)) as { message?: { text: string; senderName: string } };
      const m = out.message;
      if (!m) {
        log(`no bid from ${seller.name} (timeout)`);
        continue;
      }
      const bid = JSON.parse(m.text) as Bid;
      bids.push({ specialistId: bid.specialistId, sellerName: seller.name, bid });
      log(`bid from ${seller.name}: ${bid.priceSol} SOL`);
    } catch (e) {
      log(`error collecting from ${seller.name}:`, (e as Error).message);
    }
  }

  const out = resultPath(job.jobId);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    JSON.stringify(
      {
        jobId: job.jobId,
        threadId,
        sessionId: process.env.CORAL_SESSION_ID ?? null,
        buyerAgent: agentId,
        collected: bids.length,
        expected: job.sellers.length,
        bids
      },
      null,
      2
    )
  );
  log(`wrote result: ${bids.length}/${job.sellers.length} bids`);
  await client.close();
}

async function runSeller() {
  const job = loadJob();
  const id = specialistId ?? job.sellers.find((s) => s.name === agentId)?.specialistId;
  if (!id) throw new Error(`no specialistId for seller ${agentId}`);
  const { client, sendMessage, waitMention } = await connect();
  log("waiting for job as specialist", id);

  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    const got = await client.callTool({
      name: waitMention,
      arguments: { maxWaitMs: 15000, currentUnixTime: Date.now() }
    });
    const out = JSON.parse(textOf(got)) as { message?: { threadId: string } };
    const m = out.message;
    if (!m?.threadId) continue;

    // The real Relix bid — identical to what the app computes locally.
    const bid = await getSpecialistAdapter(id).bid(job.jobContext);
    await client.callTool({
      name: sendMessage,
      arguments: { threadId: m.threadId, content: JSON.stringify(bid), mentions: ["buyer"] }
    });
    log(`submitted bid: ${bid.priceSol} SOL`);
    break;
  }
  await client.close();
}

async function main() {
  if (role === "buyer") await runBuyer();
  else if (role === "seller") await runSeller();
  else throw new Error(`unknown role "${role}" (expected buyer|seller)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(`[${agentId}] ERROR`, e);
  process.exit(1);
});
