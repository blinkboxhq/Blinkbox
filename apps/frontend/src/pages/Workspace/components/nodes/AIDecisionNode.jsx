import { useState } from "react";
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

export default function AIDecisionNode({ config = {}, updateConfig, nodeId }) {
  const provider = config.provider || "openai";
  const options = config.options ? (Array.isArray(config.options) ? config.options : [config.options]) : ["Option A", "Option B"];
  const criteria = config.criteria ? (Array.isArray(config.criteria) ? config.criteria : []) : [];

  const updateOption = (i, val) => {
    const updated = [...options];
    updated[i] = val;
    updateConfig("options", updated);
  };

  const addOption = () => updateConfig("options", [...options, `Option ${String.fromCharCode(65 + options.length)}`]);
  const removeOption = (i) => updateConfig("options", options.filter((_, idx) => idx !== i));

  const updateCriterion = (i, field, val) => {
    const updated = criteria.map((c, idx) => idx === i ? { ...c, [field]: val } : c);
    updateConfig("criteria", updated);
  };

  const addCriterion = () => updateConfig("criteria", [...criteria, { name: "Criterion", description: "", weight: 5 }]);
  const removeCriterion = (i) => updateConfig("criteria", criteria.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-indigo-400">AI Decision Engine</span>
          <span className="text-[10px] text-zinc-500">Multi-factor decisions with full reasoning trace</span>
        </div>
      </div>

      <CredentialPicker
        value={config.credentialId || ""}
        onChange={(id) => updateConfig("credentialId", id)}
        accentColor="indigo"
        label="API Key"
        placeholder="Select OpenAI or Anthropic credential..."
      />

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Scenario / Context</label>
        <SmartVariableInput
          value={config.scenario || ""}
          onChange={(v) => updateConfig("scenario", v)}
          placeholder="Describe the decision situation — e.g. 'Should we approve this expense request?'"
          multiline
          nodeId={nodeId}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Options to Evaluate</label>
          {options.length < 10 && (
            <button onClick={addOption} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold">+ Add Option</button>
          )}
        </div>
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2 items-center">
            <SmartVariableInput
              value={opt}
              onChange={(v) => updateOption(i, v)}
              placeholder={`Option ${i + 1}`}
              nodeId={nodeId}
              className="flex-1"
            />
            {options.length > 2 && (
              <button onClick={() => removeOption(i)} className="text-zinc-600 hover:text-red-400 text-xs px-1">✕</button>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Evaluation Criteria</label>
          <button onClick={addCriterion} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold">+ Add Criterion</button>
        </div>
        {criteria.length === 0 && (
          <span className="text-[10px] text-zinc-600 italic">No criteria — decision based on general fitness</span>
        )}
        {criteria.map((c, i) => (
          <div key={i} className="p-3 bg-[#0d0d0d] border border-[#222] rounded-lg flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <input
                value={c.name || ""}
                onChange={(e) => updateCriterion(i, "name", e.target.value)}
                placeholder="Criterion name"
                className="flex-1 bg-transparent border-b border-[#333] pb-1 text-xs text-white focus:outline-none focus:border-indigo-500/40"
              />
              <button onClick={() => removeCriterion(i)} className="text-zinc-600 hover:text-red-400 text-xs">✕</button>
            </div>
            <input
              value={c.description || ""}
              onChange={(e) => updateCriterion(i, "description", e.target.value)}
              placeholder="Description (optional)"
              className="w-full bg-transparent text-[10px] text-zinc-400 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-600">Weight:</span>
              <input
                type="range" min="1" max="10" step="1"
                value={c.weight ?? 5}
                onChange={(e) => updateCriterion(i, "weight", parseInt(e.target.value))}
                className="flex-1 accent-indigo-500"
              />
              <span className="text-[9px] text-indigo-400 w-4">{c.weight ?? 5}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Rules & Constraints</label>
        <SmartVariableInput
          value={config.rules || ""}
          onChange={(v) => updateConfig("rules", v)}
          placeholder="Budget must be under $10k. Must comply with GDPR."
          multiline
          nodeId={nodeId}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Additional Data (JSON)</label>
        <SmartVariableInput
          value={config.data || ""}
          onChange={(v) => updateConfig("data", v)}
          placeholder="{{upstream.formData}} or any structured context"
          multiline
          nodeId={nodeId}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Provider</label>
          <select
            value={provider}
            onChange={(e) => updateConfig("provider", e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/40"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model</label>
          <input
            value={config.model || (provider === "anthropic" ? "claude-3-5-sonnet-20241022" : "gpt-4o-mini")}
            onChange={(e) => updateConfig("model", e.target.value)}
            placeholder={provider === "anthropic" ? "claude-3-5-sonnet-20241022" : "gpt-4o-mini"}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500/40"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Temperature</label>
        <input
          type="range" min="0" max="1" step="0.05"
          value={config.temperature ?? 0.1}
          onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))}
          className="accent-indigo-500"
        />
        <span className="text-[9px] text-zinc-600 text-center">{config.temperature ?? 0.1} — Low = consistent, High = creative</span>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Output Format</label>
        <div className="grid grid-cols-3 gap-2">
          {[{ id: "full", label: "Full" }, { id: "decision_only", label: "Decision Only" }, { id: "scores_only", label: "Scores Only" }].map((f) => (
            <button
              key={f.id}
              onClick={() => updateConfig("outputFormat", f.id)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                (config.outputFormat || "full") === f.id
                  ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
