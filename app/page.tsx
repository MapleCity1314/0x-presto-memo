import MemoApp from "@/components/MemoApp";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full bg-slate-50 text-slate-900 selection:bg-slate-200">
      {/* 背景装饰：保留了氛围感，但调整得更柔和 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,_rgba(226,232,240,0.5),_rgba(248,250,252,0))]" />
        <div className="absolute top-[20%] right-[10%] h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,_rgba(241,245,249,0.8),_rgba(248,250,252,0))]" />
      </div>

      {/* 主体内容 */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <MemoApp />
      </div>
    </div>
  );
}