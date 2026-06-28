import { MousePointerClick } from 'lucide-react';

export default function TriggerNode() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <MousePointerClick className="w-12 h-12 text-white" strokeWidth={1.4} />
      <p className="text-[12px] text-neutral-500 leading-snug max-w-[220px]">
        No configuration needed — rename it above and run the workflow from the canvas.
      </p>
    </div>
  );
}
