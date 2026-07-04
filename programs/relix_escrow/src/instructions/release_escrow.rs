use anchor_lang::prelude::*;

use crate::{
    constants::VAULT_SEED,
    error::EscrowError,
    state::{Escrow, EscrowStatus},
};

#[derive(Accounts)]
pub struct ReleaseEscrow<'info> {
    pub founder: Signer<'info>,
    #[account(mut, has_one = founder @ EscrowError::UnauthorizedFounder)]
    pub escrow: Account<'info, Escrow>,
    /// CHECK: PDA used only as a native SOL vault. It stores no data.
    #[account(mut, seeds = [VAULT_SEED, escrow.key().as_ref()], bump = escrow.vault_bump)]
    pub vault: UncheckedAccount<'info>,
    /// CHECK: Must match the specialist stored in escrow.
    #[account(mut, address = escrow.specialist @ EscrowError::InvalidSpecialistAccount)]
    pub specialist: UncheckedAccount<'info>,
    /// CHECK: Must match the treasury stored in escrow.
    #[account(mut, address = escrow.treasury @ EscrowError::InvalidTreasuryAccount)]
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_release_escrow(ctx: Context<ReleaseEscrow>) -> Result<()> {
    require_funded(ctx.accounts.escrow.status)?;

    let specialist_amount = ctx.accounts.escrow.specialist_amount_lamports;
    let treasury_amount = ctx.accounts.escrow.treasury_fee_lamports;
    let total_amount = ctx.accounts.escrow.total_amount_lamports;

    require!(
        ctx.accounts.vault.lamports() >= total_amount,
        EscrowError::InsufficientVaultFunds
    );

    transfer_from_vault(
        &ctx,
        ctx.accounts.specialist.to_account_info(),
        specialist_amount,
    )?;

    if treasury_amount > 0 {
        transfer_from_vault(
            &ctx,
            ctx.accounts.treasury.to_account_info(),
            treasury_amount,
        )?;
    }

    ctx.accounts.escrow.status = EscrowStatus::Released;

    Ok(())
}

fn require_funded(status: EscrowStatus) -> Result<()> {
    match status {
        EscrowStatus::Funded => Ok(()),
        EscrowStatus::Released => err!(EscrowError::AlreadyReleased),
        EscrowStatus::Refunded => err!(EscrowError::AlreadyRefunded),
    }
}

fn transfer_from_vault<'info>(
    ctx: &Context<ReleaseEscrow<'info>>,
    to: AccountInfo<'info>,
    lamports: u64,
) -> Result<()> {
    let escrow_key = ctx.accounts.escrow.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        VAULT_SEED,
        escrow_key.as_ref(),
        &[ctx.accounts.escrow.vault_bump],
    ]];
    let cpi_accounts = anchor_lang::system_program::Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to,
    };
    let cpi_ctx =
        CpiContext::new_with_signer(anchor_lang::system_program::ID, cpi_accounts, signer_seeds);

    anchor_lang::system_program::transfer(cpi_ctx, lamports)
}
