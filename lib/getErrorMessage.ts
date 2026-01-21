type MaybeErrorObject = {
  name?: unknown;
  message?: unknown;
  shortMessage?: unknown;
  details?: unknown;
  cause?: unknown;
};

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

/**
 * Normalize wallet / wagmi / viem errors into a user-friendly Chinese message.
 * Keep this intentionally conservative (avoid leaking huge RPC payloads).
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return "未知错误";
  if (typeof error === "string") return error;

  if (error instanceof Error) {
    const msg = error.message?.trim();
    return msg || "发生错误";
  }

  const obj = error as MaybeErrorObject;
  const name = asString(obj?.name);
  const message = asString(obj?.message);
  const shortMessage = asString(obj?.shortMessage);
  const details = asString(obj?.details);

  const raw = shortMessage || message || details || "发生错误";
  const lower = raw.toLowerCase();

  // Common wallet / wagmi cases
  if (name === "UserRejectedRequestError") return "你已在钱包中取消了操作";
  if (lower.includes("user rejected") || lower.includes("rejected the request")) {
    return "你已在钱包中取消了操作";
  }
  if (lower.includes("insufficient funds")) return "余额不足，无法支付 gas（请在当前网络充值测试币）";
  if (lower.includes("intrinsic transaction cost")) return "余额不足，无法支付交易基础费用（gas）";
  if (lower.includes("chain") && lower.includes("not configured")) return "当前网络未配置（请切换到 Sepolia）";
  if (lower.includes("unsupported chain") || lower.includes("chain mismatch")) return "网络不匹配（请切换到 Sepolia）";
  if (lower.includes("timeout") || lower.includes("timed out")) return "请求超时（检查 RPC/网络后重试）";
  if (lower.includes("failed to fetch") || lower.includes("network error")) return "网络异常（检查 VPN/RPC 后重试）";

  // Contract reverts (keep original reason if present)
  return raw;
}

