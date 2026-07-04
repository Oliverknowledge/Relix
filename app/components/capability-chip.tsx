import {
  isOnChainCapability,
  specialistCapabilityLabel
} from "@/app/lib/specialist-capabilities";

/**
 * A capability tag. On-chain capabilities (reward-ladders, prize-payouts) get a
 * distinct emerald "⛓ on-chain" treatment everywhere they appear, so a real
 * settlement is never mistaken for generated copy. `baseClassName` styles the
 * ordinary (content) chip to match its surrounding context.
 */
export function CapabilityChip({
  baseClassName,
  capability
}: {
  baseClassName: string;
  capability: string;
}) {
  if (isOnChainCapability(capability)) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-[#ecfdf5] px-2.5 py-1 text-[11px] font-semibold text-[#047857] ring-1 ring-inset ring-[#a7f3d0]"
        title="Settles real value on Solana devnet"
      >
        <span aria-hidden="true">⛓</span>
        {specialistCapabilityLabel(capability)}
        <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">
          on-chain
        </span>
      </span>
    );
  }

  return <span className={baseClassName}>{specialistCapabilityLabel(capability)}</span>;
}
