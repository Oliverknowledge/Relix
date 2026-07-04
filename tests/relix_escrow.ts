import { strict as assert } from "assert";
import * as anchor from "@anchor-lang/core";
import { Program } from "@anchor-lang/core";
import { RelixEscrow } from "../target/types/relix_escrow";

const VAULT_SEED = "relix_vault";
const TOTAL_LAMPORTS = 100_000_000;
const FEE_BPS = 500;
const TREASURY_FEE_LAMPORTS = Math.floor(
  (TOTAL_LAMPORTS * FEE_BPS) / 10_000
);
const SPECIALIST_AMOUNT_LAMPORTS = TOTAL_LAMPORTS - TREASURY_FEE_LAMPORTS;

describe("relix_escrow", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.relixEscrow as Program<RelixEscrow>;
  const systemProgram = anchor.web3.SystemProgram.programId;

  async function airdrop(pubkey: anchor.web3.PublicKey, lamports: number) {
    const signature = await provider.connection.requestAirdrop(pubkey, lamports);
    const latest = await provider.connection.getLatestBlockhash("confirmed");
    await provider.connection.confirmTransaction(
      {
        signature,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      },
      "confirmed"
    );
  }

  function vaultPda(escrow: anchor.web3.PublicKey) {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(VAULT_SEED), escrow.toBuffer()],
      program.programId
    )[0];
  }

  function statusName(status: Record<string, unknown>) {
    return Object.keys(status)[0];
  }

  async function initializeEscrow(deadlineUnix: number) {
    const founder = anchor.web3.Keypair.generate();
    const specialist = anchor.web3.Keypair.generate();
    const treasury = anchor.web3.Keypair.generate();
    const escrow = anchor.web3.Keypair.generate();
    const vault = vaultPda(escrow.publicKey);
    const jobId = `relix-${escrow.publicKey.toBase58().slice(0, 12)}`;

    await airdrop(founder.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);

    const signature = await program.methods
      .initializeEscrow(
        jobId,
        new anchor.BN(TOTAL_LAMPORTS),
        FEE_BPS,
        new anchor.BN(deadlineUnix)
      )
      .accountsPartial({
        founder: founder.publicKey,
        escrow: escrow.publicKey,
        vault,
        specialist: specialist.publicKey,
        treasury: treasury.publicKey,
        systemProgram,
      })
      .signers([founder, escrow])
      .rpc();

    return {
      escrow,
      founder,
      jobId,
      signature,
      specialist,
      treasury,
      vault,
    };
  }

  async function expectRejects(action: () => Promise<unknown>) {
    let failed = false;

    try {
      await action();
    } catch {
      failed = true;
    }

    assert.equal(failed, true);
  }

  it("initialize creates escrow and vault receives funds", async () => {
    const deadline = Math.floor(Date.now() / 1000) + 60 * 60;
    const { escrow, founder, jobId, specialist, treasury, vault } =
      await initializeEscrow(deadline);

    const state = await program.account.escrow.fetch(escrow.publicKey);
    const vaultBalance = await provider.connection.getBalance(vault);

    assert.equal(state.jobId, jobId);
    assert.equal(state.founder.toBase58(), founder.publicKey.toBase58());
    assert.equal(state.specialist.toBase58(), specialist.publicKey.toBase58());
    assert.equal(state.treasury.toBase58(), treasury.publicKey.toBase58());
    assert.equal(state.totalAmountLamports.toNumber(), TOTAL_LAMPORTS);
    assert.equal(
      state.specialistAmountLamports.toNumber(),
      SPECIALIST_AMOUNT_LAMPORTS
    );
    assert.equal(state.treasuryFeeLamports.toNumber(), TREASURY_FEE_LAMPORTS);
    assert.equal(state.feeBps, FEE_BPS);
    assert.equal(statusName(state.status), "funded");
    assert.equal(vaultBalance, TOTAL_LAMPORTS);
  });

  it("non-founder cannot release", async () => {
    const deadline = Math.floor(Date.now() / 1000) + 60 * 60;
    const { escrow, specialist, treasury, vault } =
      await initializeEscrow(deadline);
    const attacker = anchor.web3.Keypair.generate();

    await expectRejects(() =>
      program.methods
        .releaseEscrow()
        .accountsPartial({
          founder: attacker.publicKey,
          escrow: escrow.publicKey,
          vault,
          specialist: specialist.publicKey,
          treasury: treasury.publicKey,
          systemProgram,
        })
        .signers([attacker])
        .rpc()
    );
  });

  it("release sends the correct split to specialist and treasury", async () => {
    const deadline = Math.floor(Date.now() / 1000) + 60 * 60;
    const { escrow, founder, specialist, treasury, vault } =
      await initializeEscrow(deadline);
    const specialistBefore = await provider.connection.getBalance(
      specialist.publicKey
    );
    const treasuryBefore = await provider.connection.getBalance(
      treasury.publicKey
    );

    await program.methods
      .releaseEscrow()
      .accountsPartial({
        founder: founder.publicKey,
        escrow: escrow.publicKey,
        vault,
        specialist: specialist.publicKey,
        treasury: treasury.publicKey,
        systemProgram,
      })
      .signers([founder])
      .rpc();

    const specialistAfter = await provider.connection.getBalance(
      specialist.publicKey
    );
    const treasuryAfter = await provider.connection.getBalance(
      treasury.publicKey
    );
    const vaultAfter = await provider.connection.getBalance(vault);
    const state = await program.account.escrow.fetch(escrow.publicKey);

    assert.equal(
      specialistAfter - specialistBefore,
      SPECIALIST_AMOUNT_LAMPORTS
    );
    assert.equal(treasuryAfter - treasuryBefore, TREASURY_FEE_LAMPORTS);
    assert.equal(vaultAfter, 0);
    assert.equal(statusName(state.status), "released");
  });

  it("release cannot happen twice", async () => {
    const deadline = Math.floor(Date.now() / 1000) + 60 * 60;
    const { escrow, founder, specialist, treasury, vault } =
      await initializeEscrow(deadline);

    await program.methods
      .releaseEscrow()
      .accountsPartial({
        founder: founder.publicKey,
        escrow: escrow.publicKey,
        vault,
        specialist: specialist.publicKey,
        treasury: treasury.publicKey,
        systemProgram,
      })
      .signers([founder])
      .rpc();

    await expectRejects(() =>
      program.methods
        .releaseEscrow()
        .accountsPartial({
          founder: founder.publicKey,
          escrow: escrow.publicKey,
          vault,
          specialist: specialist.publicKey,
          treasury: treasury.publicKey,
          systemProgram,
        })
        .signers([founder])
        .rpc()
    );
  });

  it("refund fails before deadline", async () => {
    const deadline = Math.floor(Date.now() / 1000) + 60 * 60;
    const { escrow, founder, vault } = await initializeEscrow(deadline);

    await expectRejects(() =>
      program.methods
        .refundEscrow()
        .accountsPartial({
          founder: founder.publicKey,
          escrow: escrow.publicKey,
          vault,
          systemProgram,
        })
        .signers([founder])
        .rpc()
    );

    const state = await program.account.escrow.fetch(escrow.publicKey);
    const vaultBalance = await provider.connection.getBalance(vault);

    assert.equal(statusName(state.status), "funded");
    assert.equal(vaultBalance, TOTAL_LAMPORTS);
  });

  it("refund works after deadline", async () => {
    const deadline = Math.floor(Date.now() / 1000) - 1;
    const { escrow, founder, vault } = await initializeEscrow(deadline);
    const founderBefore = await provider.connection.getBalance(founder.publicKey);

    await program.methods
      .refundEscrow()
      .accountsPartial({
        founder: founder.publicKey,
        escrow: escrow.publicKey,
        vault,
        systemProgram,
      })
      .signers([founder])
      .rpc();

    const founderAfter = await provider.connection.getBalance(founder.publicKey);
    const vaultAfter = await provider.connection.getBalance(vault);
    const state = await program.account.escrow.fetch(escrow.publicKey);

    assert.equal(founderAfter - founderBefore, TOTAL_LAMPORTS);
    assert.equal(vaultAfter, 0);
    assert.equal(statusName(state.status), "refunded");
  });

  it("refund cannot happen after release", async () => {
    const deadline = Math.floor(Date.now() / 1000) - 1;
    const { escrow, founder, specialist, treasury, vault } =
      await initializeEscrow(deadline);

    await program.methods
      .releaseEscrow()
      .accountsPartial({
        founder: founder.publicKey,
        escrow: escrow.publicKey,
        vault,
        specialist: specialist.publicKey,
        treasury: treasury.publicKey,
        systemProgram,
      })
      .signers([founder])
      .rpc();

    await expectRejects(() =>
      program.methods
        .refundEscrow()
        .accountsPartial({
          founder: founder.publicKey,
          escrow: escrow.publicKey,
          vault,
          systemProgram,
        })
        .signers([founder])
        .rpc()
    );
  });
});
