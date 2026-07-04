use anchor_lang::prelude::*;

use crate::{
    constants::{BPS_DENOMINATOR, MAX_FEE_BPS, MAX_JOB_ID_LEN, VAULT_SEED},
    error::EscrowError,
    state::{Escrow, EscrowStatus},
};

#[derive(Accounts)]
pub struct InitializeEscrow<'info> {
    #[account(mut)]
    pub founder: Signer<'info>,
    #[account(init, payer = founder, space = 8 + Escrow::INIT_SPACE)]
    pub escrow: Account<'info, Escrow>,
    /// CHECK: PDA used only as a native SOL vault. It stores no data.
    #[account(mut, seeds = [VAULT_SEED, escrow.key().as_ref()], bump)]
    pub vault: UncheckedAccount<'info>,
    /// CHECK: Validated as non-default and stored for release.
    pub specialist: UncheckedAccount<'info>,
    /// CHECK: Validated as non-default and stored for release.
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_escrow(
    ctx: Context<InitializeEscrow>,
    job_id: String,
    total_amount_lamports: u64,
    fee_bps: u16,
    deadline_unix: i64,
) -> Result<()> {
    require!(
        !job_id.trim().is_empty() && job_id.len() <= MAX_JOB_ID_LEN,
        EscrowError::InvalidJobId
    );
    require!(total_amount_lamports > 0, EscrowError::InvalidTotalAmount);
    require!(fee_bps <= MAX_FEE_BPS, EscrowError::FeeTooHigh);
    require!(
        ctx.accounts.specialist.key() != Pubkey::default(),
        EscrowError::InvalidSpecialistWallet
    );
    require!(
        ctx.accounts.treasury.key() != Pubkey::default(),
        EscrowError::InvalidTreasuryWallet
    );
    require!(
        ctx.accounts.vault.lamports() == 0,
        EscrowError::VaultAlreadyFunded
    );

    let fee_lamports = calculate_fee(total_amount_lamports, fee_bps)?;
    let specialist_lamports = total_amount_lamports
        .checked_sub(fee_lamports)
        .ok_or(EscrowError::MathOverflow)?;
    require!(specialist_lamports > 0, EscrowError::SpecialistAmountZero);

    let escrow = &mut ctx.accounts.escrow;
    escrow.job_id = job_id;
    escrow.founder = ctx.accounts.founder.key();
    escrow.specialist = ctx.accounts.specialist.key();
    escrow.treasury = ctx.accounts.treasury.key();
    escrow.total_amount_lamports = total_amount_lamports;
    escrow.specialist_amount_lamports = specialist_lamports;
    escrow.treasury_fee_lamports = fee_lamports;
    escrow.fee_bps = fee_bps;
    escrow.deadline_unix = deadline_unix;
    escrow.status = EscrowStatus::Funded;
    escrow.created_at = Clock::get()?.unix_timestamp;
    escrow.vault_bump = ctx.bumps.vault;

    let cpi_accounts = anchor_lang::system_program::Transfer {
        from: ctx.accounts.founder.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(anchor_lang::system_program::ID, cpi_accounts);
    anchor_lang::system_program::transfer(cpi_ctx, total_amount_lamports)?;

    Ok(())
}

fn calculate_fee(total_amount_lamports: u64, fee_bps: u16) -> Result<u64> {
    let fee = u128::from(total_amount_lamports)
        .checked_mul(u128::from(fee_bps))
        .ok_or(EscrowError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(EscrowError::MathOverflow)?;

    u64::try_from(fee).map_err(|_| EscrowError::MathOverflow.into())
}
