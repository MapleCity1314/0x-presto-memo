"use client";

import { useAccount, useConnect, useDisconnect, useReadContract } from "wagmi";

const memoAbi = [
  {
    type: "function",
    name: "messageCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getMessage",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [
      { name: "", type: "string" },
      { name: "", type: "uint40" },
    ],
  },
] as const;

const contractAddress = (process.env.NEXT_PUBLIC_MEMO_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export default function OnchainPreview() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data } = useReadContract({
    address: contractAddress,
    abi: memoAbi,
    functionName: "messageCount",
    query: {
      enabled:
        contractAddress !== "0x0000000000000000000000000000000000000000",
    },
  });

  const injectedConnector = connectors[0];
  const contractReady =
    contractAddress !== "0x0000000000000000000000000000000000000000";

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.55)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Live Onchain Preview
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            Read the /0xMemo contract
          </h3>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
          Wagmi + Viem
        </span>
      </div>

      <div className="mt-6 space-y-4 rounded-2xl border border-slate-200/70 bg-white/70 p-4">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Messages onchain</span>
          <span className="font-medium text-slate-900">
            {contractReady ? data?.toString() ?? "—" : "Set ENV"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="rounded-full border border-slate-200 px-3 py-1">
            {contractReady ? "Sepolia" : "Set NEXT_PUBLIC_MEMO_CONTRACT_ADDRESS"}
          </span>
          <span className="rounded-full border border-slate-200 px-3 py-1">
            ABI: Memo.sol
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {isConnected ? (
          <>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
              onClick={() => disconnect()}
            >
              Disconnect
            </button>
            <span className="text-xs text-slate-500">
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </span>
          </>
        ) : (
          <button
            type="button"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() =>
              injectedConnector
                ? connect({ connector: injectedConnector })
                : undefined
            }
            disabled={!injectedConnector || isPending}
          >
            {isPending ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>
    </div>
  );
}
