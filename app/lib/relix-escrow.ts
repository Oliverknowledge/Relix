import * as anchor from "@anchor-lang/core";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  type BlockhashWithExpiryBlockHeight,
  type Connection,
  type VersionedTransaction
} from "@solana/web3.js";
import relixEscrowIdl from "@/app/lib/idl/relix_escrow.json";
import type { RelixEscrow } from "@/app/lib/idl/relix_escrow";
import {
  explorerUrl,
  parseSolanaAddress,
  settlementAmountFor
} from "@/app/lib/wallet";

export const DEFAULT_RELIX_PLATFORM_FEE_BPS = 1000;
export const MAX_RELIX_PLATFORM_FEE_BPS = 3000;
export const RELIX_ESCROW_IDL_PATH = "app/lib/idl/relix_escrow.json";

const VAULT_SEED = "relix_vault";
const DEFAULT_PUBLIC_KEY = "11111111111111111111111111111111";
const PROGRAM_ID_ENV = "NEXT_PUBLIC_RELIX_ESCROW_PROGRAM_ID";
const TREASURY_ENV = "NEXT_PUBLIC_RELIX_TREASURY_WALLET";
const FEE_BPS_ENV = "NEXT_PUBLIC_RELIX_PLATFORM_FEE_BPS";
type WalletTransaction = Transaction | VersionedTransaction;

export type RelixEscrowConfig =
  | {
      error: string;
      feeBps: number;
      ok: false;
      programId: null;
      treasuryWallet: null;
    }
  | {
      error: null;
      feeBps: number;
      ok: true;
      programId: PublicKey;
      treasuryWallet: PublicKey;
    };

export type EscrowQuote = {
  deadlineUnix: number;
  feeBps: number;
  specialistAmountLamports: number;
  specialistAmountSol: number;
  totalLamports: number;
  totalSol: number;
  treasuryFeeLamports: number;
  treasuryFeeSol: number;
};

export type BuiltEscrowTransaction = {
  latestBlockhash: BlockhashWithExpiryBlockHeight;
  transaction: Transaction;
};

export type BuiltInitializeEscrowTransaction = BuiltEscrowTransaction & {
  escrow: Keypair;
  vault: PublicKey;
};

export function getRelixEscrowConfig(): RelixEscrowConfig {
  const programIdValue = process.env.NEXT_PUBLIC_RELIX_ESCROW_PROGRAM_ID?.trim();
  const treasuryValue = process.env.NEXT_PUBLIC_RELIX_TREASURY_WALLET?.trim();
  const feeBps = parseFeeBps(process.env.NEXT_PUBLIC_RELIX_PLATFORM_FEE_BPS);

  if (!programIdValue || !treasuryValue) {
    return configError(
      `Escrow setup is missing. Set ${PROGRAM_ID_ENV}, ${TREASURY_ENV}, and ${FEE_BPS_ENV}, then restart the app.`,
      feeBps
    );
  }

  const programId = parseSolanaAddress(programIdValue);
  const treasuryWallet = parseSolanaAddress(treasuryValue);

  if (!programId) {
    return configError(`${PROGRAM_ID_ENV} is not a valid Solana address.`, feeBps);
  }

  if (!treasuryWallet || treasuryWallet.toBase58() === DEFAULT_PUBLIC_KEY) {
    return configError(`${TREASURY_ENV} must be a non-default Solana address.`, feeBps);
  }

  if (
    !Number.isInteger(feeBps) ||
    feeBps < 0 ||
    feeBps > MAX_RELIX_PLATFORM_FEE_BPS
  ) {
    return configError(
      `${FEE_BPS_ENV} must be between 0 and ${MAX_RELIX_PLATFORM_FEE_BPS}.`,
      feeBps
    );
  }

  if (!relixEscrowIdl || !Array.isArray(relixEscrowIdl.instructions)) {
    return configError(
      `Relix escrow IDL is missing or invalid at ${RELIX_ESCROW_IDL_PATH}.`,
      feeBps
    );
  }

  return {
    error: null,
    feeBps,
    ok: true,
    programId,
    treasuryWallet
  };
}

export function escrowQuoteFor({
  deadline,
  feeBps,
  totalSol
}: {
  deadline: string;
  feeBps: number;
  totalSol: number;
}): EscrowQuote {
  const normalizedTotalSol = settlementAmountFor(totalSol);
  const totalLamports = Math.round(normalizedTotalSol * LAMPORTS_PER_SOL);
  const treasuryFeeLamports = Math.floor((totalLamports * feeBps) / 10_000);
  const specialistAmountLamports = totalLamports - treasuryFeeLamports;

  return {
    deadlineUnix: deadlineUnixFromDate(deadline),
    feeBps,
    specialistAmountLamports,
    specialistAmountSol: lamportsToSol(specialistAmountLamports),
    totalLamports,
    totalSol: normalizedTotalSol,
    treasuryFeeLamports,
    treasuryFeeSol: lamportsToSol(treasuryFeeLamports)
  };
}

export async function buildInitializeEscrowTransaction({
  connection,
  deadlineUnix,
  feeBps,
  founder,
  jobId,
  programId,
  specialist,
  totalLamports,
  treasury
}: {
  connection: Connection;
  deadlineUnix: number;
  feeBps: number;
  founder: PublicKey;
  jobId: string;
  programId: PublicKey;
  specialist: PublicKey;
  totalLamports: number;
  treasury: PublicKey;
}): Promise<BuiltInitializeEscrowTransaction> {
  const escrow = Keypair.generate();
  const vault = vaultPda(escrow.publicKey, programId);
  const program = relixEscrowProgram(connection, founder, programId);
  const transaction = await program.methods
    .initializeEscrow(
      jobId,
      new anchor.BN(totalLamports),
      feeBps,
      new anchor.BN(deadlineUnix)
    )
    .accountsPartial({
      escrow: escrow.publicKey,
      founder,
      specialist,
      systemProgram: SystemProgram.programId,
      treasury,
      vault
    })
    .transaction();

  const latestBlockhash = await prepareTransaction({
    connection,
    feePayer: founder,
    signers: [escrow],
    transaction
  });

  return {
    escrow,
    latestBlockhash,
    transaction,
    vault
  };
}

export async function buildReleaseEscrowTransaction({
  connection,
  escrow,
  founder,
  programId,
  specialist,
  treasury,
  vault
}: {
  connection: Connection;
  escrow: PublicKey;
  founder: PublicKey;
  programId: PublicKey;
  specialist: PublicKey;
  treasury: PublicKey;
  vault: PublicKey;
}): Promise<BuiltEscrowTransaction> {
  const program = relixEscrowProgram(connection, founder, programId);
  const transaction = await program.methods
    .releaseEscrow()
    .accountsPartial({
      escrow,
      founder,
      specialist,
      systemProgram: SystemProgram.programId,
      treasury,
      vault
    })
    .transaction();
  const latestBlockhash = await prepareTransaction({
    connection,
    feePayer: founder,
    transaction
  });

  return { latestBlockhash, transaction };
}

export async function buildRefundEscrowTransaction({
  connection,
  escrow,
  founder,
  programId,
  vault
}: {
  connection: Connection;
  escrow: PublicKey;
  founder: PublicKey;
  programId: PublicKey;
  vault: PublicKey;
}): Promise<BuiltEscrowTransaction> {
  const program = relixEscrowProgram(connection, founder, programId);
  const transaction = await program.methods
    .refundEscrow()
    .accountsPartial({
      escrow,
      founder,
      systemProgram: SystemProgram.programId,
      vault
    })
    .transaction();
  const latestBlockhash = await prepareTransaction({
    connection,
    feePayer: founder,
    transaction
  });

  return { latestBlockhash, transaction };
}

export async function simulateEscrowTransaction(
  connection: Connection,
  transaction: Transaction
) {
  const simulation = await connection.simulateTransaction(transaction);

  if (simulation.value.err) {
    throw new Error(`Escrow transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
  }

  return simulation.value;
}

export function transactionExplorer(signature: string) {
  return explorerUrl(signature);
}

export function escrowDeadlinePassed(deadlineUnix: number) {
  return Math.floor(Date.now() / 1000) >= deadlineUnix;
}

export function formatEscrowDeadline(deadlineUnix: number) {
  return new Date(deadlineUnix * 1000).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export function vaultPda(escrow: PublicKey, programId: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED), escrow.toBuffer()],
    programId
  )[0];
}

function relixEscrowProgram(
  connection: Connection,
  publicKey: PublicKey,
  programId: PublicKey
): anchor.Program<RelixEscrow> {
  const wallet = {
    publicKey,
    signAllTransactions: async <T extends WalletTransaction>(transactions: T[]) =>
      transactions,
    signTransaction: async <T extends WalletTransaction>(transaction: T) =>
      transaction
  };
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed"
  });
  const idl = {
    ...(relixEscrowIdl as unknown as RelixEscrow),
    address: programId.toBase58()
  } as unknown as RelixEscrow;

  return new anchor.Program<RelixEscrow>(idl, provider);
}

async function prepareTransaction({
  connection,
  feePayer,
  signers = [],
  transaction
}: {
  connection: Connection;
  feePayer: PublicKey;
  signers?: Keypair[];
  transaction: Transaction;
}) {
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  transaction.feePayer = feePayer;
  transaction.recentBlockhash = latestBlockhash.blockhash;

  if (signers.length > 0) {
    transaction.partialSign(...signers);
  }

  return latestBlockhash;
}

function parseFeeBps(value: string | undefined) {
  if (!value || !value.trim()) {
    return DEFAULT_RELIX_PLATFORM_FEE_BPS;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function configError(error: string, feeBps: number): RelixEscrowConfig {
  return {
    error,
    feeBps,
    ok: false,
    programId: null,
    treasuryWallet: null
  };
}

function deadlineUnixFromDate(deadline: string) {
  const parsed = new Date(`${deadline}T23:59:59.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return Math.floor(Date.now() / 1000) + 7 * 86_400;
  }

  return Math.floor(parsed.getTime() / 1000);
}

function lamportsToSol(lamports: number) {
  return Number((lamports / LAMPORTS_PER_SOL).toFixed(9));
}
