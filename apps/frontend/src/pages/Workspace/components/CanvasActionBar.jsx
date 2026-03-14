import { motion } from "framer-motion";
import { Play, Save, Rocket, Loader2 } from "lucide-react";

export default function CanvasActionBar({ onSave, onTest, isSaving, isTesting }) {
  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full shadow-2xl">
        
        <button 
          onClick={onTest}
          disabled={isTesting}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50"
        >
          {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-blue-400" />}
          Test
        </button>

        <div className="w-px h-4 bg-zinc-700" /> {/* Divider */}

        <button 
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-emerald-400" />}
          Save
        </button>

        <button 
          className="ml-2 flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-black bg-white hover:bg-zinc-200 rounded-full transition-colors shadow-lg shadow-white/10"
        >
          <Rocket className="w-3.5 h-3.5" />
          Deploy
        </button>

      </div>
    </motion.div>
  );
}