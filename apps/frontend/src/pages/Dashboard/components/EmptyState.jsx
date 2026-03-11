import { Plus } from 'lucide-react';

export default function EmptyState({ onDeploy, isSearch }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-neutral-900 flex items-center justify-center mb-4">
        <Plus className="w-5 h-5 text-neutral-600" />
      </div>
      <h3 className="text-sm font-semibold text-neutral-300 mb-1">
        {isSearch ? 'No matching workflows' : 'No workflows yet'}
      </h3>
      <p className="text-xs text-neutral-600 max-w-xs mb-6">
        {isSearch
          ? 'Try a different search term.'
          : 'Create your first workflow to start automating.'}
      </p>
      {!isSearch && (
        <button
          onClick={onDeploy}
          className="flex items-center gap-1.5 px-4 py-2 bg-white text-black text-xs font-semibold rounded-lg hover:bg-neutral-200 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Create Workflow
        </button>
      )}
    </div>
  );
}
