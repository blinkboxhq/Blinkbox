import { Brain, Clock, Database, Layers, Sparkles } from "lucide-react";
import CredentialPicker from "@/components/ui/CredentialPicker";
import {
  ConfigSection,
  ConfigHeader,
  ConfigInput,
  ConfigSelect,
  ConfigBanner,
} from "@/components/ui/ConfigKit";

const ACCENT = "#6f97e8";

const EMBEDDING_MODELS = [
  { value: "text-embedding-3-small", label: "text-embedding-3-small — fast, cheap" },
  { value: "text-embedding-3-large", label: "text-embedding-3-large — most accurate" },
  { value: "text-embedding-ada-002", label: "text-embedding-ada-002 — legacy" },
];

const MATCH_LEVELS = [
  { value: "0.5", label: "Broad — recalls loosely related things" },
  { value: "0.7", label: "Balanced — recommended" },
  { value: "0.85", label: "Exact — only near-identical matches" },
];

/**
 * One panel for every memory provider. `semantic` is the only real switch: it
 * decides whether each turn is also embedded into the vector store and recalled
 * by meaning. Every field below is one the backend actually reads.
 */
export default function makeAgentMemoryPanel({ label, logoUrl, imgFilter, semantic = false }) {
  return function AgentMemoryPanel({ config = {}, updateConfig }) {
    const num = (key, fallback) => String(config[key] ?? fallback);

    return (
      <div className="flex flex-col gap-4 p-4 bg-[#0d0d0f] min-h-full">
        <ConfigHeader
          icon={semantic ? Brain : Clock}
          logoUrl={logoUrl}
          imgFilter={imgFilter}
          iconColor={ACCENT}
          title={label}
          subtitle={semantic ? "Semantic memory — recalled by meaning" : "Conversation memory"}
        />

        <ConfigSection>
          <ConfigInput
            label="Session Name"
            icon={Layers}
            value={config.sessionName || ""}
            onChange={(v) => updateConfig("sessionName", v)}
            placeholder="agent-memory"
            hint="Memories are kept separate per session. Reuse a name to continue a thread."
          />

          <ConfigInput
            label="Messages To Remember"
            icon={Clock}
            type="number"
            value={num("windowSize", 20)}
            onChange={(v) => updateConfig("windowSize", parseInt(v, 10) || 20)}
            hint="Recent messages always given back to the agent."
          />
        </ConfigSection>

        {semantic && (
          <ConfigSection>
            <ConfigInput
              label="Memories To Keep"
              icon={Database}
              type="number"
              value={num("maxMemories", 1000)}
              onChange={(v) => updateConfig("maxMemories", parseInt(v, 10) || 1000)}
              hint="Oldest memories are dropped past this limit."
            />

            <ConfigInput
              label="Memories To Recall"
              icon={Sparkles}
              type="number"
              value={num("topK", 5)}
              onChange={(v) => updateConfig("topK", parseInt(v, 10) || 5)}
              hint="How many past memories to pull in per message."
            />

            <ConfigSelect
              label="Match Strictness"
              icon={Sparkles}
              value={num("similarityThreshold", 0.7)}
              onChange={(v) => updateConfig("similarityThreshold", parseFloat(v))}
              options={MATCH_LEVELS}
              accentColor={ACCENT}
            />

            <ConfigSelect
              label="Embedding Model"
              icon={Brain}
              value={config.embeddingModel || "text-embedding-3-small"}
              onChange={(v) => updateConfig("embeddingModel", v)}
              options={EMBEDDING_MODELS}
              accentColor={ACCENT}
            />
          </ConfigSection>
        )}

        {semantic && (
          <CredentialPicker
            value={config.credentialId || ""}
            onChange={(id) => updateConfig("credentialId", id)}
            credentialType="OpenAI"
            accentColor="violet"
            label="Embedding Key"
            placeholder="Select OpenAI credential…"
          />
        )}

        {semantic && !config.credentialId && (
          <ConfigBanner tone="warn">
            Semantic recall needs an OpenAI key to turn memories into vectors. Without one the
            agent still remembers recent messages, but not older ones.
          </ConfigBanner>
        )}
      </div>
    );
  };
}
