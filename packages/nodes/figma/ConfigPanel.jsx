import { useEffect } from 'react';
import imgFigma from './logo.svg';
import {
  FileText, Boxes, MessageSquare, MessageSquarePlus, MessageSquareX, ImageDown, Palette, Component,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'getFile',       label: 'Get File',           icon: FileText },
  { value: 'getFileNodes',  label: 'Get Nodes',          icon: Boxes },
  { value: 'getComments',   label: 'Get Comments',       icon: MessageSquare },
  { value: 'postComment',   label: 'Post Comment',       icon: MessageSquarePlus },
  { value: 'deleteComment', label: 'Delete Comment',     icon: MessageSquareX },
  { value: 'exportNode',    label: 'Export Node (image)', icon: ImageDown },
  { value: 'getStyles',     label: 'Get Styles',         icon: Palette },
  { value: 'getComponents', label: 'Get Components',     icon: Component },
];

function Field({ label, optional, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <ConfigLabel>
          {label}{optional && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}
        </ConfigLabel>
      )}
      {children}
    </div>
  );
}

export default function FigmaNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const op = LABEL_TO_OP[config.selectedAction] || config.operation || 'getFile';

  useEffect(() => {
    if (op && op !== config.operation) updateConfig('operation', op);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op]);
  const currentOp = OPERATIONS.find((o) => o.value === op);

  const text = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional}>
      <SmartVariableInput
        value={config[key] || ''}
        onChange={(val) => updateConfig(key, val)}
        placeholder={opts.placeholder || ''}
        multiline={opts.multiline}
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">


      {text('File Key', 'fileKey', { placeholder: 'From figma.com/file/XXXX/...' })}

      {['getFileNodes', 'exportNode'].includes(op) &&
        text('Node IDs (comma-sep)', 'nodeIds', { placeholder: '1:2,3:4' })}

      {op === 'postComment' && (
        <>
          {text('Comment Message', 'message', { placeholder: 'Approved — ready for handoff 🎉', multiline: true })}
          <div className="flex gap-3">
            <div className="flex-1">{text('Pin X', 'x', { optional: true, placeholder: '100' })}</div>
            <div className="flex-1">{text('Pin Y', 'y', { optional: true, placeholder: '200' })}</div>
          </div>
        </>
      )}

      {op === 'deleteComment' &&
        text('Comment ID', 'commentId', { placeholder: '{{ $json.id }}' })}

      {op === 'exportNode' && (
        <>
          <ConfigPills
            label="Export Format"
            value={config.format || 'png'}
            onChange={(val) => updateConfig('format', val)}
            options={[{ value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }, { value: 'svg', label: 'SVG' }, { value: 'pdf', label: 'PDF' }]}
            accentColor={ACCENT}
          />
          <ConfigPills
            label="Scale (1x = 1)"
            value={config.scale || 1}
            onChange={(val) => updateConfig('scale', val)}
            options={[{ value: 1, label: '1x' }, { value: 2, label: '2x' }, { value: 3, label: '3x' }, { value: 4, label: '4x' }]}
            accentColor={ACCENT}
          />
        </>
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Figma Personal Access Token"
        placeholder="Select Figma credential..."
      />

      <ConfigBanner>Returns:&nbsp;<span className="text-neutral-300">name, nodes, comments, images (base64 URLs)</span></ConfigBanner>
    </ConfigSection>
  );
}
