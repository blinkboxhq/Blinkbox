import { useEffect } from 'react';
import imgTrello from './logo.svg';
import {
  Plus, Pencil, MoveRight, Archive, MessageSquarePlus, Tag, Eye, List, LayoutDashboard, ListChecks,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'createCard',  label: 'Create Card',         icon: Plus },
  { value: 'updateCard',  label: 'Update Card',         icon: Pencil },
  { value: 'moveCard',    label: 'Move Card',           icon: MoveRight },
  { value: 'archiveCard', label: 'Archive Card',        icon: Archive },
  { value: 'addComment',  label: 'Add Comment',         icon: MessageSquarePlus },
  { value: 'addLabel',    label: 'Add Label',           icon: Tag },
  { value: 'getCard',     label: 'Get Card',            icon: Eye },
  { value: 'listCards',   label: 'List Cards in List',  icon: List },
  { value: 'listBoards',  label: 'List My Boards',      icon: LayoutDashboard },
  { value: 'listLists',   label: 'List Lists in Board', icon: ListChecks },
];

const LABEL_COLORS = ['green', 'yellow', 'orange', 'red', 'purple', 'blue', 'sky', 'lime', 'pink', 'black'];

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

export default function TrelloNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const op = LABEL_TO_OP[config.selectedAction] || config.operation || 'createCard';

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


      {['createCard', 'moveCard', 'listCards'].includes(op) &&
        text('List ID', 'listId', { placeholder: 'Trello list ID' })}

      {op === 'listLists' &&
        text('Board ID', 'boardId', { placeholder: '{{ $json.board.id }}' })}

      {['updateCard', 'moveCard', 'archiveCard', 'addComment', 'addLabel', 'getCard'].includes(op) &&
        text('Card ID', 'cardId', { placeholder: '{{ $json.card.id }}' })}

      {(op === 'createCard' || op === 'updateCard') && (
        <>
          {text('Card Name', 'name', { placeholder: 'New task: {{ $json.title }}' })}
          {text('Description', 'desc', { optional: true, placeholder: 'Card description...', multiline: true })}
          {text('Due Date', 'due', { optional: true, placeholder: '{{ $json.dueDate }}' })}
        </>
      )}

      {op === 'addComment' &&
        text('Comment Text', 'text', { placeholder: 'Comment added via Blinkbox: {{ $json.note }}', multiline: true })}

      {op === 'addLabel' && (
        <>
          <Field label="Label Color">
            <div className="flex gap-1.5 flex-wrap">
              {LABEL_COLORS.map((c) => {
                const on = config.labelColor === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateConfig('labelColor', c)}
                    className={`bb-glow-border px-2 py-1 rounded-md text-[10px] font-mono font-bold border transition-colors ${on ? 'text-white border-white' : 'text-neutral-500 border-[#2b2b2b]'}`}
                    style={{ background: c === 'black' ? '#1a1a1a' : c }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </Field>
          {text('Label Name', 'labelName', { optional: true, placeholder: 'Priority' })}
        </>
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Trello API Key + Token"
        placeholder="Select Trello credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">id, name, url, shortUrl, idList</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
