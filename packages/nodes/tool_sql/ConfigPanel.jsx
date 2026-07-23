import { Database, KeyRound, Lock, Rows3, Timer, ShieldCheck } from 'lucide-react';
import {
  ConfigSection,
  ConfigDivider,
  ConfigInput,
  ConfigToggleRow,
  ConfigBanner,
  ToolHeader,
  GuardrailNote,
  NumberField,
} from '@nodes/agent_tool_panel/ToolKit.jsx';

const ACCENT = '#22d3ee';

const on = (v, dflt) => (v === undefined || v === null || v === '' ? dflt : v === true || v === 'true');

export default function ToolSqlPanel({ config = {}, updateConfig }) {
  const readOnly = on(config.readOnly, true);

  return (
    <ConfigSection>
      <ToolHeader
        icon={Database}
        iconColor={ACCENT}
        title="SQL Query"
        subtitle="Runs Postgres queries the agent writes"
      />

      <GuardrailNote>
        The agent writes the SQL itself. Read-only mode is the difference between a bad
        query returning nothing and a bad query dropping a table.
      </GuardrailNote>

      <ConfigInput
        label="Connection String"
        icon={KeyRound}
        type="password"
        value={config.connectionString || ''}
        onChange={(v) => updateConfig('connectionString', v)}
        placeholder="postgres://user:pass@host:5432/db"
        hint="Falls back to the server's POSTGRES_URL when empty."
      />

      <ConfigToggleRow
        label="Require SSL"
        desc="Needed by most hosted Postgres providers"
        icon={ShieldCheck}
        accentColor={ACCENT}
        on={on(config.ssl, false)}
        onChange={(v) => updateConfig('ssl', v)}
      />

      <ConfigDivider label="Safety" />

      <ConfigToggleRow
        label="Read Only"
        desc="Only SELECT and WITH, one statement per call"
        icon={Lock}
        accentColor={ACCENT}
        on={readOnly}
        onChange={(v) => updateConfig('readOnly', v)}
      />

      {!readOnly && (
        <ConfigBanner tone="warn">
          Writes are enabled. The agent can INSERT, UPDATE, DELETE and DROP against this
          database, and nothing here will stop it. Point it at a database you can restore.
        </ConfigBanner>
      )}

      <NumberField
        label="Max Rows Returned"
        icon={Rows3}
        value={config.maxRows}
        onChange={(v) => updateConfig('maxRows', v)}
        placeholder="100"
        hint="Extra rows are dropped before the model sees them."
      />

      <NumberField
        label="Statement Timeout (ms)"
        icon={Timer}
        value={config.timeoutMs}
        onChange={(v) => updateConfig('timeoutMs', v)}
        placeholder="15000"
      />
    </ConfigSection>
  );
}
