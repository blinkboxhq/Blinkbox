export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`}
    />
  );
}

export function NodeCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
        <Skeleton className="w-6 h-3.5 rounded-full shrink-0" />
      </div>
      <Skeleton className="h-px w-full opacity-50" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-2.5 w-12" />
      </div>
    </div>
  );
}
