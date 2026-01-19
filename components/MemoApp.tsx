"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

// ABI 精简：移除了 getMessages
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
    name: "postMessage",
    stateMutability: "nonpayable",
    inputs: [{ name: "text", type: "string" }],
    outputs: [],
  },
] as const;

const contractAddress = (process.env.NEXT_PUBLIC_MEMO_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

const MAX_MESSAGE_LENGTH = 280;

export default function MemoApp() {
  const [message, setMessage] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
    query: { enabled: Boolean(txHash) },
  });

  const contractReady =
    contractAddress !== "0x0000000000000000000000000000000000000000";
  const injectedConnector = connectors[0];

  // 仅保留计数功能，用于显示系统状态
  const countQuery = useReadContract({
    address: contractAddress,
    abi: memoAbi,
    functionName: "messageCount",
    query: {
      enabled: contractReady,
      refetchInterval: 12000,
    },
  });
  const total = Number(countQuery.data ?? BigInt(0));

  useEffect(() => {
    if (isSuccess) {
      setMessage("");
      // 这里的清空 hash 可以延迟一点，让用户看到成功状态
      // setTxHash(null); 
      countQuery.refetch();
    }
  }, [isSuccess, countQuery]);

  const buttonText = useMemo(() => {
    if (!isConnected) return "请先连接钱包";
    if (isWriting) return "请求钱包签名...";
    if (isConfirming) return "链上确认中...";
    return "刻录到链上";
  }, [isConnected, isWriting, isConfirming]);

  async function handleSubmit() {
    if (!contractReady || !isConnected) return;
    if (!message.trim()) return;
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: memoAbi,
        functionName: "postMessage",
        args: [message.trim()],
      });
      setTxHash(hash);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <>
      {/* Header: 极简通栏 */}
      <header className="flex w-full items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-slate-900" />
          <span className="text-sm font-bold tracking-tight text-slate-900">
            0xMemo
          </span>
        </div>

        <div className="flex items-center gap-4">
          {!contractReady && (
            <span className="hidden text-xs font-medium text-amber-600 md:block">
              ⚠️ 合约未配置
            </span>
          )}
          
          {isConnected ? (
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1 shadow-sm">
              <span className="text-xs font-medium text-slate-600">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
              <button
                onClick={() => disconnect()}
                className="h-7 rounded-full bg-slate-100 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
              >
                断开
              </button>
            </div>
          ) : (
            <button
              onClick={() =>
                injectedConnector
                  ? connect({ connector: injectedConnector })
                  : undefined
              }
              disabled={isConnecting || !injectedConnector}
              className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {isConnecting ? "连接中..." : "连接钱包"}
            </button>
          )}
        </div>
      </header>

      {/* Main Content: 居中卡片 */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-20">
        <div className="w-full max-w-lg">
          
          {/* 标题区 */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tighter text-slate-900 md:text-4xl">
              Leave a mark.
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              当前已有 <span className="font-medium text-slate-900">{total}</span> 条留言被永久刻录在区块中。
            </p>
          </div>

          {/* 输入卡片 */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              disabled={!isConnected || isWriting || isConfirming}
              className="min-h-[160px] w-full resize-none rounded-2xl bg-white p-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder={isConnected ? "写点什么..." : "请先连接钱包以开始留言"}
            />
            
            <div className="flex items-center justify-between px-4 pb-3 pt-2">
              <span className={`text-xs ${message.length >= MAX_MESSAGE_LENGTH ? 'text-red-500' : 'text-slate-300'}`}>
                {message.length} / {MAX_MESSAGE_LENGTH}
              </span>
              
              <button
                onClick={handleSubmit}
                disabled={!contractReady || !isConnected || !message.trim() || isWriting || isConfirming}
                className="group relative inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-800 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
               {buttonText}
              </button>
            </div>

            {/* 成功状态遮罩层 */}
            {isSuccess && txHash && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm transition-all">
                 <div className="mb-2 h-10 w-10 rounded-full bg-green-100 p-2 text-green-600">
                   <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-full w-full">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                   </svg>
                 </div>
                 <p className="text-sm font-semibold text-slate-900">留言已上链</p>
                 <a 
                   href={`https://sepolia.etherscan.io/tx/${txHash}`} 
                   target="_blank" 
                   rel="noreferrer"
                   className="mt-2 text-xs text-slate-500 hover:text-slate-800 hover:underline"
                 >
                   查看 Hash &rarr;
                 </a>
                 <button 
                   onClick={() => setTxHash(null)}
                   className="mt-6 text-xs font-medium text-slate-400 hover:text-slate-600"
                 >
                   写下一条
                 </button>
               </div>
            )}
          </div>

          <div className="mt-6 text-center text-xs text-slate-400">
            去中心化存储 • 不可篡改 • 匿名发布
          </div>
        </div>
      </main>
    </>
  );
}