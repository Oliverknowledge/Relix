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
- JSON-backed local records for X accounts, X posts, activity, memory, and internal state.

## What Is Simulated

- Specialist bidding and winner selection are deterministic local logic.
- Specialist recipient wallets are public demo recipient addresses.
- The local JSON files are a hackathon database. The service layer is isolated so it can be replaced with Postgres, Prisma, or Supabase.

No users, signups, creator contacts, or campaign results are claimed.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

GITHUB_CLIENT_ID=Ov23li16wipKedVNy38w
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret

X_CLIENT_ID=your_x_oauth_2_client_id
X_CLIENT_SECRET=your_x_oauth_2_client_secret
X_REDIRECT_URI=http://localhost:3000/api/x/callback

RELIX_TOKEN_ENCRYPTION_KEY=replace_with_a_long_random_secret
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

X Developer Portal callback:

```text
http://localhost:3000/api/x/callback
```

For X, enable OAuth 2.0 and use a Web App / confidential client. Relix requests the minimum scopes needed for this flow:

```text
tweet.read users.read tweet.write offline.access
```

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

## Solana Devnet Flow

Devnet is hardcoded in `app/providers.tsx` with `clusterApiUrl("devnet")`. Mainnet is not used.

1. Connect Phantom on devnet.
2. Use `Get devnet SOL` or the Solana faucet if the balance is low.
3. Hire the employee.
4. Review the specialist delivery.
5. Approve the payment in the wallet.
6. Relix shows the confirmed signature and devnet Explorer link.

## Local Data

Local development writes JSON files to `data/`. Vercel writes them to `/tmp/relix-data` because the deployed app bundle is read-only.

These files are ignored by git:

- `data/x-accounts.json`
- `data/x-posts.json`
- `data/activity-log.json`
- `data/campaign-memory.json`
- `data/scheduled-posts.json`

The Vercel `/tmp` directory is writable but ephemeral. It prevents serverless file-write crashes, but it is not durable storage. For a production X integration, replace the JSON store with Vercel KV, Postgres, Supabase, or another database.

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

## API Routes

- `GET /api/x/connect`
- `GET /api/x/callback`
- `GET /api/x/status`
- `POST /api/x/disconnect`
- `POST /api/x/post`
- `POST /api/x/schedule`
- `GET /api/x/posts`
- `POST /api/x/refresh-token`

## Architecture

- UI: `app/page.tsx`
- Wallet Service: `app/lib/wallet.ts` and `app/providers.tsx`
- GitHub Service: `app/lib/github-tool.ts` and `app/api/github/*`
- Repository Analysis Service: `app/lib/repository-analysis.ts`
- Employee Engine: `app/lib/growth-employee.ts`
- Specialist Marketplace: `app/lib/specialist-agents.ts` and `app/lib/campaign.ts`
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
