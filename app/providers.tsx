"use client";

import {
  ConnectionProvider,
  WalletProvider
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo, type ReactNode } from "react";

export const devnetEndpoint =
  clusterApiUrl("devnet");

export function Providers({ children }: { children: ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={devnetEndpoint}>
      <WalletProvider autoConnect wallets={wallets}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
