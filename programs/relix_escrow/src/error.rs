use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("Job id is required and must fit in the escrow account.")]
    InvalidJobId,
    #[msg("Total amount must be greater than zero.")]
    InvalidTotalAmount,
    #[msg("Fee basis points cannot exceed the Relix escrow cap.")]
    FeeTooHigh,
    #[msg("Specialist amount must be greater than zero.")]
    SpecialistAmountZero,
    #[msg("Specialist wallet cannot be the default public key.")]
    InvalidSpecialistWallet,
    #[msg("Treasury wallet cannot be the default public key.")]
    InvalidTreasuryWallet,
    #[msg("Escrow math overflowed.")]
    MathOverflow,
    #[msg("Only the escrow founder can perform this action.")]
    UnauthorizedFounder,
    #[msg("Escrow was already released.")]
    AlreadyReleased,
    #[msg("Escrow was already refunded.")]
    AlreadyRefunded,
    #[msg("Refund is only available after the escrow deadline.")]
    DeadlineNotReached,
    #[msg("Vault does not hold enough lamports for this escrow.")]
    InsufficientVaultFunds,
    #[msg("Vault already holds lamports before escrow initialization.")]
    VaultAlreadyFunded,
    #[msg("Specialist account does not match this escrow.")]
    InvalidSpecialistAccount,
    #[msg("Treasury account does not match this escrow.")]
    InvalidTreasuryAccount,
}
