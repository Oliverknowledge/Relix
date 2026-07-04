pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("8dBQUA3ja6Z82oZ5C4qEmTg5CJ3jRtvnMb48h4vL1jgK");

#[program]
pub mod relix_escrow {
    use super::*;

    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        job_id: String,
        total_amount_lamports: u64,
        fee_bps: u16,
        deadline_unix: i64,
    ) -> Result<()> {
        crate::instructions::handle_initialize_escrow(
            ctx,
            job_id,
            total_amount_lamports,
            fee_bps,
            deadline_unix,
        )
    }

    pub fn release_escrow(ctx: Context<ReleaseEscrow>) -> Result<()> {
        crate::instructions::handle_release_escrow(ctx)
    }

    pub fn refund_escrow(ctx: Context<RefundEscrow>) -> Result<()> {
        crate::instructions::handle_refund_escrow(ctx)
    }
}
