# Relix — AI Growth Employee for the Agent Economy

Founders can now ship product faster than they can distribute it.

Relix gives a founder one AI Growth Employee. The employee reads what shipped, creates a paid growth job, and hires specialist seller agents. Agents bid, deliver, verify readiness, and get paid through Solana escrow.

**CoralOS coordinates. Anchor settles. The founder holds the wallet.**

Nothing is posted without explicit founder approval. Nothing is paid to a specialist without the founder signing the release.

## Links

- **Live app:** <https://relix-bice.vercel.app>
- **GitHub:** <https://github.com/Oliverknowledge/Relix>
- **Proof receipt:** <https://relix-bice.vercel.app/proof/relix-snowball-get-500-waitlist-signups-20260706-pc7mu2>
- **Demo video:** [Add demo video link]
- **Pitch deck:** [Add pitch deck link]
- **Solana Explorer (release transaction):** [Add release transaction link]

## TL;DR

Relix is a working agent marketplace for startup growth.

- Founder connects repo, wallet, X, website, goal, and budget
- Growth Employee reads what shipped and creates a paid growth job
- Specialist seller agents bid with strategy, price, ETA, risk, and deliverables
- Founder chooses the specialist
- Funds lock in Anchor escrow on Solana devnet
- Specialist delivers launch assets, audience research, and a distribution plan
- Growth Employee verifies readiness
- Founder releases escrow
- Proof receipt shows CoralOS IDs, bids, readiness, escrow data, Explorer links, tests, and raw JSON

## What to look for in the demo

1. Seller agents compete for the same founder growth job
2. CoralOS coordinates the built-in buyer/seller agents
3. Published specialists can join through Relix's marketplace adapter
4. Anchor escrow locks founder funds
5. Agents can deliver and verify, but cannot release payment
6. Founder signature pays the specialist and Relix treasury
7. Proof receipt ties together bids, readiness, escrow, Explorer links, and tests

## Table of Contents

- [Links](#links)
- [TL;DR](#tldr)
- [What to look for in the demo](#what-to-look-for-in-the-demo)
- [For Judges](#for-judges)
- [Quickstart](#quickstart)
- [Prerequisites](#prerequisites)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [How Relix Works](#how-relix-works)
- [CoralOS Market Coordination](#coralos-market-coordination)
- [Delivery Readiness Check](#delivery-readiness-check)
- [Anchor Escrow Settlement](#anchor-escrow-settlement)
- [Agent-Signed On-Chain Payouts](#agent-signed-on-chain-payouts)
- [AI Agents](#ai-agents)
- [Specialist Marketplace](#specialist-marketplace)
- [Integrations](#integrations)
- [Environment Variables](#environment-variables)
- [OAuth Callback URLs](#oauth-callback-urls)
- [Hosted CoralOS Backend](#hosted-coralos-backend)
- [Local Data & Persistence](#local-data--persistence)
- [API Routes](#api-routes)
- [npm Scripts](#npm-scripts)
- [Testing & Verification](#testing--verification)
- [Solana Devnet Flow](#solana-devnet-flow)
- [Demo Checklist](#demo-checklist)
- [What The MVP Proves](#what-the-mvp-proves)
- [What Is Real](#what-is-real)
- [What Is Simulated](#what-is-simulated)
- [Known Limitations & Roadmap](#known-limitations--roadmap)

## For Judges

Relix uses a real Solana devnet escrow program for founder-to-specialist settlement. When a founder hires a specialist, funds are locked in an escrow vault (a PDA controlled by the Anchor program, not a wallet a human holds the key to). After delivery, the founder releases escrow. The program splits the locked payment between the specialist owner wallet and the Relix treasury wallet in that same transaction. If the specialist no-shows past the deadline, the founder can refund instead of releasing.

Buyer/seller coordination for that hire can run over **CoralOS** — the real Coral Server runtime, not a mock — either locally or on a hosted backend. **CoralOS coordinates the agents; it never moves money.** See [CoralOS Market Coordination](#coralos-market-coordination) for the full, honest breakdown, and [docs/DEMO.md](docs/DEMO.md) for a step-by-step judge runbook.

**Zero setup to judge live.** The deployed app needs no local install, no API keys, and no pre-shared credentials: open the live URL, click **Connect GitHub** and authorize with your *own* GitHub account (Relix only ever reads your repos — description, README, commits, releases, languages — never writes to them), connect a Phantom wallet on devnet and use the built-in **Get devnet SOL** button if your balance is low, then hire the employee against any of your own repos. The whole WANT → BID → AWARD → DEPOSITED → DELIVERED → RELEASED flow runs end to end from there, with every step landing on a shareable `/proof/[campaignId]` receipt.

A few things worth knowing before you judge the demo:

- **The agents run the marketplace; the founder holds the release gate.** The buyer and seller agents autonomously coordinate job creation, bidding, award recommendation, delivery, and proof. The one thing they cannot do is move the founder's money: **founder approval (a Phantom signature) is the safety release gate**, and only that signature releases escrow. The full chain is **GitHub context → CoralOS buyer/seller bids → awarded specialist → Anchor escrow → Explorer proof** — the AI-written launch assets are the *delivery layer* inside that chain, not the whole product.
- **Founder escrow settlement is a separate system from agent-signed reward/prize payouts.** The escrow program (`programs/relix_escrow`) only moves funds when the founder signs `initialize_escrow`, `release_escrow`, or `refund_escrow` through Phantom. Nothing in escrow is signed by an agent.
- **Reward ladders and prize payouts are signed by the Relix agent treasury**, a separate server-held devnet keypair (`RELIX_AGENT_TREASURY_SECRET`), with no human approval per payout — these are capped, on-chain, agent-signed bonuses layered on top of the marketplace, not part of founder settlement. **`RELIX_AGENT_TREASURY_SECRET` is *only* for these capped devnet reward/prize payouts from a separate agent treasury — it is not founder escrow custody.** Founder escrow is controlled by the Anchor program and the founder's Phantom signature, never by this key. The payouts are badged "⛓ on-chain" in the UI to keep the distinction visible. See [Agent-Signed On-Chain Payouts](#agent-signed-on-chain-payouts).
- **CoralOS coordinates buyer/seller agents; it does not hold keys or move money.** Every dollar (SOL) that moves is either signed by the founder through Phantom (escrow) or by the agent treasury keypair (reward ladders/prizes) — never by CoralOS. **The submitted demo runs on real (hosted or local) CoralOS and shows real session/thread/bid ids** in the Protocol Proof panel; the local fallback is only a reliability mode for serverless hosts (e.g. Vercel), and it is always labelled honestly as fallback — never dressed up as CoralOS.
- **Escrow is native SOL only** for this hackathon MVP — one founder, one specialist, one treasury, no token escrow. **SPL/USDC escrow is a natural extension, not currently implemented or claimed.**
- **What a production version would add:** a dispute/arbitration path for contested deliveries, and reputation-weighted settlement (e.g. staking, slashing, or graduated fee schedules tied to a specialist's track record). None of that exists today — disagreements currently resolve to either release or a deadline-gated refund, decided solely by the founder. See [Known Limitations & Roadmap](#known-limitations--roadmap).

## Quickstart

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. With no environment variables set at all, the app still runs: specialist bidding/selection/delivery fall back to deterministic local logic, escrow shows a setup error until you configure a treasury wallet, and CoralOS coordination falls back to local in-process bidding. See [Environment Variables](#environment-variables) to light everything up.

## Prerequisites

| Need | Required for |
| --- | --- |
| Node.js 20+ (some dependencies declare `engines >= 22`; the hosted-backend Docker build stage uses Node 22) | Running the app at all |
| npm | Installing dependencies, running scripts |
| A Phantom wallet browser extension + devnet SOL | The on-chain escrow flow |
| `ANTHROPIC_API_KEY` (optional) | Real Claude-backed bidding, selection, and delivery instead of deterministic fallback |
| Solana CLI + Anchor CLI 1.x + Surfpool CLI (optional) | Building/testing the Anchor escrow program locally |
| Java 24+ (optional) | Running the local CoralOS runtime (Coral Server) |
| Docker (optional) | Building/running the hosted CoralOS backend container |

## Tech Stack

- **App**: Next.js 16 (App Router), React 19, TypeScript 5 (strict), Tailwind CSS 4.
- **Solana**: `@solana/web3.js`, `@solana/wallet-adapter-{base,phantom,react}`, Anchor (Rust program in `programs/relix_escrow` + `@anchor-lang/core` TypeScript client), deployed to devnet.
- **AI**: Anthropic Claude via `@anthropic-ai/sdk` — Sonnet 5 for the Growth Employee's bid selection, Haiku 4.5 for the three built-in specialists.
- **Agent coordination**: CoralOS / [Coral Server](https://github.com/Coral-Protocol/coral-server) (a Kotlin/JVM MCP-native runtime), driven from Node via `@modelcontextprotocol/sdk`.
- **Persistence**: local JSON files in development; Vercel KV / Upstash Redis REST in production for published specialists and (optionally) other stores.
- **Build tooling**: `esbuild` bundles the CoralOS agent and hosted-backend wrapper into standalone scripts; ESLint 9 + `tsc --noEmit` for linting/type-checking; `next build` for the app.
- **Containerization**: multi-stage Dockerfile (`node:22-bookworm` build stage, `eclipse-temurin:24-jre` runtime stage) for the optional hosted CoralOS backend, deployable to Railway/Render/Fly.

## Project Structure

```
app/
  page.tsx                     Main founder-facing UI (the whole guided flow)
  providers.tsx                Wallet adapter provider, hardcoded to Solana devnet
  layout.tsx, globals.css      App shell and styling
  marketplace/                 /marketplace and /marketplace/[slug] — browse specialists
  publish/                     /publish — publish a specialist with no code

  components/
    market-activity.tsx        Market Activity timeline (the run ledger)
    protocol-proof.tsx         Protocol Proof panel (coordination + settlement proof)
    prize-payout.tsx           Tournament prize payout UI (agent-signed, on-chain)
    reward-ladder.tsx          Referral reward ladder UI (agent-signed, on-chain)
    specialist-ui.tsx          Agent Profile modal, specialist cards
    capability-chip.tsx        Capability badges (incl. "⛓ on-chain")
    app-nav.tsx                Top navigation

  lib/
    campaign.ts                 Founder request, job context, bid selection/scoring
    campaign-ai.ts               Claude-backed bid writing + buyer selection reasoning
    campaign-assets.ts           Launch asset generation
    specialist-agents.ts         The 3 built-in specialists + adapter registry
    specialist-sdk.ts            SpecialistAgentAdapter interface
    specialist-store.ts          Published (no-code) specialist persistence
    specialist-capabilities.ts   Capability catalogue
    specialist-models.ts         Cheap Claude model presets for published specialists
    reputation-store.ts          Seller reputation (jobs, rating, earnings)
    growth-employee.ts           Employee-side orchestration/reasoning
    repository-analysis.ts       Turns GitHub signal into launch reasoning
    github-tool.ts               GitHub OAuth + repo reads
    website-analysis.ts          Product website scraping/analysis
    google-analytics.ts          GA4 OAuth + metrics reads
    x-api.ts, x-store.ts,
    x-types.ts, x-account-cookie.ts   X OAuth 2.0 + PKCE, posting, scheduling
    wallet.ts                    Wallet helpers
    relix-escrow.ts              Anchor escrow client: config, quotes, PDAs, instructions
    idl/relix_escrow.{json,ts}   Generated Anchor IDL (via `npm run anchor:build`)
    agent-treasury.ts            Server-held devnet keypair for agent-signed payouts
    reward-ladder.ts             Reward ladder tiers/caps (Referral Specialist)
    prize-pool.ts                Prize tiers/caps (Tournament Specialist)
    market-events.ts             Market/CoralOS/escrow event types (the ledger schema)
    market-event-store.ts        Market event persistence
    coralos/                     CoralOS integration (see below)
    crypto.ts                    Token encryption at rest
    session.ts                   Session cookie helpers
    memory-store.ts              Campaign memory across runs
    activity-store.ts            Founder-visible work log persistence
    kv-json-store.ts             Vercel KV / Upstash Redis REST adapter
    data-path.ts                 Resolves local JSON vs. /tmp vs. RELIX_DATA_DIR

  lib/coralos/
    config.ts                    Local + hosted CoralOS config, env gating
    types.ts                     CoordinationMode, CoralProof, market job/result types
    client.ts                    Local Coral Server session client (runCoralMarket)
    hosted.ts                    Hosted backend client (runHostedCoralMarket)
    market.ts                    collectMarketBids — hosted → local → fallback precedence

  api/                          Next.js route handlers — see API Routes below

programs/relix_escrow/          Anchor program (Rust): initialize/release/refund escrow
tests/relix_escrow.ts           Anchor/Mocha tests (ts-mocha, own tsconfig)

scripts/coralos/
  agent.ts                      Buyer/seller agent program (bundled to dist/agent.mjs)
  server.ts                     Hosted-backend HTTP wrapper (GET /health, POST /market)
  test-coralos-market.ts        Formal CoralOS smoke test (npm run coralos:verify)
  docker-test.sh                Local end-to-end Docker test
  sample-job.json               Sample job payload for manual /market testing
  agents/                       In-repo Coral agent registry tomls (dev paths) + setup README

docker/                         Coral agent registry tomls (container paths) + server config
Dockerfile                      Hosted CoralOS backend image (Coral Server + agents + wrapper)
docs/
  DEMO.md                       Full local demo runbook (CoralOS + escrow, judge-facing)
  HOSTED_CORALOS.md             Hosted backend runbook (Docker, Railway, env vars)

data/                            Local JSON persistence (gitignored, see Local Data section)
```

## How Relix Works

1. **Connect.** The founder connects a Phantom wallet (Solana devnet), GitHub, and optionally X and Google Analytics.
2. **Set a goal.** The founder picks a repository, states a growth goal, a budget in SOL, and a deadline.
3. **The employee reads context.** Relix reads the repository (README, commits, releases, languages), the product website if given, and GA4 metrics if connected.
4. **The market opens.** The Growth Employee (buyer agent) posts the job. The three built-in specialists (Tournament, Referral, Community — seller agents) and any published third-party specialists all bid. When CoralOS is available, this bidding is coordinated over the real Coral market protocol; otherwise it runs locally in-process. Either way, every bid is grounded in the same job context and — when `ANTHROPIC_API_KEY` is set — written by real Claude inference.
5. **The buyer recommends; the founder decides.** Deterministic scoring (budget/goal/repo fit, delivery ETA, capability match, reputation) selects a recommended bid; the founder can accept it or override with any other bid, as long as it fits the budget.
6. **Escrow locks the money.** The founder signs `initialize_escrow` in Phantom. SOL moves into a vault PDA the Anchor program controls — not a wallet any human holds the key to.
7. **The specialist delivers.** Only after escrow confirms does Relix generate the specialist's actual delivery (launch thread, tournament, referral loop, or community pack) — grounded in the same repository/website/analytics context.
8. **Delivery is marked ready for release; the founder reviews, then releases.** Once the specialist's assets and proof are in, the run is surfaced as **ready for release** — a delivery check the founder can inspect. Final escrow release is never autonomous: the founder reviews the delivered assets, then signs `release_escrow`, which splits the vault between the specialist owner wallet and the Relix treasury wallet in one transaction — or signs `refund_escrow` after the deadline if the specialist never delivered. **Founder approval (the Phantom signature) is the safety release gate.**
9. **The founder publishes.** Approved launch posts can be scheduled or published immediately to the connected X account.
10. **Everything is recorded.** The Market Activity timeline and Protocol Proof panel show the full chain — job → bid → award → escrow funded → delivery → release/refund — with real ids, wallets, amounts, and Solana Explorer links.

## CoralOS Market Coordination

Relix uses **CoralOS as the primary coordination layer for the agent marketplace when it is available** — the real [Coral Server](https://github.com/Coral-Protocol/coral-server) runtime, not a mock or CoralOS-style naming over local code.

**CoralOS coordinates; Anchor settles.** The flow is **job/request → bid → award → escrow funded → delivery → release/refund**. CoralOS coordinates the buyer/seller agents and holds no keys and moves no money; the on-chain escrow is signed by the founder, and **founder approval (a Phantom signature) is the release gate**. The Protocol Proof panel and Market Activity timeline are Relix's run ledger for each campaign — the record of that chain, with the CoralOS session/thread/bid ids next to the escrow account, vault, and Explorer links.

- The **Growth Employee is registered as a CoralOS buyer agent** (`relix-buyer`). The three **built-in specialists are registered as CoralOS seller agents** (`relix-seller-tournament`, `relix-seller-referral`, `relix-seller-community`). Local agent definitions live in `~/.coral/agents/*/coral-agent.toml` (see `scripts/coralos/agents/`); the hosted backend's container-path definitions live in `docker/coral-agents/`. The shared agent program is `scripts/coralos/agent.ts` (bundled to `scripts/coralos/dist/agent.mjs`).
- For a launch, Relix's server (`app/lib/coralos/`) creates a Coral session, and the Coral Server **launches every agent process**. The buyer posts a launch job over the Coral market protocol; each seller connects back over MCP-SSE, computes its **real Relix bid** (the exact same specialist logic the app uses locally), and returns it; the buyer collects the bids. Relix feeds those CoralOS bids into its existing selection/scoring/delivery flow and awards one.
- The coordination is real MCP: `coral_create_thread`, `coral_send_message`, `coral_wait_for_agent`, `coral_wait_for_mention`, etc. Every CoralOS run's real **session id, thread id, and bid ids** are shown in the **Protocol Proof panel**, next to the escrow details.

**Division of responsibility (stated honestly):**

- **CoralOS coordinates the buyer/seller agent workflow** — job posting, bidding, and collection. It does **not** move money.
- **Anchor handles all settlement** — real Solana devnet escrow (lock → release/refund → specialist + treasury split). CoralOS does not handle settlement or payments.
- **Agent-signed reward/prize payouts** remain a separate flow (`RELIX_AGENT_TREASURY_SECRET`), unrelated to both CoralOS and founder escrow.
- All CoralOS seller agents are Relix's own built-in specialists — Relix does **not** claim remote, autonomous third-party agents.
- The `CORALOS_ESCROW_LINKED` / `CORALOS_ESCROW_FUNDED` / `CORALOS_ESCROW_RELEASED` / `CORALOS_SETTLEMENT_COMPLETE` timeline events are **Relix protocol records linked to the CoralOS session/thread ids** — not messages posted back to the Coral Server, which has already closed that session by the time escrow settles.

**Coordination modes (all gated, always fall through — the panel/timeline label which one ran):**

1. **Hosted CoralOS** — set `CORAL_MARKET_URL` + `RELIX_MARKET_TOKEN`; the app calls a long-running backend (Docker container: Coral Server + agents + wrapper) that runs the round and returns bids + proof over HTTP. This is the only mode that works on Vercel. Panel: *"Hosted CoralOS backend active."* See [Hosted CoralOS Backend](#hosted-coralos-backend).
2. **Local CoralOS** — set `RELIX_CORALOS_ENABLED=1` + `CORAL_API_KEY` on a Java-capable host; the local Coral Server runs the round via the filesystem-shared agent processes. Panel: *"CoralOS path active — local runtime."*
3. **Local fallback** — nothing configured, or a higher mode fails/times out (25s budget for the hosted call); Relix bids in-process instead. Panel: *"Local fallback active — CoralOS was not used for this run."* Escrow settlement is real in every mode; only the coordination layer differs.

**Local vs. Vercel.** The local CoralOS path needs the JVM Coral Server plus the launched agent processes, so it only runs on a **Java-capable local/VM host**, not on Vercel's serverless runtime — Vercel either uses the hosted backend (if configured) or the local fallback.

### Running the CoralOS path locally

1. Install **Java 24+** (e.g. `brew install openjdk`) — required by the Coral Server.
2. Run `npm run coralos:build`, copy the Relix agent folders from `scripts/coralos/agents/` into `~/.coral/agents/`, and set `registry.localAgents` in the Coral Server config to scan those folders (see that folder's README and example config).
3. Set the CoralOS env vars (see [Environment Variables](#environment-variables)) and start the app. Verify a full market round with `npm run coralos:verify` — expect `ALL CHECKS PASSED` with all three seller bids.

**Full judge runbook:** see [docs/DEMO.md](docs/DEMO.md) for the complete local demo (start Coral Server, register agents, verify, run Relix, and confirm the Protocol Proof panel shows the CoralOS session/thread/bid ids next to the escrow account/vault/Explorer links).

## Delivery Readiness Check

After a specialist delivers, the **Growth Employee (buyer agent) runs a deterministic delivery readiness check** and records the verdict in the Market Activity timeline (`DELIVERY_READY_FOR_RELEASE`) and the Protocol Proof panel. This makes the autonomous side of the flow legible: the agents source, compete, award, deliver, **and verify** — the founder's Phantom signature is the final safety release gate.

- **It is advisory only.** The check **never moves money and never gates the founder's escrow release**. The founder can always release or refund; a failed check surfaces a warning, it does not disable anything. Escrow release stays a founder Phantom signature — full stop.
- **This is not a separate "Verifier Agent."** It is the buyer agent's own deterministic check (`app/lib/delivery-readiness.ts`, a pure function). The result shape is intentionally generic so a future CoralOS `relix-verifier` seller agent could fill the same object — but no such agent exists today, and the UI does not claim one.
- **What it checks:** the delivery came from the awarded specialist; escrow was funded before delivery was marked ready (a visible confirmation of the call-order invariant — delivery is only generated after the lock confirms); required deliverables exist; a launch post/thread exists; the campaign brief is present; the delivery links to the bid id (and, on a CoralOS run, the session/thread ids — a local-fallback run passes this with a note, it does not fail).
- **Agent-signed attestation.** The verdict is signed with the Relix agent key (`app/lib/delivery-attestation.ts`) — the same key family that signs reward/prize payouts, and deliberately **not** anything that can move founder escrow. By default the signature is produced **off-chain** (ed25519, no fee, no broadcast). Set `RELIX_ONCHAIN_ATTESTATION=1` to also broadcast a devnet **Memo** transaction (moves zero lamports) so the attestation gets a public Solana Explorer link, clearly separate from the escrow account. Signing is best-effort: if it fails, the readiness verdict still stands and nothing is blocked.
- **Autonomy ledger.** The Protocol Proof panel shows a live count of **autonomous agent actions vs. founder safety signatures** for the run, derived from the run's own events and on-chain escrow state — the honest framing of "the agents run the marketplace; the founder holds the release gate."

## Anchor Escrow Settlement

The escrow program (`programs/relix_escrow`, Rust/Anchor) is the only thing in Relix that moves real money, and it is signed entirely by the founder — never by an agent, and never by CoralOS.

- **Program id**: `8dBQUA3ja6Z82oZ5C4qEmTg5CJ3jRtvnMb48h4vL1jgK` (devnet), controlled via `NEXT_PUBLIC_RELIX_ESCROW_PROGRAM_ID`.
- **Instructions**: `initialize_escrow`, `release_escrow`, `refund_escrow` — all three require the founder's Phantom signature.
- **Vault**: a PDA derived from the seed `relix_vault` (see `programs/relix_escrow/src/constants.rs`) — funds sit in an account no private key controls.
- **Platform fee (treasury cut of every job)**: every job pays the Relix treasury a percentage of its own escrowed amount — there is no separate fee transaction or extra charge to the founder. The fee is set in basis points (`NEXT_PUBLIC_RELIX_PLATFORM_FEE_BPS`, default `1000` = 10%) and is computed **once**, from the full locked amount, inside `initialize_escrow` (`calculate_fee` in `programs/relix_escrow/src/instructions/initialize_escrow.rs`) — the result is stored on the escrow account itself (`fee_bps`, `treasury_fee_lamports`), so a job's fee is fixed the moment funds lock and is never affected by an env var changing later. The Anchor program enforces `MAX_FEE_BPS = 3000` (30%) on-chain regardless of what the client requests. On `release_escrow`, that stored `treasury_fee_lamports` amount is paid to the Relix treasury wallet in the exact same transaction that pays the specialist — one founder signature, one settlement, two recipients. If the job is refunded instead, no fee is ever taken: the full locked amount returns to the founder.
- **Flow**: `initialize_escrow` locks the agreed price (specialist amount + treasury fee) into the vault → (delivery happens off-chain) → the founder either calls `release_escrow` (splits the vault between the specialist owner wallet and the Relix treasury wallet in one transaction) or, after the deadline, `refund_escrow` (returns the full locked amount to the founder, fee included). `release_escrow` cannot run twice, and `refund_escrow` cannot run after a release (both enforced on-chain and covered by the Anchor test suite).
- **Native SOL only** for this hackathon MVP — one founder, one specialist, one treasury, no token/SPL escrow, one job per escrow account.

See [Escrow Setup (Devnet)](#escrow-setup-devnet) below for wallet setup, and [Testing & Verification](#testing--verification) for running the Anchor test suite.

### Escrow Setup (Devnet)

The escrow program is deployed on devnet already, so most local runs only need a treasury wallet. Four env vars control it:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_RELIX_ESCROW_PROGRAM_ID` | The deployed Anchor program id (`programs/relix_escrow`). Defaults to the devnet deployment used by this repo. |
| `NEXT_PUBLIC_RELIX_TREASURY_WALLET` | The Relix treasury's public key. Receives the platform fee on every `release_escrow`. Must be a real devnet address you control the key for if you want to move the fee elsewhere later — the UI only needs the public key. |
| `NEXT_PUBLIC_RELIX_PLATFORM_FEE_BPS` | Platform fee in basis points (1000 = 10%), capped at 3000 (30%) by the Anchor program. |
| `RELIX_AGENT_TREASURY_SECRET` | Unrelated to escrow — see [Agent-Signed On-Chain Payouts](#agent-signed-on-chain-payouts). Only funds capped devnet agent-signed reward-ladder/prize payouts from a separate agent treasury, never escrow. It is **not** founder escrow custody — founder escrow is controlled by the Anchor program and the founder's Phantom signature. |

If any of the three `NEXT_PUBLIC_RELIX_ESCROW_*`/`NEXT_PUBLIC_RELIX_TREASURY_WALLET` values are missing or invalid, `getRelixEscrowConfig()` (`app/lib/relix-escrow.ts`) returns a setup error and the UI shows it directly on the hire and release screens instead of silently falling back to a direct transfer.

#### Setting up devnet wallets

1. Install the Solana CLI, then generate keypairs for each role you need — at minimum a founder wallet (Phantom) and a treasury wallet:
   ```bash
   solana-keygen new --outfile treasury.json
   solana address -k treasury.json
   ```
2. Fund each devnet wallet with `solana airdrop 2 <address> --url devnet` or the [devnet faucet](https://faucet.solana.com/), or use the in-app `Get devnet SOL` button once Phantom is connected.
3. Set `NEXT_PUBLIC_RELIX_TREASURY_WALLET` to the treasury's public key.
4. Point Phantom at devnet and connect it as the founder wallet.

#### Keep wallets separate

For a clean, legible demo, use **four distinct devnet wallets**:

- **Founder wallet** — the Phantom wallet connected in the browser; signs `initialize_escrow`, `release_escrow`, `refund_escrow`.
- **Specialist owner wallet** — set per specialist in `metadata().ownerWallet` (`app/lib/specialist-agents.ts` or the publish form); receives the specialist payout on release.
- **Relix treasury wallet** — `NEXT_PUBLIC_RELIX_TREASURY_WALLET`; receives the platform fee on release.
- **Agent payout wallet** — the `RELIX_AGENT_TREASURY_SECRET` keypair; pays reward ladders and prize payouts, entirely separate from escrow.

The UI warns if a specialist's owner wallet matches the treasury wallet, since that collapses two of the three escrow legs into one address and makes the split harder to see on Explorer.

## Agent-Signed On-Chain Payouts

Layered on top of the marketplace and completely separate from founder escrow, two specialist capabilities settle **real, capped devnet transfers signed server-side by an agent-controlled treasury wallet — with no human approval per payout**. These are the parts of Relix where an *agent* (not the founder) moves money, and they are deliberately small, capped, and clearly badged "⛓ on-chain" in the UI so they're never confused with escrow.

- **Agent treasury** (`app/lib/agent-treasury.ts`): a devnet `Keypair` — provided via `RELIX_AGENT_TREASURY_SECRET` for a stable wallet, or auto-generated and persisted to the gitignored data dir on first use, with an automatic devnet airdrop top-up when the balance runs low.
- **Reward Ladders** (Referral Specialist, capability `reward-ladders`, `app/lib/reward-ladder.ts`): a 5-rung, capped ladder paying a referrer wallet for each confirmed invite — 0.01, 0.02, 0.03, 0.04, 0.05 SOL per rung, **0.15 SOL total cap**. The server refuses to pay past rung 5.
- **Prize Payouts** (Tournament Specialist, capability `prize-payouts`, `app/lib/prize-pool.ts`): a 3-place, capped prize pool — 1st 0.05 SOL, 2nd 0.03 SOL, 3rd 0.02 SOL, **0.10 SOL total cap**. The server refuses to pay past 3rd place.
- Every payout is a real devnet transfer with an Explorer link, enforced by `POST /api/agent/reward` and `POST /api/agent/prize` respectively — caps are checked server-side, not just in the UI.

## AI Agents

When `ANTHROPIC_API_KEY` is set, the marketplace runs on real Claude inference (server-side only):

- Each specialist is a real AI agent: it bids and delivers using **its own model** (`agent.model`) and **its own system prompt** (`agent.prompt`). The built-ins run **Claude Haiku 4.5** to keep cost low; published specialists choose from the lower-cost Claude model presets (`app/lib/specialist-models.ts`): Claude Haiku 4.5, Claude Sonnet 5, or Claude Sonnet 4.6.
- The Growth Employee is a real AI agent too: it reads every bid and **chooses** the specialist, then explains the hire, via **Claude Sonnet 5**.
- After payment, the Growth Employee **assesses the goal against analytics and remaining budget and plans the next campaign** (`POST /api/campaign/next`). One approval runs the next cycle with the evolved goal — an autonomy loop bounded by budget and founder sign-off.
- Deterministic scoring still decides budget/goal/fit ranking so selection stays auditable; Claude writes the bids, the delivery, and the buyer's reasoning.

The LLM calls live only in `app/lib/anthropic.ts` and `app/lib/campaign-ai.ts`, behind `app/api/campaign/*`. Every one has a deterministic fallback, so the app works with no key — including when CoralOS is coordinating the bidding, since each seller agent process runs the same bid logic either way.

## Specialist Marketplace

Specialists are independent seller agents. The Growth Employee is the buyer: it requests bids from every active specialist (in-process, or over CoralOS when available), awards the job to one, and the specialist owner is paid on Solana after the founder approves delivery. Every specialist implements one interface, defined in `app/lib/specialist-sdk.ts`:

```ts
interface SpecialistAgentAdapter {
  metadata(): SpecialistAgent;
  bid(request: JobRequest): Promise<Bid>;
  deliver(job: AwardedJob): Promise<Delivery>;
}
```

- `metadata()` returns the public business listing: name, avatar, description, owner, owner wallet, capabilities, base price, delivery days, model, version, and track record (jobs completed, SOL earned, rating, recent clients, monthly earnings). Clicking a specialist anywhere in the app opens this listing as an Agent Profile.
- `bid(request)` receives the founder goal, budget, deadline, GitHub signal, website read, and analytics summary, and returns a priced bid with deliverables, reasoning, and a stated risk.
- `deliver(job)` receives the awarded bid plus the original request and returns delivery sections grounded in that context.

### The three built-in specialists

| Specialist | Capabilities | Base price | Delivery |
| --- | --- | --- | --- |
| **Tournament Specialist** | `tournament-design`, `prize-payouts` ⛓, `launch-threads`, `urgency-copy`, `distribution-plan` | 0.75 SOL | ~5 days |
| **Referral Specialist** | `invite-loops`, `reward-ladders` ⛓, `distribution-plan`, `audience-research` | 0.42 SOL | ~3 days |
| **Community Launch Specialist** | `community-briefs`, `founder-replies`, `distribution-plan` | 0.35 SOL | ~4 days |

- **`distribution-plan`**: a concrete where-to-post plan — the founder's own channels, canonical launch venues matched to the product category, a search strategy for niche communities, and a 72-hour posting sequence. Advice only (Copy/Edit), never a postable asset.
- **`audience-research`**: identifies high-intent audience segments, candidate Reddit/X channels and search queries, likely objections with founder-ready replies, and a first-72-hours plan — deterministically derived from the founder's own repo/website/goal context, never invented traffic or "verified community" claims. Rendered as its own advice-only card in the delivery view (no Publish/Schedule), excluded from the AI rewrite pass in `campaign-ai.ts` so it can never be hallucinated into a fake-traction claim. Any specialist (built-in or published) with this capability gets it, not just Referral Specialist.

Example, matching `app/lib/specialist-agents.ts`:

```ts
export const tournamentSpecialist: SpecialistAgentAdapter = {
  metadata() {
    return tournamentAgent;
  },
  async bid(request) {
    return tournamentBid(request);
  },
  async deliver(job) {
    return tournamentDelivery(job.request);
  }
};
```

Registering an agent is one line: add the adapter to `specialistAdapters` in `app/lib/specialist-agents.ts`. The marketplace, bidding, selection, settlement, and reputation flows pick it up automatically. In local fallback and for published specialists that are not registered with CoralOS, adapters run in-process; when CoralOS is enabled (local or hosted), the Growth Employee and the three built-in specialists are launched as separate processes and coordinate over MCP.

### Publish Specialist (no code required)

Agent creators can also publish a specialist from the UI at `/publish`. The setup screen has a "Publish Specialist" panel — copy: "Publish an agent that can bid for paid growth work." The minimal form captures agent name, owner name, owner wallet, capabilities, base price in SOL, delivery days, model, version, and prompt. On submit, `POST /api/specialists` validates the fields, assigns a generated id, marks the agent `active`, and stores it in `data/published-specialists.json` (or Vercel KV/Upstash when configured). The client wraps the stored metadata in a generic adapter (`createGenericSpecialistAdapter`) so the new seller can bid, be selected, deliver, and earn immediately — no redeploy. Published specialists start with zero reputation and build it as they win and are rated, exactly like the built-ins. This is a hackathon demo, so there is no publisher auth yet. Browse all specialists (built-in and published) at `/marketplace` and `/marketplace/[slug]`.

Seller reputation (jobs completed, SOL earned, rating, last hired) is tracked in `app/lib/reputation-store.ts`. Payment settlement records a completed job for the winning seller, and the founder can rate each delivery 1–5. Selection weighs reputation lightly: a new seller with strong fit still wins.

## Integrations

### GitHub

GitHub OAuth reads a real repository: description, README, commits, releases, languages, and detectable stack (`app/lib/github-tool.ts`, `app/api/github/*`). Repository changes drive the employee's reasoning and launch assets directly.

### Website Analysis

The setup form accepts a product website URL. During the employee workflow, Relix calls `POST /api/website/analyse` server-side and reads:

- page title
- meta description
- `h1` / `h2` headings
- main visible text
- CTA language
- pricing, signup, and waitlist language

The route validates `http` and `https` URLs, times out slow requests, and returns a non-crashing fallback if the page cannot be read. The employee continues with repository context when website analysis fails.

### Google Analytics

Google Analytics is optional. When configured and connected, Relix lists GA4 properties and reads recent high-level metrics:

- users
- sessions
- pageviews
- top traffic sources
- top pages
- conversions when available
- engagement rate when available

The UI only shows connection state and property selection. Metrics are used in employee reasoning, not shown as a dashboard.

### X (Twitter)

1. Click `Connect X`.
2. Approve the OAuth request.
3. Relix shows `X @username`.
4. Run the employee flow.
5. Review the launch posts.
6. Edit text if needed.
7. Choose `Save drafts`, `Approve schedule`, or `Approve and publish now`.
8. Published posts show the X post URL.

**Scheduled publishing runs server-side, with no browser required.** `app/api/cron/publish-x` is a real Vercel Cron job (configured in `vercel.json`) that finds every founder's due (`status: "scheduled"`, `scheduledFor <= now`) posts and publishes them directly — the founder's tab does not need to be open. It is idempotent: each due post is atomically claimed (`scheduled` → `publishing`) before it's sent to X, so a retried or overlapping cron tick cannot publish the same post twice. Failures requeue automatically up to `MAX_ATTEMPTS = 3` (with `attempts`/`lastAttemptAt`/`errorMessage` recorded on the post), then the post is marked terminally `failed` with a retry action in the UI. Because the cron runs with no request/cookie context, both the scheduled posts and the encrypted X OAuth tokens needed to publish them are persisted through the same Vercel KV / Upstash adapter as published specialists (`app/lib/kv-json-store.ts`) — not the ephemeral local-JSON/`/tmp` fallback — so a cold serverless instance can still find and publish them.

- **Auth**: the route requires `CRON_SECRET` — Vercel sends it as `Authorization: Bearer <CRON_SECRET>` when the env var is set; the same secret also works as a `?secret=` query param so you can trigger it manually (e.g. right before recording a demo) instead of waiting for the schedule.
- **Dry run**: `GET /api/cron/publish-x?secret=<CRON_SECRET>&dryRun=1` reports what would publish without posting anything.
- **Cadence honesty**: Vercel's **Hobby** plan only allows cron jobs to run **once per day** (`vercel.json` uses `0 9 * * *`); a more frequent schedule fails deployment outright on that plan. The UI says so plainly: *"Relix checks for due posts automatically about once a day... for anything time-sensitive, use Publish now."* Vercel Pro allows once-per-minute cron if tighter timing is needed later.
- The older opportunistic path still exists as a bonus, not a replacement: `/api/x/posts?publishDue=true` also publishes any due posts for the currently-signed-in founder, and the UI calls it when the tab happens to be open — but the cron job above is what makes "Schedule" true even when nobody is watching.

X access tokens are refreshed with `offline.access` (`app/api/x/refresh-token`) and encrypted before storage (`app/lib/crypto.ts`).

**X 401 or missing write access:** if publishing returns `401` or Relix says X did not grant `tweet.write`, open the X Developer Portal app settings and confirm App permissions are `Read and write`, OAuth 2.0 is enabled for a Web App / confidential client, the callback URL is exactly `https://your-domain/api/x/callback`, and the requested scopes include `tweet.read users.read tweet.write offline.access`. After changing X permissions, disconnect X in Relix and connect it again — existing tokens do not gain new scopes automatically.

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Makes the specialists and the Growth Employee real AI agents. Without it,
# Relix falls back to deterministic bidding, selection, and delivery.
ANTHROPIC_API_KEY=your_anthropic_api_key

GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret

GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

X_CLIENT_ID=your_x_oauth_2_client_id
X_CLIENT_SECRET=your_x_oauth_2_client_secret
X_REDIRECT_URI=http://localhost:3000/api/x/callback

# Authorizes the server-side scheduled X publisher (app/api/cron/publish-x).
# Vercel sends this as "Authorization: Bearer <value>" when calling the cron
# job (see vercel.json); the same value also works as a "?secret=" query
# param so you can trigger a publish run manually to test before recording.
CRON_SECRET=replace_with_a_long_random_secret

RELIX_TOKEN_ENCRYPTION_KEY=replace_with_a_long_random_secret

NEXT_PUBLIC_RELIX_ESCROW_PROGRAM_ID=8dBQUA3ja6Z82oZ5C4qEmTg5CJ3jRtvnMb48h4vL1jgK
NEXT_PUBLIC_RELIX_TREASURY_WALLET=your_devnet_treasury_public_key
NEXT_PUBLIC_RELIX_PLATFORM_FEE_BPS=1000

# Optional. Base64 of a funded devnet keypair secret key that acts as the agent
# treasury — the wallet the Growth Employee signs reward-ladder/prize payouts
# from, server-side, with no human approval. If unset, Relix generates one on
# first use, persists it to the gitignored data dir, and airdrops devnet SOL.
RELIX_AGENT_TREASURY_SECRET=optional_base64_devnet_secret_key

# Optional. When "1", the Growth Employee's delivery readiness attestation is
# also broadcast as a devnet Memo transaction (moves zero lamports) so it has a
# public Explorer link. Default (unset) signs the attestation off-chain only.
# Never touches escrow. See "Delivery Readiness Check".
RELIX_ONCHAIN_ATTESTATION=0

# CoralOS market coordination — LOCAL runtime path (see "CoralOS Market
# Coordination"). When RELIX_CORALOS_ENABLED=1 and a local Coral Server is
# reachable, CoralOS is the coordination path; otherwise Relix falls through.
# Never usable on Vercel (no JVM there) — use the hosted vars below instead.
RELIX_CORALOS_ENABLED=1
CORAL_SERVER_URL=http://localhost:5555
CORAL_API_KEY=the_auth_key_set_in_your_local_coral_server_config
CORAL_NAMESPACE=relix

# CoralOS market coordination — HOSTED backend path (works on Vercel). Set both
# to call a deployed backend (see "Hosted CoralOS Backend"); leave unset to
# skip straight to the local runtime or local fallback.
CORAL_MARKET_URL=https://your-backend-host/market
RELIX_MARKET_TOKEN=the_bearer_token_your_backend_expects

# Optional but recommended on Vercel. Without this, published marketplace
# specialists fall back to local JSON files and may disappear on serverless
# refreshes or redeploys.
KV_REST_API_URL=your_vercel_kv_or_upstash_rest_url
KV_REST_API_TOKEN=your_vercel_kv_or_upstash_rest_token
RELIX_KV_PREFIX=relix
```

Generate a local encryption key:

```bash
openssl rand -base64 32
```

Or a strong ASCII CoralOS token:

```bash
openssl rand -hex 32
```

Do not commit `.env.local`.

A few environment variables are **injected automatically** and are not something you set by hand: `VERCEL` (set by Vercel's platform, used to skip the local CoralOS path there), `PORT` (set by Railway/Render/Fly for the hosted backend, or by your own shell), and `CORAL_AGENT_ID` / `CORAL_CONNECTION_URL` / `CORAL_SESSION_ID` (injected by the Coral Server into each launched agent process). `RELIX_DATA_DIR` is optional and only needed to override where local JSON/CoralOS job-result files are written (defaults to `data/` locally, `/tmp/relix-data` on Vercel).

## OAuth Callback URLs

GitHub OAuth callback:

```text
http://localhost:3000/api/github/callback
```

Google OAuth callback:

```text
http://localhost:3000/api/google/callback
```

For Google, create an OAuth client and enable both APIs in the same Google Cloud project as that OAuth client:

- Google Analytics Admin API
- Google Analytics Data API

```text
https://www.googleapis.com/auth/analytics.readonly
```

OAuth can succeed even when the Data API is disabled. If Relix says Analytics is connected but cannot return metrics, confirm that the Google Analytics Data API is enabled for the OAuth project and that the connected Google account has Viewer access to the GA4 property.

X Developer Portal callback:

```text
http://localhost:3000/api/x/callback
```

For X, enable OAuth 2.0 and use a Web App / confidential client. Relix requests the minimum scopes needed for this flow:

```text
tweet.read users.read tweet.write offline.access
```

## Hosted CoralOS Backend

CoralOS can also run on a long-running backend (Docker) so a Vercel deploy can use it instead of the local fallback. This is entirely **optional and fully gated**: unset `CORAL_MARKET_URL`/`RELIX_MARKET_TOKEN` and Vercel behaves exactly as it always has (local fallback); set them and Vercel calls the hosted backend first, with automatic fallback on any failure or timeout.

- **What runs in the container**: Coral Server (JVM) + the Relix buyer/seller agent bundle + the agent registry (container-absolute paths, `docker/coral-agents/`) + a shared `/data` directory + a small Node HTTP wrapper (`scripts/coralos/server.ts`) exposing `GET /health` and `POST /market`.
- **Build**: `npm run coralos:docker:build` (or `docker build -t relix-coralos .`) — multi-stage: `node:22-bookworm` bundles the agent/wrapper with esbuild, `eclipse-temurin:24-jre` runs the JVM + wrapper, with Node 20 installed via nodesource for the launched agent processes.
- **Test locally**: `npm run coralos:docker:test` — builds, runs, waits for `/health`, then POSTs a sample job and asserts all 3 seller bids come back.
- **Deploy**: Railway (or Render/Fly) deploy-from-repo using the root `Dockerfile`; set `CORAL_API_KEY` and `RELIX_MARKET_TOKEN` (ASCII only — non-ASCII characters can be mangled by HTTP header transport) as service env vars, a `/health` healthcheck path, and ~1 GB RAM.
- **Wire it up**: set `CORAL_MARKET_URL=https://<backend>/market` and `RELIX_MARKET_TOKEN=<same secret>` on Vercel and redeploy. The Protocol Proof panel then reads *"Hosted CoralOS backend active."*

Full runbook, env var reference, and a Railway deployment checklist: [docs/HOSTED_CORALOS.md](docs/HOSTED_CORALOS.md).

## Local Data & Persistence

Local development writes JSON files to `data/`. Vercel writes fallback JSON files to `/tmp/relix-data` because the deployed app bundle is read-only.

Published specialists, connected X accounts (`x-accounts.json`), and scheduled X posts (`x-posts.json`) all use the same Vercel KV / Upstash Redis REST adapter (`app/lib/kv-json-store.ts`) when these environment variables are present:

```bash
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

This keeps `/publish`, `/marketplace`, and the connected X account/scheduled posts durable across refreshes, serverless function instances, and redeploys — which matters most for the [server-side scheduled publisher](#x-twitter) (`app/api/cron/publish-x`), since a cron invocation has no browser/cookie context and must be able to find the founder's account and due posts on its own. The same code also accepts Upstash's native variable names:

```bash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Without KV configured, all three fall back to local JSON files (`data/` locally, `/tmp/relix-data` on Vercel) — fine for the app's own UI, but the cron publisher then only reliably works within a single warm serverless instance, not across cold starts. Configure KV before relying on scheduled publishing in production.

OAuth is not required for specialist publishing in the hackathon build. Publishing is intentionally open and lightweight. Add auth later when you need owner accounts, edit/delete permissions, private agents, or paid marketplace onboarding.

On Vercel, the encrypted connected X account is also stored in chunked HTTP-only cookies as an additional fallback for the founder's own browser session. This keeps OAuth state available across serverless cold starts for scheduling and publishing from the UI. The raw X tokens are never exposed to client JavaScript, and are never included in the proof receipt, logs, or any API response.

These paths are ignored by git (see `.gitignore`):

- `data/x-accounts.json`
- `data/x-posts.json`
- `data/activity-log.json`
- `data/campaign-memory.json`
- `data/scheduled-posts.json`
- `data/specialist-reputation.json`
- `data/published-specialists.json`
- `data/reward-ladder.json`
- `data/prize-pool.json`
- `data/market-events.json`
- `data/agent-treasury.json`
- `data/coralos/` (job/result files exchanged with the local Coral Server)

The Vercel `/tmp` directory is writable but ephemeral. It prevents serverless file-write crashes, but it is not durable storage. For production campaign memory, post history, and team accounts, replace the remaining JSON stores with Vercel KV, Postgres, Supabase, or another database.

`XAccount` stores: `userId`, `xUserId`, `username`, encrypted `accessToken`, encrypted `refreshToken`, `tokenExpiry`, `scopes`, `connectedAt`.

`ScheduledXPost` stores: `userId`, `xAccountId`, `text`, `status` (`draft` / `scheduled` / `publishing` / `published` / `failed` / `cancelled`), `scheduledFor`, `publishedAt`, `xPostId`, `xPostUrl`, `errorMessage`, `attempts`, `lastAttemptAt`, `createdAt`, `updatedAt`. `attempts`/`lastAttemptAt` are written only by the cron publisher (see [X (Twitter)](#x-twitter)) — manual "Publish now"/"Retry" clicks never read or increment them, so founder-initiated publishing stays unlimited.

## API Routes

**Campaign / marketplace**
- `POST /api/campaign/plan` — builds job context, collects bids (CoralOS-hosted → CoralOS-local → local fallback), runs selection.
- `POST /api/campaign/deliver` — generates the awarded specialist's delivery.
- `POST /api/campaign/next` — plans the next campaign cycle after payment.
- `GET /api/specialists` / `POST /api/specialists` — list / publish specialists.
- `GET /api/reputation/list`, `POST /api/reputation/complete`, `POST /api/reputation/rate` — seller reputation.
- `GET /api/market-events` / `POST /api/market-events` — read/append the Market Activity timeline.

**On-chain agent payouts**
- `POST /api/agent/reward` — pays the next reward-ladder rung (Referral Specialist, capped, agent-signed).
- `POST /api/agent/prize` — pays the next prize tier (Tournament Specialist, capped, agent-signed).

**GitHub**
- `GET /api/github/login`, `GET /api/github/callback`, `GET /api/github/status`, `GET /api/github/repos`, `GET /api/github/context`.

**Google Analytics**
- `GET /api/google/login`, `GET /api/google/callback`, `GET /api/google/properties`, `GET /api/google/metrics`.

**X (Twitter)**
- `GET /api/x/connect`, `GET /api/x/callback`, `GET /api/x/status`, `POST /api/x/disconnect`, `POST /api/x/post`, `POST /api/x/schedule`, `GET /api/x/posts`, `POST /api/x/refresh-token`.
- `GET /api/cron/publish-x` — server-side scheduled publisher (see [X (Twitter)](#x-twitter)); `?dryRun=1` previews without posting, `?secret=<CRON_SECRET>` authorizes a manual run.

**Website analysis**
- `POST /api/website/analyse`.

**Misc**
- `GET /api/memory/list` / `POST /api/memory/record` — cross-campaign memory.
- `GET /api/activity/list` / `POST /api/activity/log` — founder-visible work log.
- `GET /api/posts/list` / `POST /api/posts/schedule` — post history/scheduling helpers.

## npm Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server. |
| `npm run build` | Production build (`next build`) — also what Vercel runs. |
| `npm run start` | Run a production build locally. |
| `npm run lint` | ESLint over the whole project. |
| `npm run anchor:build` | `anchor build` + regenerate the TypeScript IDL client. |
| `npm run anchor:test` | `anchor test` (see [Testing & Verification](#testing--verification) for the exact working invocation). |
| `npm run anchor:deploy:devnet` | Deploy the Anchor program to devnet. |
| `npm run coralos:build` | Bundle the CoralOS agent program to `scripts/coralos/dist/agent.mjs`. |
| `npm run coralos:server:build` | Bundle the hosted-backend wrapper to `scripts/coralos/dist/coralos-server.mjs`. |
| `npm run coralos:server` | Build + run the hosted-backend wrapper locally (needs a local Coral Server). |
| `npm run coralos:verify` | Build the agent, then run the formal CoralOS market smoke test (`scripts/coralos/test-coralos-market.ts`) — expects all 3 seller bids. |
| `npm run coralos:docker:build` | Build the hosted-backend Docker image. |
| `npm run coralos:docker:test` | Build, run, health-check, and POST `/market` against the Docker image end to end. |

## Testing & Verification

**Full stack (always run before committing/pushing):**
```bash
npm run lint
npx tsc --noEmit
npm run build
```

**Anchor escrow program.** Anchor 1.x runs `anchor test` against Surfpool by default. Install the local Solana toolchain, Anchor CLI, and Surfpool CLI before running escrow tests:

```bash
curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash
curl -sL https://run.surfpool.run/ | bash
```

Restart the terminal, or ensure `~/.local/bin` and the active Solana release bin are on `PATH`, then run:

```bash
NO_DNA=1 anchor test
```

This runs the Mocha suite in `tests/relix_escrow.ts` (its own `tsconfig.anchor.json`, independent of the app's tsconfig) and covers: initialize creates escrow + funds the vault, non-founder cannot release, release splits correctly between specialist and treasury, release cannot happen twice, refund fails before the deadline, refund works after the deadline, refund cannot happen after release.

**CoralOS coordination.**
```bash
RELIX_CORALOS_ENABLED=1 CORAL_API_KEY=<key> CORAL_SERVER_URL=http://localhost:5555 npm run coralos:verify
```
Expects `ALL CHECKS PASSED`: runtime connected, buyer agent ok, and all three seller bids (tournament/referral/community) collected over the real Coral market protocol, plus a simulated award + escrow-link (no real escrow touched).

**Hosted CoralOS backend.**
```bash
npm run coralos:docker:build
npm run coralos:docker:test
```

**Manual UI checks** (need a browser + Phantom + devnet SOL) — see [Demo Checklist](#demo-checklist) below, and the fuller runbooks in [docs/DEMO.md](docs/DEMO.md) / [docs/HOSTED_CORALOS.md](docs/HOSTED_CORALOS.md).

**Connect X:**
1. Add the env vars above. 2. Restart `npm run dev`. 3. Open `http://localhost:3000`. 4. Click `Connect X`. 5. Confirm the UI shows `X @username`.

**Website and Analytics:**
1. Enter a product website URL in setup. 2. Connect Google Analytics if credentials are configured. 3. Select a GA4 property when available. 4. Hire the employee. 5. Confirm the work log includes website reading, analytics reading, product/site comparison, and budget checking.

**Schedule:**
1. Connect wallet, GitHub, and X. 2. Select a repository. 3. Run `Hire Employee`. 4. Edit the X drafts. 5. Pick a schedule time. 6. Click `Approve schedule`. 7. Confirm records appear in post history with `Scheduled`.

**Publish:**
1. Click `Approve and publish now` on a draft, or `Retry` on a failed post. 2. Confirm the row moves through `Publishing`. 3. Confirm it finishes as `Published`. 4. Open the stored X URL. If publishing fails, Relix stores the error on the post and leaves it available for retry.

## Solana Devnet Flow

Devnet is hardcoded in `app/providers.tsx` with `clusterApiUrl("devnet")`. Mainnet is not used.

1. Connect Phantom on devnet.
2. Use `Get devnet SOL` or the Solana faucet if the balance is low.
3. Hire the employee.
4. Choose a specialist — this is a bid preview only, no escrow yet.
5. Click `Hire Specialist & Lock Funds` and sign `initialize_escrow` in Phantom. Relix shows the escrow account, vault PDA, signature, and a Solana Explorer link once it confirms.
6. Only now does the specialist's real delivery get generated and shown — the earlier bid preview is not reused as "delivered" work.
7. Review the delivery, then click `Release Escrow` and sign `release_escrow` in Phantom. This splits the vault between the specialist owner wallet and the Relix treasury wallet in one transaction. Relix shows both amounts, the signature, and an Explorer link.
8. If the founder never releases, `Refund Escrow` (sign `refund_escrow`) becomes available after the deadline and returns the full locked amount to the founder.

## Demo Checklist

A judge can follow the whole founder-to-specialist settlement path from the UI alone:

1. Connect Phantom founder wallet.
2. Choose repo and goal.
3. Watch seller agents bid (Market Activity timeline) — confirm the Protocol Proof panel states which coordination mode ran (hosted CoralOS / local CoralOS / local fallback).
4. Choose specialist — proposed deliverables shown as a preview, before any escrow exists.
5. Lock funds in escrow — click `Hire Specialist & Lock Funds`, sign `initialize_escrow`, see the escrow account, vault, signature, and Explorer link.
6. Specialist delivers assets — generated only after the escrow lock confirms, labeled "Delivered after escrow funding."
7. Release escrow — click `Release Escrow`, sign `release_escrow`.
8. Show Explorer link for the release transaction.
9. Show specialist payout and Relix treasury fee in the settlement summary card and Protocol Proof panel.
10. Show campaign active, with the full timeline (`FOUNDER_SELECTED_SPECIALIST` → `ESCROW_CREATED` → `FUNDS_LOCKED` → `SPECIALIST_DELIVERY_RECEIVED` → `DELIVERY_READY_FOR_RELEASE` → `ESCROW_RELEASED` → `SPECIALIST_PAID` → `TREASURY_FEE_PAID` → `CAMPAIGN_ACTIVE`, plus the parallel `CORALOS_*` events when CoralOS coordinated the run) visible in Market Activity. `DELIVERY_READY_FOR_RELEASE` is the Growth Employee's advisory readiness check — it marks the delivery ready but does not release escrow.

## What The MVP Proves

- GitHub OAuth reads a real repository: description, README, commits, releases, languages, and detectable stack.
- Repository changes drive the employee reasoning and launch assets.
- Specialist bidding and selection happen inside the employee flow — optionally coordinated over the real CoralOS market protocol.
- Solana devnet escrow creates real lock, release/refund transactions, and Explorer links.
- X OAuth 2.0 + PKCE connects a real X account.
- X tokens are encrypted before local storage.
- Launch posts can be edited, saved as drafts, scheduled, published now, retried, or cancelled.
- Published posts store final text, publish time, X post ID, and URL.

## What Is Real

- Phantom wallet connection on Solana devnet.
- Devnet balance reads and optional devnet airdrop.
- Real Anchor escrow on devnet for founder settlement: lock SOL in a PDA vault, release to specialist plus Relix treasury, or refund after the deadline.
- A deterministic, agent-signed **delivery readiness check** run by the Growth Employee after delivery (advisory — it never releases escrow; the founder's Phantom signature does). Off-chain ed25519 signature by default; an optional devnet Memo attestation with an Explorer link when `RELIX_ONCHAIN_ATTESTATION=1`.
- A real CoralOS (Coral Server) runtime coordinating the buyer and three seller agents over MCP — locally (JVM) or via the optional hosted Docker backend — with real session/thread/bid ids surfaced in the Protocol Proof panel.
- Agent-signed on-chain capabilities: the Referral Specialist's `reward-ladders` and the Tournament Specialist's `prize-payouts` settle capped ladders/pools of real devnet transfers from an agent-controlled treasury wallet — signed server-side with no human approval — to the recipient wallet. Caps are enforced server-side and every payout has an Explorer link. These capabilities are badged "⛓ on-chain" across the app to distinguish them from content capabilities.
- GitHub OAuth and GitHub API repository reads.
- X OAuth 2.0 + PKCE.
- X access token refresh with `offline.access`.
- Publishing through `POST /2/tweets` after explicit approval.
- A real server-side scheduled publisher (`app/api/cron/publish-x`, driven by Vercel Cron per `vercel.json`) that publishes due X posts with no browser open, gated by `CRON_SECRET`, idempotent per post, and capped at 3 retry attempts before a post is marked terminally failed.
- Durable published specialist storage, and durable scheduled-post/X-account storage for the cron publisher above, when Vercel KV / Upstash Redis REST is configured.
- JSON-backed local records for X accounts, X posts, activity, memory, and internal state.
- Deterministic **audience research** (candidate Reddit/X channels, audience segments, objections, a 72-hour plan) for any specialist with the `audience-research` capability — grounded only in the founder's own repo/website/goal context, excluded from the AI rewrite pass so it can never be turned into an invented traction claim.

## What Is Simulated

- Without `ANTHROPIC_API_KEY`, specialist bidding, selection, and delivery fall back to deterministic local logic (this is true whether or not CoralOS is coordinating the round — CoralOS carries the same logic either way).
- Without CoralOS configured/reachable (local or hosted), buyer/seller coordination runs in-process instead of over the Coral market protocol — clearly labeled "Local fallback" in the UI, never silently claimed as CoralOS.
- Specialist recipient wallets are public demo recipient addresses.
- The three built-in specialists ship with illustrative sample listing data (jobs completed, SOL earned, ratings, recent clients). These are clearly labeled "Sample marketplace listing" in the Agent Profile and use invented client names — they are not real customers or real earnings. Published specialists start from zero and build real reputation as they win and are rated.
- The local JSON files are a hackathon database. The service layer is isolated so it can be replaced with Postgres, Prisma, or Supabase.

No real users, signups, creator contacts, or campaign results are claimed. Relix itself reports no traction; the only populated figures anywhere are the sample seller listings described above.

## Known Limitations & Roadmap

- **No dispute/arbitration path.** Disagreements currently resolve to either the founder releasing or a deadline-gated refund — there is no third-party arbitration or partial-release mechanism.
- **No reputation-weighted settlement.** A production version would tie staking, slashing, or graduated fee schedules to a specialist's track record; today reputation only lightly influences bid *selection*, not settlement terms.
- **Native SOL only** — the MVP uses native SOL for judged devnet escrow. SPL/USDC escrow support is a natural extension, **not currently implemented or claimed**; there is also no multi-specialist/multi-job escrow account today.
- **No publisher auth** on the specialist marketplace — publishing is intentionally open for the hackathon; a production version would add owner accounts and permissions.
- **Local JSON persistence by default** — durable only when Vercel KV/Upstash is configured; a production version would move all stores (not just published specialists) to a real database.
- **CoralOS's local runtime path is not Vercel-compatible** by design (it needs a long-running JVM + launched agent processes) — the hosted backend closes this gap, but is itself a single-container deployment without horizontal scaling or queuing for concurrent campaigns.

## Git Workflow

After any requested change to this repository, commit the change and push it to GitHub before ending the task. Keep commits focused, and never commit secrets, local data files, build output, or dependency folders. (See `AGENTS.md`.)
