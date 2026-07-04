// Hosted CoralOS market wrapper. Runs INSIDE the backend container next to the
// Coral Server and the launched Relix agents (which all share the container
// filesystem), and exposes a tiny HTTP API the Vercel app calls:
//
//   GET  /health  -> 200 only if the Coral Server is reachable internally
//   POST /market  -> Bearer-authed; runs one real CoralOS coordination round
//                    (via the existing runCoralMarket) and returns bids + proof
//
// It never touches escrow and never needs Phantom — it is pure buyer/seller
// coordination. Bundle with esbuild and run with `node dist/coralos-server.mjs`.
import { createServer, type IncomingMessage } from "node:http";
import { runCoralMarket } from "@/app/lib/coralos/client";
import type { SpecialistJobContext } from "@/app/lib/specialist-agents";

const PORT = Number(process.env.PORT || 8080);
const TOKEN = process.env.RELIX_MARKET_TOKEN;
const CORAL_SERVER_URL = process.env.CORAL_SERVER_URL || "http://localhost:5555";

function json(res: import("node:http").ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

async function coralServerHealthy(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${CORAL_SERVER_URL}/ui/console`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const url = req.url ?? "";

  if (req.method === "GET" && url.startsWith("/health")) {
    const ok = await coralServerHealthy();
    json(res, ok ? 200 : 503, { ok, coralServerUrl: CORAL_SERVER_URL });
    return;
  }

  if (req.method === "POST" && url.startsWith("/market")) {
    if (!TOKEN || req.headers.authorization !== `Bearer ${TOKEN}`) {
      json(res, 401, { error: "unauthorized" });
      return;
    }

    try {
      const body = JSON.parse(await readBody(req)) as {
        jobContext?: SpecialistJobContext;
      };
      const jobContext = body.jobContext;
      if (!jobContext || typeof jobContext !== "object") {
        json(res, 400, { error: "missing jobContext" });
        return;
      }

      const result = await runCoralMarket(jobContext);
      // Convenience hint only — Relix still runs the authoritative selection.
      const recommended = [...result.bids].sort(
        (a, b) => a.bid.priceSol - b.bid.priceSol
      )[0];

      json(res, 200, {
        coordinationMode: "coralos-hosted",
        sessionId: result.sessionId,
        threadId: result.threadId,
        jobId: result.jobId,
        namespace: result.namespace,
        buyerAgent: result.buyerAgent,
        sellerAgents: result.sellerAgents,
        bidIds: result.bidIds,
        bids: result.bids,
        recommendedBidId: recommended?.bid.id ?? null
      });
    } catch (error) {
      // The Vercel client treats any non-2xx as "unavailable" and falls back.
      json(res, 502, {
        error: error instanceof Error ? error.message : "market round failed"
      });
    }
    return;
  }

  json(res, 404, { error: "not found" });
});

server.listen(PORT, () => {
  console.log(`[coralos-server] listening on :${PORT} (coral ${CORAL_SERVER_URL})`);
});
