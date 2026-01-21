"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/getErrorMessage";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    toast.error("页面发生错误", { description: getErrorMessage(error) });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h2 className="text-xl font-semibold text-slate-900">页面出错了</h2>
      <p className="mt-2 text-sm text-slate-600">
        {getErrorMessage(error)}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        重试
      </button>
      {error.digest && (
        <p className="mt-4 text-xs text-slate-400">digest: {error.digest}</p>
      )}
    </div>
  );
}

