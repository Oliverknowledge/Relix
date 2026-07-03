"use client";

import {
  WalletReadyState,
  type WalletName
} from "@solana/wallet-adapter-base";
import {
  useConnection,
  useWallet
} from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { FAUCET_URL, LOW_BALANCE_SOL } from "@/app/lib/wallet";

const PHANTOM_DOWNLOAD_URL = "https://phantom.com/download";

export function AppNav() {
  const pathname = usePathname();
  const { connection } = useConnection();
  const {
    wallets,
    wallet,
    publicKey,
    connected,
    connecting,
    select,
    connect,
    disconnect
  } = useWallet();
  const [balanceSol, setBalanceSol] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingWalletName, setPendingWalletName] =
    useState<WalletName | null>(null);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const phantomWallet = wallets.find(
    ({ adapter }) => String(adapter.name) === "Phantom"
  );
  const phantomReadyState = phantomWallet?.adapter.readyState;
  const canConnectPhantom =
    phantomReadyState === WalletReadyState.Installed ||
    phantomReadyState === WalletReadyState.Loadable;
  const balanceIsLow =
    connected && balanceSol !== null && balanceSol < LOW_BALANCE_SOL;

  useEffect(() => {
    if (!publicKey) {
      const timer = window.setTimeout(() => {
        setBalanceSol(null);
      }, 0);

      return () => {
        window.clearTimeout(timer);
      };
    }

    let cancelled = false;

    connection
      .getBalance(publicKey, "confirmed")
      .then((lamports) => {
        if (!cancelled) {
          setBalanceSol(lamports / LAMPORTS_PER_SOL);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessage("Could not read devnet balance.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [connection, publicKey]);

  useEffect(() => {
    if (!pendingWalletName || wallet?.adapter.name !== pendingWalletName) {
      return;
    }

    let cancelled = false;

    connect()
      .then(() => {
        if (!cancelled) {
          setMessage(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : "Wallet connection failed."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPendingWalletName(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [connect, pendingWalletName, wallet?.adapter.name]);

  const selectWallet = (walletName: WalletName) => {
    setMessage(null);
    select(walletName);
    setPendingWalletName(walletName);
  };

  const requestDevnetSol = async () => {
    if (!publicKey || isAirdropping) {
      return;
    }

    setMessage(null);
    setIsAirdropping(true);

    try {
      const signature = await connection.requestAirdrop(
        publicKey,
        LAMPORTS_PER_SOL
      );
      const latestBlockhash = await connection.getLatestBlockhash("confirmed");

      await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        },
        "confirmed"
      );
      const lamports = await connection.getBalance(publicKey, "confirmed");
      setBalanceSol(lamports / LAMPORTS_PER_SOL);
      setMessage("Devnet SOL received.");
    } catch {
      setMessage("Airdrop unavailable. Use the devnet faucet link.");
    } finally {
      setIsAirdropping(false);
    }
  };

  return (
    <nav className="fixed inset-x-0 top-0 z-30 px-5 py-4 sm:px-8">
      <div className="mx-auto flex max-w-5xl items-start justify-between gap-4">
        <Link
          className="rounded-full bg-[#fbfbfa]/80 px-3 py-2 text-sm font-semibold tracking-[-0.02em] text-[#0a0a0a] backdrop-blur transition hover:text-[#52525b]"
          href="/"
        >
          Relix
        </Link>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <NavLink active={pathname === "/marketplace"} href="/marketplace">
              Marketplace
            </NavLink>
            <NavLink active={pathname === "/publish"} href="/publish">
              Publish
            </NavLink>

            {connected && publicKey ? (
              <div className="inline-flex max-w-full flex-wrap items-center justify-end gap-2 rounded-full border hairline bg-[#fbfbfa]/80 px-3 py-2 text-xs text-[#52525b] shadow-sm backdrop-blur">
                <span>Devnet</span>
                <span className="h-1 w-1 rounded-full bg-[#d4d4d8]" />
                <span>
                  {balanceSol === null ? "..." : `${formatBalance(balanceSol)} SOL`}
                </span>
                <span className="h-1 w-1 rounded-full bg-[#d4d4d8]" />
                <span>{shortAddress(publicKey.toBase58())}</span>
                <button
                  className="ml-1 text-[#0a0a0a] transition hover:text-[#2563eb]"
                  onClick={() => void disconnect()}
                  type="button"
                >
                  Disconnect
                </button>
              </div>
            ) : phantomWallet && canConnectPhantom ? (
              <button
                className="rounded-full border hairline bg-[#fbfbfa]/80 px-3 py-2 text-xs font-medium text-[#0a0a0a] shadow-sm backdrop-blur transition hover:border-[#0a0a0a] disabled:opacity-50"
                disabled={connecting || pendingWalletName !== null}
                onClick={() => selectWallet(phantomWallet.adapter.name)}
                type="button"
              >
                {connecting || pendingWalletName !== null
                  ? "Connecting..."
                  : "Connect Phantom"}
              </button>
            ) : (
              <a
                className="rounded-full border hairline bg-[#fbfbfa]/80 px-3 py-2 text-xs font-medium text-[#0a0a0a] shadow-sm backdrop-blur transition hover:border-[#0a0a0a]"
                href={PHANTOM_DOWNLOAD_URL}
                rel="noreferrer"
                target="_blank"
              >
                Get Phantom
              </a>
            )}
          </div>

          {balanceIsLow ? (
            <div className="flex flex-wrap justify-end gap-2 text-xs">
              <button
                className="rounded-full bg-[#0a0a0a] px-3 py-2 font-medium text-white transition hover:bg-[#27272a] disabled:opacity-50"
                disabled={isAirdropping}
                onClick={() => void requestDevnetSol()}
                type="button"
              >
                {isAirdropping ? "Requesting..." : "Get devnet SOL"}
              </button>
              <a
                className="rounded-full border hairline bg-[#fbfbfa]/80 px-3 py-2 font-medium text-[#52525b] shadow-sm backdrop-blur transition hover:border-[#0a0a0a] hover:text-[#0a0a0a]"
                href={FAUCET_URL}
                rel="noreferrer"
                target="_blank"
              >
                Faucet
              </a>
            </div>
          ) : null}

          {message ? (
            <p className="max-w-xs rounded-2xl bg-[#fbfbfa]/90 px-3 py-2 text-right text-xs leading-5 text-[#52525b] shadow-sm backdrop-blur">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  active,
  children,
  href
}: {
  active: boolean;
  children: ReactNode;
  href: string;
}) {
  return (
    <Link
      className={`rounded-full px-3 py-2 text-xs font-medium backdrop-blur transition ${
        active
          ? "bg-[#0a0a0a] text-white"
          : "bg-[#fbfbfa]/80 text-[#52525b] hover:text-[#0a0a0a]"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatBalance(value: number) {
  if (value < 0.001) {
    return value.toFixed(4);
  }

  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}
