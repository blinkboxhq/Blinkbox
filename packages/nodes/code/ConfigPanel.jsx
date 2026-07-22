import { Terminal } from "lucide-react";
import Editor from "@monaco-editor/react";
import {
  ConfigSection, ConfigHeader, ConfigBadge, ConfigLabel, ConfigInput, ConfigBanner,
} from "@/components/ui/ConfigKit";

const VIOLET = "#a78bfa";

const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 12.5,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  lineNumbers: "on",
  scrollBeyondLastLine: false,
  padding: { top: 12, bottom: 12 },
  tabSize: 2,
  automaticLayout: true,
  wordWrap: "on",
  renderLineHighlight: "none",
  overviewRulerLanes: 0,
  scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
  fixedOverflowWidgets: true,
};

function defineTheme(monaco) {
  monaco.editor.defineTheme("bb-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#0f0f0f",
      "editorGutter.background": "#0f0f0f",
      "editorLineNumber.foreground": "#404040",
      "editorLineNumber.activeForeground": "#a78bfa",
      "editor.selectionBackground": "#a78bfa33",
      "editorCursor.foreground": "#a78bfa",
      "editorIndentGuide.background1": "#1e1e1e",
    },
  });
}

export default function CodeNode({ config = {}, updateConfig }) {
  const code    = config.code || "";
  const timeout = config.timeout !== undefined ? config.timeout : 1;

  return (
    <ConfigSection>
      <ConfigHeader
        icon={Terminal}
        iconColor={VIOLET}
        title="Run Code"
        subtitle="Execute sandboxed JavaScript — no filesystem or network access"
        badge={<ConfigBadge label="JS" tone="code" />}
      />

      <div className="flex flex-col">
        <ConfigLabel>JavaScript</ConfigLabel>
        <div className="bb-glow-border rounded-md border border-[#3b3b3b] overflow-hidden bg-[#0f0f0f] transition-colors focus-within:border-violet-500/50">
          <Editor
            height="240px"
            defaultLanguage="javascript"
            theme="bb-dark"
            value={code}
            beforeMount={defineTheme}
            onChange={(val) => updateConfig("code", val ?? "")}
            options={EDITOR_OPTIONS}
            loading={<div className="h-[240px] flex items-center justify-center text-[11px] text-neutral-600 font-mono">Loading editor…</div>}
          />
        </div>
      </div>

      <ConfigBanner>
        Read upstream data from the <span className="text-violet-300 mx-1">input</span> object — e.g. <span className="text-neutral-300 ml-1">input.email</span>
      </ConfigBanner>

      <ConfigBanner>
        Pass data on with <span className="text-violet-300 ml-1">return {"{ result: value }"}</span>
      </ConfigBanner>

      <ConfigInput
        label="Timeout"
        type="number"
        value={timeout}
        onChange={(v) => updateConfig("timeout", Math.min(5, Math.max(1, parseInt(v, 10) || 1)))}
        hint="Seconds — max 5"
      />
    </ConfigSection>
  );
}
