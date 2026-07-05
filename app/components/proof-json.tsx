"use client";

import { useState } from "react";

// The literal receipt object behind the rest of the proof page — copy/download
// only, no fetch. Everything in `json` is already public (wallets, tx
// signatures, bid content); nothing here is a secret.
export function ProofJsonBlock({ json }: { json: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "relix-proof-receipt.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-[2rem] border hairline bg-white p-6 soft-shadow sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a1a1aa]">
            Raw proof JSON
          </p>
          <h3 className="mt-1 text-lg font-semibold text-[#18181b]">
            The exact receipt behind this page
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-full border hairline bg-white px-4 py-2 text-xs font-medium text-[#27272a] transition hover:border-[#0a0a0a]"
            onClick={() => void copy()}
            type="button"
          >
            {copied ? "Copied" : "Copy JSON"}
          </button>
          <button
            className="rounded-full bg-[#0a0a0a] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#27272a]"
            onClick={download}
            type="button"
          >
            Download
          </button>
        </div>
      </div>
      <pre className="mt-4 max-h-[480px] overflow-auto rounded-2xl bg-[#f4f4f5] p-4 text-xs leading-5 text-[#27272a]">
        {json}
      </pre>
    </div>
  );
}
