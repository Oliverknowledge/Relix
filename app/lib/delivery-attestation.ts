import { ed25519 } from "@noble/curves/ed25519";
import {
  PublicKey,
  Transaction,
  TransactionInstruction
} from "@solana/web3.js";
import {
  ensureTreasuryFunded,
  getConnection,
  getTreasuryKeypair
} from "@/app/lib/agent-treasury";
import {
  readinessAttestationMessage,
  type DeliveryAttestation,
  type DeliveryReadiness
} from "@/app/lib/delivery-readiness";

// Signs a delivery readiness verdict with the Relix agent key. This is the same
// key family that signs reward/prize payouts — it is deliberately NOT anything
// that can move founder escrow. The attestation is a signed statement ("the
// buyer agent verified this delivery"), never a settlement.
//
// Two tiers, one code path:
//   - default: sign off-chain (ed25519). No network, no fee. Anyone can verify
//     the signature against the published agent pubkey.
//   - RELIX_ONCHAIN_ATTESTATION=1: additionally broadcast a devnet Memo tx so
//     the attestation has a public Solana Explorer link, clearly separate from
//     the escrow account. Requires the agent treasury to hold a little devnet SOL.
//
// Best-effort: any failure returns null and the readiness verdict still stands.

// The SPL Memo program — a no-op log program. The transaction carries the
// attestation message and moves zero lamports.
const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);
// Rough upper bound for a single memo transaction fee, used to top up the
// treasury before broadcasting.
const MEMO_FEE_LAMPORTS = 10_000;

function isOnChainEnabled(): boolean {
  return process.env.RELIX_ONCHAIN_ATTESTATION?.trim() === "1";
}

export async function attestDeliveryReadiness(
  readiness: DeliveryReadiness
): Promise<DeliveryAttestation | null> {
  try {
    const keypair = await getTreasuryKeypair();
    const message = readinessAttestationMessage(readiness);
    const messageBytes = new TextEncoder().encode(message);

    // web3.js secret keys are 64 bytes (32-byte seed || 32-byte public key);
    // ed25519 signs from the 32-byte seed.
    const seed = keypair.secretKey.slice(0, 32);
    const signature = ed25519.sign(messageBytes, seed);
    const agentPubkey = keypair.publicKey.toBase58();

    const base: DeliveryAttestation = {
      agentPubkey,
      signature: Buffer.from(signature).toString("base64"),
      message,
      onChain: false
    };

    if (!isOnChainEnabled()) {
      return base;
    }

    return await broadcastMemoAttestation(base, message);
  } catch (error) {
    console.error("[attestation] failed, continuing without it:", error);
    return null;
  }
}

// Broadcasts the memo transaction. If broadcast fails, we fall back to the
// off-chain signed attestation rather than dropping it entirely.
async function broadcastMemoAttestation(
  base: DeliveryAttestation,
  message: string
): Promise<DeliveryAttestation> {
  try {
    const connection = getConnection();
    const keypair = await getTreasuryKeypair();
    await ensureTreasuryFunded(MEMO_FEE_LAMPORTS);

    const instruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(message, "utf8")
    });
    const transaction = new Transaction().add(instruction);
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = keypair.publicKey;
    transaction.sign(keypair);

    const txSignature = await connection.sendRawTransaction(
      transaction.serialize()
    );
    await connection.confirmTransaction(
      { signature: txSignature, blockhash, lastValidBlockHeight },
      "confirmed"
    );

    return {
      ...base,
      onChain: true,
      txSignature,
      explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`
    };
  } catch (error) {
    console.error(
      "[attestation] on-chain broadcast failed, keeping off-chain signature:",
      error
    );
    return base;
  }
}
