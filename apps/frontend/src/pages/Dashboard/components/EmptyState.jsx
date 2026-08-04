import { Plus } from 'lucide-react';

export default function EmptyState({ onDeploy, isSearch }) {
  if (isSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-10 h-10 rounded-xl bb-card flex items-center justify-center mb-4">
          <Plus className="w-4 h-4 text-[var(--bb-text-lo)]" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--bb-text-mid)] mb-1">No matching workflows</h3>
        <p className="text-xs text-[var(--bb-text-lo)]">Try a different search term.</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="flex flex-col items-center text-center mb-9">
        <h3 className="text-[15px] font-semibold text-[var(--bb-text-hi)] mb-2">Start your first automation</h3>
        <p className="text-[12px] text-[var(--bb-text-lo)] max-w-sm mb-6 leading-relaxed">
          Start from a blank canvas and build your first workflow.
        </p>
        <button onClick={onDeploy} className="bb-btn bb-btn-primary flex items-center gap-1.5 px-4 py-2 text-[12px]">
          <Plus className="w-3.5 h-3.5" /> Blank workflow
        </button>
      </div>
    </div>
  );
}
