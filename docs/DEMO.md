# Full local demo: CoralOS coordination + Anchor escrow settlement

This is the judge runbook for the complete Relix flow.

**One line: CoralOS coordinates; Anchor settles.**

The chain is **job/request → bid → award → escrow funded → delivery →
release/refund**. CoralOS coordinates the buyer/seller agents (it holds no keys
and moves no money); the founder signs the on-chain escrow, and **founder
approval is the release gate**.

Honest summary up front:

- **CoralOS coordinates the buyer/seller agent marketplace** (job posting,
  bidding, collection). It holds no keys and moves **no** money.
- **Anchor handles real Solana devnet escrow settlement** (lock → release/refund,
  specialist payout + Relix treasury fee). **Founder approval (a Phantom
  signature) is the release gate.**
- The three specialist seller agents are Relix's **own built-in** agents, not
  remote third-party sellers.
- The CoralOS award / escrow-link / settlement timeline events are **Relix
  protocol records linked to the CoralOS session/thread ids** — not messages
  posted back to the Coral Server.
- The full CoralOS demo is **local/VM only**, because CoralOS is a long-running
  JVM runtime that launches agent processes. **On Vercel** (serverless) CoralOS
  is unavailable, so Relix uses the labelled **local fallback**.

## Prerequisites

- **Java 24+** (Coral Server is a JVM app): `brew install openjdk`.
- **Node 18+** and this repo installed (`npm install`).
- The **Coral Server** jar (`coralos-dev` / `coral-server.jar`).
- Devnet wallets (see "Wallets" below) and a Phantom wallet on devnet for the
  founder — only needed for the on-chain escrow step, not for `coralos:verify`.

## 1. Start the Coral Server

```bash
# from a config with an auth key (see scripts/coralos/agents/coral-server-config.example.toml)
CONFIG_FILE_PATH=coral-server-config.toml java -jar coral-server.jar
# -> Coral console at http://localhost:5555/ui/console
```

The `auth.keys` value in that config must match `CORAL_API_KEY` in the app env.

## 2. Build and register the Coral agents

```bash
npm run coralos:build                          # bundles scripts/coralos/agent.ts -> dist/agent.mjs
cp -R scripts/coralos/agents/relix-* "$HOME/.coral/agents/"
# edit each copied coral-agent.toml: set the executable `path` (your node) and the
# absolute paths in `arguments` (dist/agent.mjs and --data-dir=<repo>/data)
```

Restart the Coral Server; it logs `agent added: local/relix-buyer:0.1.0` (and the
three sellers). Confirm with:

```bash
curl -s -H "Authorization: Bearer <CORAL_API_KEY>" http://localhost:5555/api/v1/registry
```

## 3. Verify CoralOS coordination (no Phantom, no escrow)

```bash
RELIX_CORALOS_ENABLED=1 CORAL_API_KEY=<key> CORAL_SERVER_URL=http://localhost:5555 \
  npm run coralos:verify
```

Expected: `ALL CHECKS PASSED`, with `PASS` lines for runtime connected, buyer
agent, all three seller bids (tournament/referral/community), award recorded, and
escrow link simulated — plus the real session/thread/bid ids.

## 4. Required env vars (`.env.local`)

```bash
RELIX_CORALOS_ENABLED=1
CORAL_SERVER_URL=http://localhost:5555
CORAL_API_KEY=<the auth key from your Coral Server config>
CORAL_NAMESPACE=relix

# Escrow (settlement) — unchanged from the base app:
NEXT_PUBLIC_RELIX_ESCROW_PROGRAM_ID=<deployed devnet program id>
NEXT_PUBLIC_RELIX_TREASURY_WALLET=<your devnet treasury public key>
NEXT_PUBLIC_RELIX_PLATFORM_FEE_BPS=1000
```

## 5. Wallets

- **Founder wallet** — Phantom on devnet; signs `initialize_escrow` /
  `release_escrow` / `refund_escrow`.
- **Specialist owner wallet** — receives the specialist payout on release
  (`metadata().ownerWallet`).
- **Relix treasury wallet** — receives the platform fee (`NEXT_PUBLIC_RELIX_TREASURY_WALLET`).
- Use distinct devnet addresses so the split is legible on Explorer.

## 6. Start Relix and run a campaign

```bash
npm run dev    # http://localhost:3000
```

Connect GitHub + wallet, set a goal, and run. The plan is produced by
`/api/campaign/plan`, which uses CoralOS first.

## 7. Confirm the proof (what to look at)

**Protocol Proof panel** (below the timeline after a run):

- Top badge and banner read **"Coordination mode: CoralOS runtime"** /
  **"CoralOS path active — buyer/seller coordination ran through CoralOS."**
- **CoralOS runtime connected: Yes**.
- Buyer agent (Growth Employee) and seller agents (Tournament / Referral /
  Community) are listed.
- **CoralOS session id, thread id, and bid ids** are shown.
- **Awarded bid id** and awarded specialist are shown.
- Settlement section shows **escrow program id, escrow account, vault PDA,
  founder / specialist / treasury wallets, total locked, specialist payout,
  treasury fee, and init/release/refund tx signatures with Explorer links**, plus
  **Settlement status** (not funded / funded / released / refunded).

**Market Activity timeline** now includes the `CORALOS_*` events:
`CORALOS_RUNTIME_CONNECTED`, `CORALOS_BUYER_AGENT_REGISTERED`,
`CORALOS_SELLER_AGENT_REGISTERED` (×3), `CORALOS_MARKET_JOB_CREATED`,
`CORALOS_SELLER_BID_RECEIVED` (×3), `CORALOS_BID_AWARDED`,
`CORALOS_ESCROW_LINKED`, `CORALOS_ESCROW_FUNDED`, `CORALOS_ESCROW_RELEASED`,
`CORALOS_SETTLEMENT_COMPLETE` — each carrying the CoralOS session/thread/bid ids
and (for settlement) the tx signature + Explorer link.

## 8. Avoid recording in fallback mode

If the panel/badge says **"Local fallback active — CoralOS was not used for this
run,"** or the timeline shows `CORALOS_FALLBACK_USED`, do **not** record — CoralOS
was not used. Fix the cause first:

- Coral Server not running, or `CORAL_SERVER_URL` wrong.
- `RELIX_CORALOS_ENABLED` not `1`, or `CORAL_API_KEY` missing/wrong.
- Agents not registered (`~/.coral/agents/*` not copied, or paths not edited).
- Running on Vercel (serverless can't host the JVM/agent processes).

Re-run `npm run coralos:verify` until it prints `ALL CHECKS PASSED`, then run the
campaign again.

## 9. What Vercel shows

On Vercel the JVM Coral Server and launched agent processes cannot run, so
`getCoralConfig()` returns null and every run uses the local fallback. The
Protocol Proof panel honestly reads **"Local fallback active — CoralOS was not
used for this run,"** and the timeline records `CORALOS_FALLBACK_USED`. The bids,
selection, and Anchor escrow settlement are still real; only the coordination
layer differs. To show CoralOS on a hosted deployment, run the app on a
Java-capable VM alongside the Coral Server and agent processes.
