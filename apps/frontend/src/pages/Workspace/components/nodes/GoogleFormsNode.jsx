import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "getForm",       label: "Get Form" },
  { value: "listResponses", label: "List Responses" },
  { value: "getResponse",   label: "Get Response" },
  { value: "createForm",    label: "Create Form" },
  { value: "addQuestion",   label: "Add Question" },
];

const QUESTION_TYPES = [
  { value: "TEXT",           label: "Short Text" },
  { value: "PARAGRAPH_TEXT", label: "Long Text" },
  { value: "MULTIPLE_CHOICE",label: "Multiple Choice" },
  { value: "CHECKBOX",       label: "Checkbox" },
  { value: "DROPDOWN",       label: "Dropdown" },
  { value: "SCALE",          label: "Linear Scale" },
  { value: "DATE",           label: "Date" },
];

export default function GoogleFormsNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "listResponses";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#673AB7]/10 border border-[#673AB7]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#673AB7">
            <path d="M20 3H4a1 1 0 00-1 1v16a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8H10v-2h8v2zm0-4H10v-2h8v2zm0-4H10V7h8v2z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">Google Forms</div>
          <div className="text-[11px] text-zinc-500">Forms, responses, questions</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#673AB7]/10 border-[#673AB7]/40 text-[#673AB7]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["getForm","listResponses","getResponse","addQuestion"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Form ID</label>
          <SmartVariableInput value={config.formId || ""} onChange={(v) => updateConfig("formId", v)} placeholder="From Google Forms URL" />
        </div>
      )}

      {op === "getResponse" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Response ID</label>
          <SmartVariableInput value={config.responseId || ""} onChange={(v) => updateConfig("responseId", v)} placeholder="{{ $json.responseId }}" />
        </div>
      )}

      {op === "listResponses" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Page Size</label>
            <SmartVariableInput value={config.pageSize || "50"} onChange={(v) => updateConfig("pageSize", v)} placeholder="50" />
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <p className="text-[12px] font-semibold text-zinc-300">Include questions in output</p>
            <button onClick={() => updateConfig("includeQuestions", !config.includeQuestions)}
              className={`w-10 h-5 rounded-full border transition-all relative ${config.includeQuestions ? "bg-[#673AB7] border-purple-400" : "bg-zinc-700 border-zinc-600"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.includeQuestions ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        </>
      )}

      {op === "createForm" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Form Title</label>
            <SmartVariableInput value={config.title || ""} onChange={(v) => updateConfig("title", v)} placeholder="Customer Feedback Survey" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Description (optional)</label>
            <SmartVariableInput value={config.description || ""} onChange={(v) => updateConfig("description", v)} placeholder="Please answer a few quick questions." />
          </div>
        </>
      )}

      {op === "addQuestion" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Question Type</label>
            <div className="grid grid-cols-2 gap-1">
              {QUESTION_TYPES.map((t) => (
                <button key={t.value} onClick={() => updateConfig("questionType", t.value)}
                  className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold transition-all ${(config.questionType||"TEXT") === t.value ? "bg-[#673AB7]/10 border-[#673AB7]/40 text-[#673AB7]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Question Text</label>
            <SmartVariableInput value={config.questionText || ""} onChange={(v) => updateConfig("questionText", v)} placeholder="What is your biggest challenge?" />
          </div>
          {["MULTIPLE_CHOICE","CHECKBOX","DROPDOWN"].includes(config.questionType) && (
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Options (one per line)</label>
              <SmartVariableInput value={config.options || ""} onChange={(v) => updateConfig("options", v)} placeholder={"Option A\nOption B\nOption C"} multiline />
            </div>
          )}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <p className="text-[12px] font-semibold text-zinc-300">Required</p>
            <button onClick={() => updateConfig("required", !config.required)}
              className={`w-10 h-5 rounded-full border transition-all relative ${config.required ? "bg-[#673AB7] border-purple-400" : "bg-zinc-700 border-zinc-600"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${config.required ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="violet" label="Google OAuth" placeholder="Select Google credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">formId, responses[ ], answers, respondentEmail</span>
      </div>
    </div>
  );
}
