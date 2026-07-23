import { Globe, ShieldCheck, Crosshair, Type, Timer, Fingerprint } from 'lucide-react';
import {
  ConfigSection,
  ConfigDivider,
  ToolHeader,
  GuardrailNote,
  Text,
  NumberField,
} from '@nodes/agent_tool_panel/ToolKit.jsx';

const ACCENT = '#38bdf8';

export default function ToolScraperPanel({ config = {}, updateConfig, nodeId }) {
  return (
    <ConfigSection>
      <ToolHeader
        icon={Globe}
        iconColor={ACCENT}
        title="Web Scraper"
        subtitle="Reads a page and hands back plain text"
      />

      <GuardrailNote>
        Fetches HTML and strips the markup — no browser, no JavaScript. Pages that render
        their content client-side will come back mostly empty.
      </GuardrailNote>

      <Text
        label="Allowed Hosts"
        icon={ShieldCheck}
        value={config.allowedHosts}
        onChange={(v) => updateConfig('allowedHosts', v)}
        placeholder="docs.stripe.com, wikipedia.org"
        nodeId={nodeId}
        hint="Comma separated. Subdomains are included. Empty = any host."
      />

      <ConfigDivider label="Extraction" />

      <Text
        label="Default Tag"
        icon={Crosshair}
        value={config.selector}
        onChange={(v) => updateConfig('selector', v)}
        placeholder="article"
        nodeId={nodeId}
        hint="Keep only this tag's contents when the agent doesn't name one itself."
      />

      <NumberField
        label="Max Characters"
        icon={Type}
        value={config.maxChars}
        onChange={(v) => updateConfig('maxChars', v)}
        placeholder="5000"
        hint="Text is cut here before it reaches the model."
      />

      <NumberField
        label="Timeout (ms)"
        icon={Timer}
        value={config.timeoutMs}
        onChange={(v) => updateConfig('timeoutMs', v)}
        placeholder="20000"
      />

      <Text
        label="User Agent"
        icon={Fingerprint}
        value={config.userAgent}
        onChange={(v) => updateConfig('userAgent', v)}
        placeholder="Mozilla/5.0 (compatible; Blinkbox/1.0)"
        nodeId={nodeId}
        hint="Some sites block unknown clients. Change this if you get 403s."
      />
    </ConfigSection>
  );
}
