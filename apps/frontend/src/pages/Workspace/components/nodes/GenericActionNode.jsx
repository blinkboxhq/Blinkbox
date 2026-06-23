export default function GenericActionNode({ config = {}, updateConfig }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-3">
        <span className="text-zinc-400 text-lg">⚙</span>
      </div>
      <p className="text-[13px] font-semibold text-zinc-300">Coming Soon</p>
      <p className="text-[11px] text-zinc-600 mt-1">Configuration panel in development</p>
    </div>
  );
}
