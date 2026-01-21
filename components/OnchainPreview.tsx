"use client";

import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/getErrorMessage";
import { useEffect, useRef } from "react";

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
      { name: "", type: "address" },
      { name: "", type: "uint40" },
    ],
  },
] as const;

const contractAddress = (process.env.NEXT_PUBLIC_MEMO_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export default function OnchainPreview() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const readErrorShownRef = useRef(false);
  const {
    data,
    isError: isReadError,
    error: readError,
  } = useReadContract({
    address: contractAddress,
    abi: memoAbi,
    functionName: "messageCount",
    query: {
      enabled:
        contractAddress !== "0x0000000000000000000000000000000000000000",
      retry: false,
    },
  });

  const injectedConnector = connectors[0];
  const contractReady =
    contractAddress !== "0x0000000000000000000000000000000000000000";
  const isOnSepolia = chainId === sepolia.id;

  useEffect(() => {
    if (!contractReady) {
      readErrorShownRef.current = false;
      return;
    }
    if (isReadError && readError && !readErrorShownRef.current) {
      readErrorShownRef.current = true;
      toast.error("读取合约状态失败", {
        description: getErrorMessage(readError),
      });
    }
    if (!isReadError) {
      readErrorShownRef.current = false;
    }
  }, [contractReady, isReadError, readError]);

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
            {contractReady ? (isReadError ? "读取失败" : data?.toString() ?? "—") : "Set ENV"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="rounded-full border border-slate-200 px-3 py-1">
            {contractReady ? "Sepolia" : "Set NEXT_PUBLIC_MEMO_CONTRACT_ADDRESS"}
          </span>
          {isConnected && !isOnSepolia && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
              Wrong chainId: {chainId} (need {sepolia.id})
            </span>
          )}
          <span className="rounded-full border border-slate-200 px-3 py-1">
            ABI: Memo.sol
          </span>
        </div>
        {contractReady && isReadError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            读取失败：{getErrorMessage(readError)}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {isConnected ? (
          <>
            {!isOnSepolia && (
              <button
                type="button"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={async () => {
                  try {
                    const p = switchChainAsync({ chainId: sepolia.id });
                    toast.promise(p, {
                      loading: "请求切换到 Sepolia…",
                      success: "已切换到 Sepolia",
                      error: (e) => getErrorMessage(e),
                    });
                    await p;
                  } catch {
                    // toast.promise 已处理
                  }
                }}
                disabled={isSwitchingChain}
              >
                {isSwitchingChain ? "Switching..." : "Switch to Sepolia"}
              </button>
            )}
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
            onClick={async () => {
              if (!injectedConnector) return;
              try {
                const p = connectAsync({ connector: injectedConnector, chainId: sepolia.id });
                toast.promise(p, {
                  loading: "连接钱包中…",
                  success: "钱包已连接",
                  error: (e) => getErrorMessage(e),
                });
                await p;
              } catch {
                // toast.promise 已处理
              }
            }}
            disabled={!injectedConnector || isPending}
          >
            {isPending ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>
    </div>
  );
}
