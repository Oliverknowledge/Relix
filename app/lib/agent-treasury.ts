import { promises as fs } from "fs";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import { dataDirectory, dataPath } from "@/app/lib/data-path";

// The agent treasury is a devnet keypair the Growth Employee controls. Unlike
// the founder settlement (signed by a human via Phantom), the treasury signs
// server-side with no human in the loop — this is the "agent pays another
// wallet on-chain" primitive that powers the reward-ladder capability.
//
// Devnet-only, low-value. The secret can be provided via env for a stable
// funded wallet, or auto-generated and persisted to the gitignored data dir so
// it survives dev restarts. A tiny top-up buffer over the transfer covers fees.

const FEE_BUFFER_LAMPORTS = 10_000;
const AIRDROP_LAMPORTS = LAMPORTS_PER_SOL; // 1 SOL top-up when the treasury runs low.
const treasuryFile = dataPath("agent-treasury.json");

let cachedKeypair: Keypair | null = null;
let cachedConnection: Connection | null = null;

export function getConnection(): Connection {
  if (!cachedConnection) {
    cachedConnection = new Connection(clusterApiUrl("devnet"), "confirmed");
  }

  return cachedConnection;
}

export async function getTreasuryKeypair(): Promise<Keypair> {
  if (cachedKeypair) {
    return cachedKeypair;
  }

  const fromEnv = process.env.RELIX_AGENT_TREASURY_SECRET?.trim();
  if (fromEnv) {
    cachedKeypair = keypairFromBase64(fromEnv);
    return cachedKeypair;
  }

  const persisted = await readPersistedSecret();
  if (persisted) {
    cachedKeypair = keypairFromBase64(persisted);
    return cachedKeypair;
  }

  const generated = Keypair.generate();
  await writePersistedSecret(
    Buffer.from(generated.secretKey).toString("base64")
  );
  cachedKeypair = generated;
  return cachedKeypair;
}

export async function getTreasuryAddress(): Promise<string> {
  const keypair = await getTreasuryKeypair();
  return keypair.publicKey.toBase58();
}

/**
 * Ensures the treasury holds enough to cover `neededLamports` plus fees,
 * requesting a devnet airdrop when it does not. Airdrops are rate-limited on
 * public devnet, so a failure throws a clear, fundable error rather than a
 * cryptic RPC message.
 */
export async function ensureTreasuryFunded(
  neededLamports: number
): Promise<number> {
  const connection = getConnection();
  const keypair = await getTreasuryKeypair();
  const required = neededLamports + FEE_BUFFER_LAMPORTS;

  let balance = await connection.getBalance(keypair.publicKey, "confirmed");
  if (balance >= required) {
    return balance;
  }

  try {
    const signature = await connection.requestAirdrop(
      keypair.publicKey,
      AIRDROP_LAMPORTS
    );
    const latest = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction(
      {
        signature,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight
      },
      "confirmed"
    );
    balance = await connection.getBalance(keypair.publicKey, "confirmed");
  } catch {
    // Airdrop failed (usually devnet rate limits). Surface the address so the
    // treasury can be topped up manually from the faucet.
  }

  if (balance < required) {
    throw new Error(
      `Agent treasury ${keypair.publicKey.toBase58()} is underfunded on devnet ` +
        `(has ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL, needs ` +
        `${(required / LAMPORTS_PER_SOL).toFixed(4)} SOL). Fund it at ` +
        `https://faucet.solana.com/ and retry.`
    );
  }

  return balance;
}

/**
 * Signs and sends a devnet transfer from the agent treasury to `recipient`.
 * Returns the confirmed signature and slot.
 */
export async function payFromTreasury(
  recipient: PublicKey,
  lamports: number
): Promise<{ signature: string; slot: number }> {
  const connection = getConnection();
  const keypair = await getTreasuryKeypair();

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: recipient,
      lamports
    })
  );

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [keypair],
    { commitment: "confirmed" }
  );
  const slot = await connection.getSlot("confirmed");

  return { signature, slot };
}

function keypairFromBase64(secret: string): Keypair {
  const bytes = Uint8Array.from(Buffer.from(secret, "base64"));
  return Keypair.fromSecretKey(bytes);
}

async function readPersistedSecret(): Promise<string | null> {
  try {
    const data = await fs.readFile(treasuryFile, "utf8");
    const parsed = JSON.parse(data) as { secretKeyBase64?: string };
    return parsed.secretKeyBase64 ?? null;
  } catch {
    return null;
  }
}

async function writePersistedSecret(secretKeyBase64: string): Promise<void> {
  await fs.mkdir(dataDirectory(), { recursive: true });
  await fs.writeFile(
    treasuryFile,
    `${JSON.stringify({ secretKeyBase64 }, null, 2)}\n`,
    "utf8"
  );
}
