import { useState, useRef, useEffect } from 'react';
import { Braces } from 'lucide-react';
import useWorkspaceStore from '../../../../store/workspaceStore';

export default function VariableInput({ label, value, onChange, placeholder, type = "text", className = "" }) {
  const [showPicker, setShowPicker] = useState(false);
  const dropdownRef = useRef(null);
  
  // 🧠 Talk to the brain to get the nodes
  const nodes = useWorkspaceStore(state => state.nodes);

  // Close the dropdown if they click anywhere else on the screen
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🕵️‍♂️ Auto-detect available variables from the Trigger Node
  let availableVars = [];
  try {
    const triggerNode = nodes.find(n => n.data?.type === 'trigger');
    if (triggerNode?.data?.config?.mockPayload) {
      const payload = JSON.parse(triggerNode.data.config.mockPayload);
      availableVars = Object.keys(payload); // Get all the keys like "email", "target_url"
    }
  } catch (e) {
    // If the JSON is invalid, just leave the array empty
  }

  // Inject the backend syntax perfectly so the user doesn't have to type it
  const handleInsert = (varName) => {
    const insertion = `{{ $json.${varName} }}`;
    // If there's already text, append it. Otherwise, set it.
    const newValue = value ? `${value}${insertion}` : insertion;
    onChange(newValue);
    setShowPicker(false);
  };

  return (
    <div className="flex flex-col gap-1.5 relative w-full">
      {label && <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>}
      
      <div className="relative flex items-center">
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-[#0a0a0a] border border-[#222] rounded-lg pl-3 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono shadow-inner ${className}`}
        />
        
        {/* The Magic Variable Button */}
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className={`absolute right-2 p-1.5 rounded transition-all ${showPicker ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-blue-400 hover:bg-blue-500/10'}`}
          title="Insert Variable"
        >
          <Braces className="w-4 h-4" />
        </button>
      </div>

      {/* The Visual Dropdown */}
      {showPicker && (
        <div ref={dropdownRef} className="absolute top-full mt-2 right-0 w-64 bg-[#111] border border-[#333] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 border-b border-[#222] bg-[#0a0a0a]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available Data</span>
          </div>
          <div className="max-h-48 overflow-y-auto p-1.5">
            {availableVars.length === 0 ? (
              <div className="p-3 text-xs text-slate-500 text-center leading-relaxed">
                No variables found.<br/>Add mock JSON to your Trigger node.
              </div>
            ) : (
              availableVars.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleInsert(v)}
                  className="w-full text-left px-3 py-2 text-xs text-blue-300 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg font-mono transition-colors flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
                  {v}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}