use anchor_lang::prelude::*;

use crate::{
    constants::VAULT_SEED,
    error::EscrowError,
    state::{Escrow, EscrowStatus},
};

#[derive(Accounts)]
pub struct RefundEscrow<'info> {
    #[account(mut)]
    pub founder: Signer<'info>,
    #[account(mut, has_one = founder @ EscrowError::UnauthorizedFounder)]
    pub escrow: Account<'info, Escrow>,
    /// CHECK: PDA used only as a native SOL vault. It stores no data.
    #[account(mut, seeds = [VAULT_SEED, escrow.key().as_ref()], bump = escrow.vault_bump)]
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_refund_escrow(ctx: Context<RefundEscrow>) -> Result<()> {
    require_funded(ctx.accounts.escrow.status)?;

    let now = Clock::get()?.unix_timestamp;
    require!(
        now >= ctx.accounts.escrow.deadline_unix,
        EscrowError::DeadlineNotReached
    );

    let refund_amount = ctx.accounts.escrow.total_amount_lamports;
    require!(
        ctx.accounts.vault.lamports() >= refund_amount,
        EscrowError::InsufficientVaultFunds
    );

    transfer_from_vault(&ctx, refund_amount)?;
    ctx.accounts.escrow.status = EscrowStatus::Refunded;

    Ok(())
}

fn require_funded(status: EscrowStatus) -> Result<()> {
    match status {
        EscrowStatus::Funded => Ok(()),
        EscrowStatus::Released => err!(EscrowError::AlreadyReleased),
        EscrowStatus::Refunded => err!(EscrowError::AlreadyRefunded),
    }
}

fn transfer_from_vault<'info>(ctx: &Context<RefundEscrow<'info>>, lamports: u64) -> Result<()> {
    let escrow_key = ctx.accounts.escrow.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        VAULT_SEED,
        escrow_key.as_ref(),
        &[ctx.accounts.escrow.vault_bump],
    ]];
    let cpi_accounts = anchor_lang::system_program::Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.founder.to_account_info(),
    };
    let cpi_ctx =
        CpiContext::new_with_signer(anchor_lang::system_program::ID, cpi_accounts, signer_seeds);

    anchor_lang::system_program::transfer(cpi_ctx, lamports)
}
