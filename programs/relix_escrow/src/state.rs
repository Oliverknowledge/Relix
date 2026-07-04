use anchor_lang::prelude::*;

use crate::constants::MAX_JOB_ID_LEN;

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    #[max_len(MAX_JOB_ID_LEN)]
    pub job_id: String,
    pub founder: Pubkey,
    pub specialist: Pubkey,
    pub treasury: Pubkey,
    pub total_amount_lamports: u64,
    pub specialist_amount_lamports: u64,
    pub treasury_fee_lamports: u64,
    pub fee_bps: u16,
    pub deadline_unix: i64,
    pub status: EscrowStatus,
    pub created_at: i64,
    pub vault_bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum EscrowStatus {
    Funded,
    Released,
    Refunded,
}
