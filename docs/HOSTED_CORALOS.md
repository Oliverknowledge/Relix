# Hosted CoralOS backend (optional)

This is an **optional, fully gated** way to run the CoralOS coordination layer on
a long-running backend so the **Vercel** app can use CoralOS instead of the local
fallback. It does **not** replace the local CoralOS path and does **not** change
escrow — settlement is still real Solana devnet Anchor escrow, signed by the
founder. CoralOS moves no money.

## What runs where

- **Vercel** — the Next.js app. Calls the backend's `POST /market`.
- **Backend container** — Coral Server (JVM) + the Relix buyer/seller agent
  bundle + the agent registry + a shared `/data` dir + a small Node wrapper.
  The wrapper runs the whole CoralOS round inside the container (server, agents,
  and files are co-located) and returns bids + proof as JSON.

## Coordination precedence (all gated, always falls through)

1. **Hosted CoralOS** — if `CORAL_MARKET_URL` + `RELIX_MARKET_TOKEN` are set →
   `coordinationMode: "coralos-hosted"`.
2. **Local Coral Server** — if `RELIX_CORALOS_ENABLED=1` + `CORAL_API_KEY` →
   `coordinationMode: "coralos"`.
3. **Local fallback** — always available → `coordinationMode: "local-fallback"`.

Any failure/timeout at a higher level falls through to the next. The Protocol
Proof panel and timeline state exactly which one ran.

## Endpoints

- `GET /health` → `200` only if the Coral Server is reachable inside the
  container; `503` otherwise.
- `POST /market` → requires `Authorization: Bearer $RELIX_MARKET_TOKEN`; body is
  `{ "jobContext": { ... } }`. Returns `coordinationMode: "coralos-hosted"`,
  `sessionId`, `threadId`, `jobId`, `namespace`, `buyerAgent`, `sellerAgents`,
  `bids`, `bidIds`, and `recommendedBidId`. Never touches escrow; no Phantom.

## Build & run (Docker)

```bash
# build (downloads the Coral Server jar during build)
docker build -t relix-coralos .
# or: npm run coralos:docker:build

# run
docker run -d --name relix-coralos \
  -e CORAL_API_KEY=<coral auth key> \
  -e RELIX_MARKET_TOKEN=<shared secret Vercel will send> \
  -e PORT=8080 \
  -p 8080:8080 relix-coralos

# verify locally (build + run + health + /market, expects 3 bids)
npm run coralos:docker:test
```

## Required backend env vars

| var | value |
|---|---|
| `CORAL_API_KEY` | Coral Server auth key (injected into the server config at start) |
| `RELIX_MARKET_TOKEN` | shared secret; the `POST /market` bearer token |
| `PORT` | wrapper HTTP port (Railway/Render inject this) |
| `RELIX_DATA_DIR` | `/data` (default; writable, shared by wrapper + agents) |
| `CORAL_SERVER_URL` | `http://localhost:5555` (default; internal) |
| `RELIX_CORALOS_ENABLED` | `1` (default) |
| `CORAL_NAMESPACE` | `relix` (default) |

## Required Vercel env vars

| var | value |
|---|---|
| `CORAL_MARKET_URL` | `https://<your-backend-host>/market` |
| `RELIX_MARKET_TOKEN` | same shared secret as the backend |

Leave these **unset** to keep Vercel on the local fallback. Setting them makes
Vercel use the hosted backend, with automatic fallback if it's down.

## Railway deployment checklist

1. New project → **Deploy from repo** (uses the `Dockerfile`).
2. Set env vars: `CORAL_API_KEY`, `RELIX_MARKET_TOKEN` (leave `PORT` to Railway).
3. Set the service **Healthcheck path** to `/health`.
4. Give it **~1 GB RAM** (JVM + wrapper + up to 4 launched Node agents).
5. Deploy; wait for the healthcheck to go green, then note the public URL.
6. **Verify the backend before connecting Vercel:**
   ```bash
   curl -s https://<backend>/health
   curl -s -X POST https://<backend>/market \
     -H "Authorization: Bearer <RELIX_MARKET_TOKEN>" \
     -H "Content-Type: application/json" \
     --data @scripts/coralos/sample-job.json
   ```
   Expect `coordinationMode: "coralos-hosted"` and three seller bids.
7. In **Vercel**, set `CORAL_MARKET_URL=https://<backend>/market` and
   `RELIX_MARKET_TOKEN=<secret>`, then redeploy. The Protocol Proof panel should
   read **"Hosted CoralOS backend active."**

(Render Starter and Fly.io work the same way with the same Dockerfile; Render's
free tier sleeps, so use a paid tier to keep the JVM warm.)

## Fallback explanation

If the hosted backend is unreachable, times out (~25s), errors, or returns no
bids, Relix falls through to the local Coral Server (if configured) and then to
local in-process bidding. The run is then labelled honestly — the panel/timeline
never claim CoralOS when it wasn't used. Escrow settlement is unaffected in every
case.

## Honesty notes

- CoralOS coordinates **buyer/seller agents only**; it moves no money.
- **Anchor** handles **all** settlement on Solana devnet.
- The hosted backend runs Relix's own built-in specialist agents — not remote
  third-party agents.
