"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useReadContract,
  useReadContracts,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/getErrorMessage";

// ABI 精简：通过 getMessage(index) 读取列表
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
  const readErrorShownRef = useRef(false);
  const pendingToastIdRef = useRef<string | number | null>(null);
  const listErrorShownRef = useRef(false);

  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isConfirmError,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
    query: { enabled: Boolean(txHash) },
  });

  const contractReady =
    contractAddress !== "0x0000000000000000000000000000000000000000";
  const isOnSepolia = chainId === sepolia.id;
  const injectedConnector = connectors[0];

  useEffect(() => {
    if (isConfirmError && confirmError) {
      if (pendingToastIdRef.current) {
        toast.dismiss(pendingToastIdRef.current);
        pendingToastIdRef.current = null;
      }
      toast.error("交易确认失败", { description: getErrorMessage(confirmError) });
    }
  }, [isConfirmError, confirmError]);

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
  const pageSize = 8;
  const startIndex = Math.max(0, total - pageSize);
  const indices = total > 0 ? Array.from({ length: total - startIndex }, (_, i) => startIndex + i) : [];

  const messagesQuery = useReadContracts({
    contracts: indices.map((index) => ({
      address: contractAddress,
      abi: memoAbi,
      functionName: "getMessage",
      args: [BigInt(index)],
    })),
    query: {
      enabled: contractReady && indices.length > 0,
      retry: false,
      refetchInterval: 12000,
    },
  });
  const refetchMessages = messagesQuery.refetch;

  useEffect(() => {
    if (!contractReady) {
      readErrorShownRef.current = false;
      listErrorShownRef.current = false;
      return;
    }
    if (countQuery.isError && countQuery.error && !readErrorShownRef.current) {
      readErrorShownRef.current = true;
      toast.error("读取合约状态失败", {
        description: getErrorMessage(countQuery.error),
      });
    }
    if (!countQuery.isError) {
      readErrorShownRef.current = false;
    }
    if (messagesQuery.isError && messagesQuery.error && !listErrorShownRef.current) {
      listErrorShownRef.current = true;
      toast.error("读取留言失败", {
        description: getErrorMessage(messagesQuery.error),
      });
    }
    if (!messagesQuery.isError) {
      listErrorShownRef.current = false;
    }
  }, [
    contractReady,
    countQuery.isError,
    countQuery.error,
    messagesQuery.isError,
    messagesQuery.error,
  ]);

  useEffect(() => {
    if (isSuccess) {
      setMessage("");
      // 这里的清空 hash 可以延迟一点，让用户看到成功状态
      // setTxHash(null); 
      countQuery.refetch();
      refetchMessages();
    }
  }, [isSuccess, countQuery, refetchMessages]);

  useEffect(() => {
    if (indices.length > 0) {
      refetchMessages();
    }
  }, [total, indices.length, refetchMessages]);

  useEffect(() => {
    if (!txHash) return;

    const shortHash = `${txHash.slice(0, 10)}...${txHash.slice(-8)}`;
    const id = toast.loading("交易已提交，等待链上确认…", {
      description: shortHash,
    });
    pendingToastIdRef.current = id;

    const timeoutMs = 90_000;
    const timeoutId = setTimeout(() => {
      // 如果还在确认中，提示一次“可能超时”，并引导用户去区块浏览器查看
      toast.warning("交易确认时间较长", {
        description: `可在区块浏览器查看：${shortHash}`,
      });
    }, timeoutMs);

    return () => {
      clearTimeout(timeoutId);
      toast.dismiss(id);
      if (pendingToastIdRef.current === id) {
        pendingToastIdRef.current = null;
      }
    };
  }, [txHash]);

  useEffect(() => {
    if (!isSuccess || !txHash) return;
    if (pendingToastIdRef.current) {
      toast.dismiss(pendingToastIdRef.current);
      pendingToastIdRef.current = null;
    }
    toast.success("交易已确认", {
      description: `${txHash.slice(0, 10)}...${txHash.slice(-8)}`,
    });
  }, [isSuccess, txHash]);

  const buttonText = useMemo(() => {
    if (!isConnected) return "请先连接钱包";
    if (!isOnSepolia) return isSwitchingChain ? "切换网络中..." : "切换到 Sepolia";
    if (isWriting) return "请求钱包签名...";
    if (isConfirming) return "链上确认中...";
    return "刻录到链上";
  }, [isConnected, isOnSepolia, isSwitchingChain, isWriting, isConfirming]);

  async function handleConnect() {
    if (!injectedConnector) {
      toast.error("未检测到浏览器钱包", { description: "请安装/启用 MetaMask 或 Rabby" });
      return;
    }
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
  }

  async function handleSubmit() {
    if (!contractReady) {
      toast.error("合约未配置", { description: "请先设置 NEXT_PUBLIC_MEMO_CONTRACT_ADDRESS" });
      return;
    }
    if (!isConnected) {
      toast.error("请先连接钱包");
      return;
    }
    if (!message.trim()) {
      toast.warning("内容不能为空");
      return;
    }

    try {
      if (!isOnSepolia) {
        const p = switchChainAsync({ chainId: sepolia.id });
        toast.promise(p, {
          loading: "请求切换到 Sepolia…",
          success: "已切换到 Sepolia",
          error: (e) => getErrorMessage(e),
        });
        await p;
        return;
      }
      const p = writeContractAsync({
        address: contractAddress,
        abi: memoAbi,
        functionName: "postMessage",
        args: [message.trim()],
      });
      toast.promise(p, {
        loading: "请在钱包中确认交易…",
        success: "交易已发送",
        error: (e) => getErrorMessage(e),
      });
      const hash = await p;
      setTxHash(hash);
    } catch (error) {
      console.error(error);
      // toast.promise 已处理
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
              合约未配置
            </span>
          )}
          {isConnected && contractReady && !isOnSepolia && (
            <span className="hidden text-xs font-medium text-amber-600 md:block">
              当前网络不是 Sepolia（chainId: {chainId}）
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
              onClick={handleConnect}
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
              disabled={!isConnected || isWriting || isConfirming || isSwitchingChain}
              className="min-h-[160px] w-full resize-none rounded-2xl bg-white p-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder={isConnected ? "写点什么..." : "请先连接钱包以开始留言"}
            />
            
            <div className="flex items-center justify-between px-4 pb-3 pt-2">
              <span className={`text-xs ${message.length >= MAX_MESSAGE_LENGTH ? 'text-red-500' : 'text-slate-300'}`}>
                {message.length} / {MAX_MESSAGE_LENGTH}
              </span>
              
              <button
                onClick={handleSubmit}
                disabled={
                  !contractReady ||
                  !isConnected ||
                  !message.trim() ||
                  isWriting ||
                  isConfirming ||
                  isSwitchingChain
                }
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

          {/* 留言列表 */}
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">最新留言</h2>
              <span className="text-xs text-slate-400">
                显示最近 {Math.min(pageSize, total)} 条
              </span>
            </div>

            {!contractReady && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                合约未配置，无法读取留言。
              </div>
            )}
            {contractReady && total === 0 && (
              <div className="mt-4 text-sm text-slate-400">暂无留言。</div>
            )}
            {contractReady && messagesQuery.isError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                读取失败：{getErrorMessage(messagesQuery.error)}
              </div>
            )}
            {contractReady && messagesQuery.isLoading && (
              <div className="mt-4 text-sm text-slate-400">加载中…</div>
            )}
            {contractReady && !messagesQuery.isLoading && !messagesQuery.isError && indices.length > 0 && (
              <div className="mt-4 space-y-4">
                {messagesQuery.data
                  ?.map((item, idx) => {
                    const result = item?.result as [string, `0x${string}`, bigint] | undefined;
                    if (!result) return null;
                    const [text, author, timestamp] = result;
                    const timeMs = Number(timestamp) * 1000;
                    const timeLabel = Number.isFinite(timeMs)
                      ? new Date(timeMs).toLocaleString()
                      : "未知时间";
                    return {
                      index: indices[idx],
                      text,
                      author,
                      timeLabel,
                    };
                  })
                  .filter(Boolean)
                  .reverse()
                  .map((entry) => (
                    <div key={`msg-${entry?.index}`} className="rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3">
                      <p className="text-sm text-slate-900">{entry?.text}</p>
                      <div className="mt-2 text-xs text-slate-400">
                        #{entry?.index} · {entry?.author?.slice(0, 6)}…{entry?.author?.slice(-4)} · {entry?.timeLabel}
                      </div>
                    </div>
                  ))}
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
