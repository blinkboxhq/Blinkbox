import { Database, KeyRound, Lock, Folders, FileStack } from 'lucide-react';
import {
  ConfigSection,
  ConfigDivider,
  ConfigInput,
  ConfigToggleRow,
  ConfigBanner,
  ToolHeader,
  GuardrailNote,
  Text,
  NumberField,
} from '@nodes/agent_tool_panel/ToolKit.jsx';

const ACCENT = '#4ade80';

const on = (v, dflt) => (v === undefined || v === null || v === '' ? dflt : v === true || v === 'true');

export default function ToolMongoDbPanel({ config = {}, updateConfig, nodeId }) {
  const readOnly = on(config.readOnly, true);

  return (
    <ConfigSection>
      <ToolHeader
        icon={Database}
        iconColor={ACCENT}
        title="MongoDB"
        subtitle="Reads and writes documents on the agent's behalf"
      />

      <GuardrailNote>
        The agent chooses the collection, the filter and the operation. The two limits
        below are what keep that from being a problem.
      </GuardrailNote>

      <ConfigInput
        label="Connection URI"
        icon={KeyRound}
        type="password"
        value={config.uri || ''}
        onChange={(v) => updateConfig('uri', v)}
        placeholder="mongodb+srv://user:pass@cluster/db"
        hint="Falls back to the server's MONGODB_URI when empty."
      />

      <ConfigDivider label="Safety" />

      <ConfigToggleRow
        label="Read Only"
        desc="Allows find and aggregate, blocks every write"
        icon={Lock}
        accentColor={ACCENT}
        on={readOnly}
        onChange={(v) => updateConfig('readOnly', v)}
      />

      {!readOnly && (
        <ConfigBanner tone="warn">
          Writes are enabled. The agent can insert, update and delete documents in any
          collection you allow below.
        </ConfigBanner>
      )}

      <Text
        label="Allowed Collections"
        icon={Folders}
        value={config.allowedCollections}
        onChange={(v) => updateConfig('allowedCollections', v)}
        placeholder="orders, customers"
        nodeId={nodeId}
        hint="Comma separated, exact names. Empty = every collection in the database."
      />

      <NumberField
        label="Max Documents Returned"
        icon={FileStack}
        value={config.maxDocs}
        onChange={(v) => updateConfig('maxDocs', v)}
        placeholder="50"
      />
    </ConfigSection>
  );
}
