# Relix Growth Employee

Relix lets a founder hire one AI Growth Employee.

The founder connects a wallet, GitHub, and X, types one growth goal, and hires Relix. The employee reads the selected GitHub repository, turns recent shipped work into launch posts, helps the founder lock specialist funds in Anchor escrow on Solana devnet, then lets the founder release escrow, schedule, or publish X posts through the connected X account.

Nothing is posted without explicit founder approval.

## For Judges

Relix uses a real Solana devnet escrow program for founder-to-specialist settlement. When a founder hires a specialist, funds are locked in an escrow vault (a PDA controlled by the Anchor program, not a wallet a human holds the key to). After delivery, the founder releases escrow. The program splits the locked payment between the specialist owner wallet and the Relix treasury wallet in that same transaction. If the specialist no-shows past the deadline, the founder can refund instead of releasing.

A few things worth knowing before you judge the demo:

- **Founder escrow settlement is a separate system from agent-signed reward/prize payouts.** The escrow program (`programs/relix_escrow`) only moves funds when the founder signs `initialize_escrow`, `release_escrow`, or `refund_escrow` through Phantom. Nothing in escrow is signed by an agent.
- **Reward ladders and prize payouts are signed by the Relix agent treasury**, a separate server-held devnet keypair (`RELIX_AGENT_TREASURY_SECRET`), with no human approval per payout — these are capped, on-chain, agent-signed bonuses layered on top of the marketplace, not part of founder settlement. They are badged "⛓ on-chain" in the UI to keep that distinction visible.
- **Escrow is native SOL only** for this hackathon MVP — one founder, one specialist, one treasury, no token escrow.
- **What a production version would add:** a dispute/arbitration path for contested deliveries, and reputation-weighted settlement (e.g. staking, slashing, or graduated fee schedules tied to a specialist's track record). None of that exists today — disagreements currently resolve to either release or a deadline-gated refund, decided solely by the founder.

## CoralOS Market Coordination

Relix uses **CoralOS as the primary coordination layer for the agent marketplace when it is available** — the real [Coral Server](https://github.com/Coral-Protocol/coral-server) runtime, not a mock or CoralOS-style naming over local code.

**CoralOS coordinates; Anchor settles.** The flow is **job/request → bid → award → escrow funded → delivery → release/refund**. CoralOS coordinates the buyer/seller agents and holds no keys and moves no money; the on-chain escrow is signed by the founder, and **founder approval (a Phantom signature) is the release gate**. The Protocol Proof panel and Market Activity timeline are Relix's run ledger for each campaign — the record of that chain, with the CoralOS session/thread/bid ids next to the escrow account, vault, and Explorer links.

- The **Growth Employee is registered as a CoralOS buyer agent** (`relix-buyer`). The three **built-in specialists are registered as CoralOS seller agents** (`relix-seller-tournament`, `relix-seller-referral`, `relix-seller-community`). Their definitions live in `~/.coral/agents/*/coral-agent.toml`; the shared agent program is `scripts/coralos/agent.ts` (bundled to `scripts/coralos/dist/agent.mjs`).
- For a launch, Relix's server (`app/lib/coralos/`) creates a Coral session, and the Coral Server **launches every agent process**. The buyer posts a launch job over the Coral market protocol; each seller connects back over MCP-SSE, computes its **real Relix bid** (the exact same specialist logic the app uses), and returns it; the buyer collects the bids. Relix feeds those CoralOS bids into its existing selection/scoring/delivery flow and awards one.
- The coordination is real MCP: `coral_create_thread`, `coral_send_message`, `coral_wait_for_agent`, etc. Every CoralOS run's real **session id, thread id, and bid ids** are shown in the **Protocol Proof panel** in the app, next to the escrow details.

**Division of responsibility (stated honestly):**

- **CoralOS coordinates the buyer/seller agent workflow** — job posting, bidding, and collection. It does **not** move money.
- **Anchor handles all settlement** — real Solana devnet escrow (lock → release/refund → specialist + treasury split). CoralOS does not handle settlement or payments.
- **Agent-signed reward/prize payouts** remain a separate flow (`RELIX_AGENT_TREASURY_SECRET`), unrelated to both CoralOS and founder escrow.
- All CoralOS seller agents are Relix's own built-in specialists — Relix does **not** claim remote, autonomous third-party agents.

**Coordination modes (all gated, always fall through — the panel/timeline label which one ran):**

1. **Hosted CoralOS** — set `CORAL_MARKET_URL` + `RELIX_MARKET_TOKEN`; Vercel calls a long-running backend that runs the round (see [docs/HOSTED_CORALOS.md](docs/HOSTED_CORALOS.md)). Panel: "Hosted CoralOS backend active."
2. **Local CoralOS** — set `RELIX_CORALOS_ENABLED=1` + `CORAL_API_KEY` on a Java-capable host; the local Coral Server runs the round. Panel: "CoralOS path active — local runtime."
3. **Local fallback** — nothing configured, or a higher mode fails/times out; Relix bids in-process. Panel: "Local fallback active — CoralOS was not used for this run." Escrow settlement is real in every mode.

**Local vs. Vercel.** The CoralOS path needs the JVM Coral Server plus the launched agent processes, so it runs on a **Java-capable local/VM host**, not on Vercel's serverless runtime. When CoralOS is unavailable (missing runtime/env, or running on Vercel), Relix falls back to **local in-process bidding**, and this is shown plainly: the Protocol Proof panel reads **"Coordination mode: Local fallback — CoralOS was not used for this run."** The fallback exists only for development/demo reliability; the bids, selection, and escrow settlement it produces are still real.

### Running the CoralOS path (local)

1. Install **Java 24+** (e.g. `brew install openjdk`) — required by the Coral Server.
2. Run `npm run coralos:build`, copy the Relix agent folders from `scripts/coralos/agents/` into `~/.coral/agents/`, and set `registry.localAgents` in the Coral Server config to scan those folders (see that folder's README and example config).
3. Set the CoralOS env vars (below) and start the app. Verify a full market round with `npm run coralos:verify`.

**Full judge runbook:** see [docs/DEMO.md](docs/DEMO.md) for the complete local demo (start Coral Server, register agents, verify, run Relix, and confirm the Protocol Proof panel shows the CoralOS session/thread/bid ids next to the escrow account/vault/Explorer links).

**Optional hosted backend:** CoralOS can also run on a long-running backend (Docker) so a Vercel deploy can use it instead of the local fallback — see [docs/HOSTED_CORALOS.md](docs/HOSTED_CORALOS.md). This is fully gated (`CORAL_MARKET_URL` + `RELIX_MARKET_TOKEN`): unset ⇒ local fallback; hosted failure ⇒ automatic fallback. The panel then reads "Hosted CoralOS backend active." Settlement stays on Anchor/Solana regardless.

## What The MVP Proves

- GitHub OAuth reads a real repository: description, README, commits, releases, languages, and detectable stack.
- Repository changes drive the employee reasoning and launch assets.
- Specialist bidding and selection happen inside the employee flow.
- Solana devnet escrow creates real lock, release/refund transactions, and Explorer links.
- X OAuth 2.0 + PKCE connects a real X account.
- X tokens are encrypted before local storage.
- Launch posts can be edited, saved as drafts, scheduled, published now, retried, or cancelled.
- Published posts store final text, publish time, X post ID, and URL.

## What Is Real

- Phantom wallet connection on Solana devnet.
- Devnet balance reads and optional devnet airdrop.
- Real Anchor escrow on devnet for founder settlement: lock SOL in a PDA vault, release to specialist plus Relix treasury, or refund after the deadline.
- Agent-signed on-chain capabilities: the Referral Specialist's `reward-ladders` and the Tournament Specialist's `prize-payouts` settle capped ladders/pools of real devnet transfers from an agent-controlled treasury wallet — signed server-side with no human approval — to the recipient wallet. Caps are enforced server-side and every payout has an Explorer link. These capabilities are badged "⛓ on-chain" across the app to distinguish them from content capabilities.
- GitHub OAuth and GitHub API repository reads.
- X OAuth 2.0 + PKCE.
- X access token refresh with `offline.access`.
- Publishing through `POST /2/tweets` after explicit approval.
- Durable published specialist storage when Vercel KV / Upstash Redis REST is configured.
- JSON-backed local records for X accounts, X posts, activity, memory, and internal state.

## AI Agents

When `ANTHROPIC_API_KEY` is set, the marketplace runs on real Claude inference (server-side only):

- Each specialist is a real AI agent: it bids and delivers using **its own model** (`agent.model`) and **its own system prompt** (`agent.prompt`). The built-ins run Claude Haiku 4.5 to keep cost low; published agents choose from the lower-cost Claude model presets.
- The Growth Employee is a real AI agent too: it reads every bid and **chooses** the specialist, then explains the hire, via Claude (Sonnet 5).
- After payment, the Growth Employee **assesses the goal against analytics and remaining budget and plans the next campaign** (`POST /api/campaign/next`). One approval runs the next cycle with the evolved goal — an autonomy loop bounded by budget and founder sign-off.
- Deterministic scoring still decides budget/goal/fit ranking so selection stays auditable; Claude writes the bids, the delivery, and the buyer's reasoning.

The LLM calls live only in `app/lib/anthropic.ts` and `app/lib/campaign-ai.ts`, behind `app/api/campaign/*`. Every one has a deterministic fallback, so the app works with no key.

## What Is Simulated

- Without `ANTHROPIC_API_KEY`, specialist bidding, selection, and delivery fall back to deterministic local logic.
- Specialist recipient wallets are public demo recipient addresses.
- The three built-in specialists ship with illustrative sample listing data (jobs completed, SOL earned, ratings, recent clients). These are clearly labeled "Sample marketplace listing" in the Agent Profile and use invented client names — they are not real customers or real earnings. Published specialists start from zero and build real reputation as they win and are rated.
- The local JSON files are a hackathon database. The service layer is isolated so it can be replaced with Postgres, Prisma, or Supabase.

No real users, signups, creator contacts, or campaign results are claimed. Relix itself reports no traction; the only populated figures anywhere are the sample seller listings described above.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Agent Workflow

After any requested change to this repository, commit the change and push it to GitHub before ending the task. Keep commits focused, and never commit secrets, local data files, build output, or dependency folders.

## Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Makes the specialists and the Growth Employee real AI agents. Without it,
# Relix falls back to deterministic bidding, selection, and delivery.
ANTHROPIC_API_KEY=your_anthropic_api_key

GITHUB_CLIENT_ID=Ov23li16wipKedVNy38w
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret

GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

X_CLIENT_ID=your_x_oauth_2_client_id
X_CLIENT_SECRET=your_x_oauth_2_client_secret
X_REDIRECT_URI=http://localhost:3000/api/x/callback

RELIX_TOKEN_ENCRYPTION_KEY=replace_with_a_long_random_secret

NEXT_PUBLIC_RELIX_ESCROW_PROGRAM_ID=8dBQUA3ja6Z82oZ5C4qEmTg5CJ3jRtvnMb48h4vL1jgK
NEXT_PUBLIC_RELIX_TREASURY_WALLET=your_devnet_treasury_public_key
NEXT_PUBLIC_RELIX_PLATFORM_FEE_BPS=1000

# Optional. Base64 of a funded devnet keypair secret key that acts as the agent
# treasury — the wallet the Growth Employee signs reward-ladder payouts from,
# server-side, with no human approval. If unset, Relix generates one on first
# use, persists it to the gitignored data dir, and airdrops devnet SOL to it.
RELIX_AGENT_TREASURY_SECRET=optional_base64_devnet_secret_key

# CoralOS market coordination (local demo path — see "CoralOS Market
# Coordination"). When RELIX_CORALOS_ENABLED=1 and a Coral Server is reachable,
# CoralOS is the primary buyer/seller coordination path; otherwise Relix uses
# the labeled local fallback. Never used on Vercel.
RELIX_CORALOS_ENABLED=1
CORAL_SERVER_URL=http://localhost:5555
CORAL_API_KEY=the_auth_key_set_in_your_coral_server_config
CORAL_NAMESPACE=relix

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

Do not commit `.env.local`.

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

## Website Analysis

The setup form accepts a product website URL. During the employee workflow, Relix calls `POST /api/website/analyse` server-side and reads:

- page title
- meta description
- `h1`
- `h2` headings
- main visible text
- CTA language
- pricing, signup, and waitlist language

The route validates `http` and `https` URLs, times out slow requests, and returns a non-crashing fallback if the page cannot be read. The employee continues with repository context when website analysis fails.

## Google Analytics

Google Analytics is optional. When configured and connected, Relix lists GA4 properties and reads recent high-level metrics:

- users
- sessions
- pageviews
- top traffic sources
- top pages
- conversions when available
- engagement rate when available

The UI only shows connection state and property selection. Metrics are used in employee reasoning, not shown as a dashboard.

## X Flow

1. Click `Connect X`.
2. Approve the OAuth request.
3. Relix shows `X @username`.
4. Run the employee flow.
5. Review the launch posts.
6. Edit text if needed.
7. Choose `Save drafts`, `Approve schedule`, or `Approve and publish now`.
8. Published posts show the X post URL.

Scheduled publishing is processed when `/api/x/posts?publishDue=true` is called. The UI polls this while scheduled posts exist. In production, call the same endpoint from a cron job.

### X 401 Or Missing Write Access

If publishing returns `401` or Relix says X did not grant `tweet.write`, open the X Developer Portal app settings and confirm:

- App permissions are set to `Read and write`.
- OAuth 2.0 is enabled for a Web App / confidential client.
- The callback URL is exactly `https://your-domain/api/x/callback`.
- The requested scopes include `tweet.read users.read tweet.write offline.access`.

After changing X permissions, disconnect X in Relix and connect it again. Existing tokens do not gain new scopes automatically.

## Escrow Setup (Devnet)

The escrow program is deployed on devnet already, so most local runs only need a treasury wallet. Four env vars control it:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_RELIX_ESCROW_PROGRAM_ID` | The deployed Anchor program id (`programs/relix_escrow`). Defaults to the devnet deployment used by this repo. |
| `NEXT_PUBLIC_RELIX_TREASURY_WALLET` | The Relix treasury's public key. Receives the platform fee on every `release_escrow`. Must be a real devnet address you control the key for if you want to move the fee elsewhere later — the UI only needs the public key. |
| `NEXT_PUBLIC_RELIX_PLATFORM_FEE_BPS` | Platform fee in basis points (1000 = 10%), capped at 3000 (30%) by the Anchor program. |
| `RELIX_AGENT_TREASURY_SECRET` | Unrelated to escrow — see [For Judges](#for-judges). Only funds agent-signed reward-ladder/prize payouts, never escrow. |

If any of the three `NEXT_PUBLIC_RELIX_ESCROW_*`/`NEXT_PUBLIC_RELIX_TREASURY_WALLET` values are missing or invalid, `getRelixEscrowConfig()` (`app/lib/relix-escrow.ts`) returns a setup error and the UI shows it directly on the hire and release screens instead of silently falling back to a direct transfer.

### Setting up devnet wallets

1. Install the Solana CLI, then generate keypairs for each role you need — at minimum a founder wallet (Phantom) and a treasury wallet:
   ```bash
   solana-keygen new --outfile treasury.json
   solana address -k treasury.json
   ```
2. Fund each devnet wallet with `solana airdrop 2 <address> --url devnet` or the [devnet faucet](https://faucet.solana.com/), or use the in-app `Get devnet SOL` button once Phantom is connected.
3. Set `NEXT_PUBLIC_RELIX_TREASURY_WALLET` to the treasury's public key.
4. Point Phantom at devnet and connect it as the founder wallet.

### Keep wallets separate

For a clean, legible demo, use **four distinct devnet wallets**:

- **Founder wallet** — the Phantom wallet connected in the browser; signs `initialize_escrow`, `release_escrow`, `refund_escrow`.
- **Specialist owner wallet** — set per specialist in `metadata().ownerWallet` (`app/lib/specialist-agents.ts` or the publish form); receives the specialist payout on release.
- **Relix treasury wallet** — `NEXT_PUBLIC_RELIX_TREASURY_WALLET`; receives the platform fee on release.
- **Agent payout wallet** — the `RELIX_AGENT_TREASURY_SECRET` keypair; pays reward ladders and prize payouts, entirely separate from escrow.

The UI warns if a specialist's owner wallet matches the treasury wallet, since that collapses two of the three escrow legs into one address and makes the split harder to see on Explorer.

### Testing the Anchor escrow locally

Anchor 1.x runs `anchor test` against Surfpool by default. Install the local Solana toolchain, Anchor CLI, and Surfpool CLI before running escrow tests:

```bash
curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash
curl -sL https://run.surfpool.run/ | bash
```

Restart the terminal, or ensure `~/.local/bin` and the active Solana release bin are on `PATH`, then run:

```bash
NO_DNA=1 anchor test
```

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
3. Watch seller agents bid (Market Activity timeline).
4. Choose specialist — proposed deliverables shown as a preview, before any escrow exists.
5. Lock funds in escrow — click `Hire Specialist & Lock Funds`, sign `initialize_escrow`, see the escrow account, vault, signature, and Explorer link.
6. Specialist delivers assets — generated only after the escrow lock confirms, labeled "Delivered after escrow funding."
7. Release escrow — click `Release Escrow`, sign `release_escrow`.
8. Show Explorer link for the release transaction.
9. Show specialist payout and Relix treasury fee in the settlement summary card.
10. Show campaign active, with the full timeline (`FOUNDER_SELECTED_SPECIALIST` → `ESCROW_CREATED` → `FUNDS_LOCKED` → `SPECIALIST_DELIVERY_RECEIVED` → `ESCROW_RELEASED` → `SPECIALIST_PAID` → `TREASURY_FEE_PAID` → `CAMPAIGN_ACTIVE`) visible in Market Activity.

## Local Data

Local development writes JSON files to `data/`. Vercel writes fallback JSON files to `/tmp/relix-data` because the deployed app bundle is read-only.

Published specialists use Vercel KV / Upstash Redis REST when these environment variables are present:

```bash
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

This keeps `/publish` and `/marketplace` durable across refreshes, serverless function instances, and redeploys. The same code also accepts Upstash's native variable names:

```bash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

OAuth is not required for specialist publishing in the hackathon build. Publishing is intentionally open and lightweight. Add auth later when you need owner accounts, edit/delete permissions, private agents, or paid marketplace onboarding.

On Vercel, the encrypted connected X account is also stored in chunked HTTP-only cookies. This keeps OAuth state available across serverless cold starts for scheduling and publishing. The raw X tokens are never exposed to client JavaScript.

These files are ignored by git:

- `data/x-accounts.json`
- `data/x-posts.json`
- `data/activity-log.json`
- `data/campaign-memory.json`
- `data/scheduled-posts.json`
- `data/specialist-reputation.json`
- `data/published-specialists.json`

The Vercel `/tmp` directory is writable but ephemeral. It prevents serverless file-write crashes, but it is not durable storage. For production campaign memory, post history, and team accounts, replace the remaining JSON stores with Vercel KV, Postgres, Supabase, or another database.

`XAccount` stores:

- `userId`
- `xUserId`
- `username`
- encrypted `accessToken`
- encrypted `refreshToken`
- `tokenExpiry`
- `scopes`
- `connectedAt`

`ScheduledXPost` stores:

- `userId`
- `xAccountId`
- `text`
- `status`: `draft`, `scheduled`, `publishing`, `published`, or `failed`
- `scheduledFor`
- `publishedAt`
- `xPostId`
- `xPostUrl`
- `errorMessage`
- `createdAt`
- `updatedAt`

## Building a Specialist Agent

Specialists are independent seller agents. The Growth Employee is the buyer: it requests bids from every active specialist, awards the job to one, and the specialist owner is paid on Solana after the founder approves delivery. Every specialist implements one interface, defined in `app/lib/specialist-sdk.ts`:

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

Registering an agent is one line: add the adapter to `specialistAdapters` in `app/lib/specialist-agents.ts`. The marketplace, bidding, selection, settlement, and reputation flows pick it up automatically. In local fallback and for published specialists that are not registered with CoralOS, adapters run in-process; when CoralOS is enabled locally, the Growth Employee and the three built-in specialists are launched by Coral Server and coordinate over MCP.

### Publish Specialist (no code required)

Agent creators can also publish a specialist from the UI. The setup screen has a "Publish Specialist" panel — copy: "Publish an agent that can bid for paid growth work." The minimal form captures agent name, owner name, owner wallet, capabilities, base price in SOL, delivery days, model, version, and prompt. On submit, `POST /api/specialists` validates the fields, assigns a generated id, marks the agent `active`, and stores it in `data/published-specialists.json`. The client wraps the stored metadata in a generic adapter (`createGenericSpecialistAdapter`) so the new seller can bid, be selected, deliver, and earn immediately — no redeploy. Published specialists start with zero reputation and build it as they win and are rated, exactly like the built-ins. This is a hackathon demo, so there is no publisher auth yet.

Seller reputation (jobs completed, SOL earned, rating, last hired) is tracked in `app/lib/reputation-store.ts`. Payment settlement records a completed job for the winning seller, and the founder can rate each delivery 1-5. Selection weighs reputation lightly: a new seller with strong fit still wins.

## API Routes

- `POST /api/website/analyse`
- `GET /api/google/login`
- `GET /api/google/callback`
- `GET /api/google/properties`
- `GET /api/google/metrics`
- `GET /api/x/connect`
- `GET /api/x/callback`
- `GET /api/x/status`
- `POST /api/x/disconnect`
- `POST /api/x/post`
- `POST /api/x/schedule`
- `GET /api/x/posts`
- `POST /api/x/refresh-token`
- `GET /api/reputation/list`
- `POST /api/reputation/complete`
- `POST /api/reputation/rate`
- `POST /api/campaign/plan`
- `POST /api/campaign/deliver`
- `POST /api/campaign/next`
- `GET /api/specialists`
- `POST /api/specialists`

## Architecture

- UI: `app/page.tsx`
- Wallet Service: `app/lib/wallet.ts` and `app/providers.tsx`
- GitHub Service: `app/lib/github-tool.ts` and `app/api/github/*`
- Website Analysis Service: `app/lib/website-analysis.ts` and `app/api/website/analyse`
- Google Analytics Service: `app/lib/google-analytics.ts` and `app/api/google/*`
- Repository Analysis Service: `app/lib/repository-analysis.ts`
- Employee Engine: `app/lib/growth-employee.ts`
- Specialist Marketplace: `app/lib/specialist-agents.ts` and `app/lib/campaign.ts`
- Specialist SDK: `app/lib/specialist-sdk.ts`
- Published Specialist Store: `app/lib/specialist-store.ts` and `app/api/specialists`
- Reputation Service: `app/lib/reputation-store.ts` and `app/api/reputation/*`
- Settlement Service: Solana transfer flow in `app/page.tsx` plus wallet helpers
- Campaign Generator: `app/lib/campaign-assets.ts`
- X Service: `app/lib/x-api.ts`, `app/lib/x-store.ts`, `app/lib/x-types.ts`, and `app/api/x/*`
- Session Helper: `app/lib/session.ts`
- Token Encryption: `app/lib/crypto.ts`
- Memory Service: `app/lib/memory-store.ts` and `app/api/memory/*`
- Activity Log: `app/lib/activity-store.ts` and `app/api/activity/*`

## Testing

Connect:

1. Add the env vars above.
2. Restart `npm run dev`.
3. Open `http://localhost:3000`.
4. Click `Connect X`.
5. Confirm the UI shows `X @username`.

Website and Analytics:

1. Enter a product website URL in setup.
2. Connect Google Analytics if credentials are configured.
3. Select a GA4 property when available.
4. Hire the employee.
5. Confirm the work log includes website reading, analytics reading, product/site comparison, and budget checking.

Schedule:

1. Connect wallet, GitHub, and X.
2. Select a repository.
3. Run `Hire Employee`.
4. Edit the X drafts.
5. Pick a schedule time.
6. Click `Approve schedule`.
7. Confirm records appear in post history with `Scheduled`.

Publish:

1. Click `Approve and publish now` on a draft, or `Retry` on a failed post.
2. Confirm the row moves through `Publishing`.
3. Confirm it finishes as `Published`.
4. Open the stored X URL.

If publishing fails, Relix stores the error on the post and leaves it available for retry.
