import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

export default function PostgresNode({ config = {}, updateConfig }) {
  const op = config.operation || "query";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#336791]/10 border border-[#336791]/30 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#5B9BD5]">PostgreSQL</span>
          <span className="text-[10px] text-zinc-500">Execute raw SQL queries</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { value: "query",   label: "SELECT (query)" },
            { value: "execute", label: "Write (execute)" },
            { value: "batch",   label: "Batch (transaction)" },
          ].map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${op === o.value ? "bg-[#336791]/20 border-[#5B9BD5]/40 text-[#5B9BD5]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {op !== "batch" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">SQL</label>
            <SmartVariableInput
              value={config.sql || ""}
              onChange={(v) => updateConfig("sql", v)}
              placeholder={op === "query" ? "SELECT * FROM users WHERE id = $1" : "UPDATE users SET name = $1 WHERE id = $2"}
              multiline
            />
            <p className="text-[10px] text-zinc-600">Use $1, $2, ... for parameterized queries</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Parameters (JSON array)</label>
            <SmartVariableInput
              value={typeof config.params === "string" ? config.params : (config.params ? JSON.stringify(config.params) : "")}
              onChange={(v) => updateConfig("params", v)}
              placeholder='["{{n1.userId}}"]'
            />
          </div>

          {op === "query" && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Row Limit</label>
              <input type="number" min="1" max="10000" value={config.rowLimit || 1000}
                onChange={(e) => updateConfig("rowLimit", Number(e.target.value))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#5B9BD5]/40" />
            </div>
          )}
        </>
      )}

      {op === "batch" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Statements (JSON array)</label>
          <SmartVariableInput
            value={typeof config.statements === "string" ? config.statements : (config.statements ? JSON.stringify(config.statements) : "")}
            onChange={(v) => updateConfig("statements", v)}
            placeholder='["INSERT INTO logs (msg) VALUES ($1)", "UPDATE counters SET n = n + 1"]'
            multiline
          />
          <p className="text-[10px] text-zinc-600">Array of SQL strings or {"{ sql, params }"} objects. All run in one transaction.</p>
        </div>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="PostgreSQL Connection String" placeholder="Select Postgres credential..." />
      <p className="text-[10px] text-zinc-600 -mt-3">Store as: postgresql://user:pass@host:5432/dbname</p>
    </div>
  );
}
