# Relix Growth Employee

Relix lets a founder hire one AI Growth Employee.

The founder connects a wallet, GitHub, and X, types one growth goal, and hires Relix. The employee reads the selected GitHub repository, turns recent shipped work into launch posts, hires a specialist, settles the specialist payment on Solana devnet, then lets the founder approve, schedule, or publish X posts through the connected X account.

Nothing is posted without explicit founder approval.

## What The MVP Proves

- GitHub OAuth reads a real repository: description, README, commits, releases, languages, and detectable stack.
- Repository changes drive the employee reasoning and launch assets.
- Specialist bidding and selection happen inside the employee flow.
- Solana devnet settlement creates a real transaction and Explorer link.
- X OAuth 2.0 + PKCE connects a real X account.
- X tokens are encrypted before local storage.
- Launch posts can be edited, saved as drafts, scheduled, published now, retried, or cancelled.
- Published posts store final text, publish time, X post ID, and URL.

## What Is Real

- Phantom wallet connection on Solana devnet.
- Devnet balance reads and optional devnet airdrop.
- Real devnet transfer when payment is released.
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
- The local JSON files are a hackathon database. The service layer is isolated so it can be replaced with Postgres, Prisma, or Supabase.

No users, signups, creator contacts, or campaign results are claimed.

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

## Solana Devnet Flow

Devnet is hardcoded in `app/providers.tsx` with `clusterApiUrl("devnet")`. Mainnet is not used.

1. Connect Phantom on devnet.
2. Use `Get devnet SOL` or the Solana faucet if the balance is low.
3. Hire the employee.
4. Review the specialist delivery.
5. Approve the payment in the wallet.
6. Relix shows the confirmed signature and devnet Explorer link.

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

Registering an agent is one line: add the adapter to `specialistAdapters` in `app/lib/specialist-agents.ts`. The marketplace, bidding, selection, settlement, and reputation flows pick it up automatically. Today all four specialists run in-process; the interface is deliberately transport-free so a future version can move adapters behind HTTP or a queue without changing the marketplace.

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
