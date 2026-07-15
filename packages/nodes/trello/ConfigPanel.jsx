import imgTrello from './logo.svg';
import {
  Plus, Pencil, MoveRight, Archive, MessageSquarePlus, Tag, Eye, List, LayoutDashboard, ListChecks,
  Trash2, MessagesSquare, Tags, User, Users, UserPlus, UserMinus, Paperclip, ListPlus,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigBanner, ConfigToggleRow, ConfigPills,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'createCard',          label: 'Create Card',          icon: Plus,             desc: 'Cards' },
  { value: 'updateCard',          label: 'Update Card',          icon: Pencil,           desc: 'Cards' },
  { value: 'moveCard',            label: 'Move Card',            icon: MoveRight,        desc: 'Cards' },
  { value: 'archiveCard',         label: 'Archive Card',         icon: Archive,          desc: 'Cards' },
  { value: 'deleteCard',          label: 'Delete Card',          icon: Trash2,           desc: 'Cards' },
  { value: 'getCard',             label: 'Get Card',             icon: Eye,              desc: 'Cards' },
  { value: 'listCards',           label: 'List Cards in List',   icon: List,             desc: 'Cards' },
  { value: 'addComment',          label: 'Add Comment',          icon: MessageSquarePlus,desc: 'Comments' },
  { value: 'listComments',        label: 'List Comments',        icon: MessagesSquare,   desc: 'Comments' },
  { value: 'addLabel',            label: 'Add Label to Card',    icon: Tag,              desc: 'Labels' },
  { value: 'removeLabel',         label: 'Remove Label',         icon: Tag,              desc: 'Labels' },
  { value: 'createLabel',         label: 'Create Label',         icon: Plus,             desc: 'Labels' },
  { value: 'updateLabel',         label: 'Update Label',         icon: Pencil,           desc: 'Labels' },
  { value: 'deleteLabel',         label: 'Delete Label',         icon: Trash2,           desc: 'Labels' },
  { value: 'listBoardLabels',     label: 'List Board Labels',    icon: Tags,             desc: 'Labels' },
  { value: 'addMember',           label: 'Add Member to Card',   icon: UserPlus,         desc: 'Members' },
  { value: 'removeMember',        label: 'Remove Member',        icon: UserMinus,        desc: 'Members' },
  { value: 'listBoardMembers',    label: 'List Board Members',   icon: Users,            desc: 'Members' },
  { value: 'getMember',           label: 'Get Member',           icon: User,             desc: 'Members' },
  { value: 'getMe',               label: 'My Profile',           icon: User,             desc: 'Members' },
  { value: 'addAttachment',       label: 'Add Attachment',       icon: Paperclip,        desc: 'Attachments' },
  { value: 'listAttachments',     label: 'List Attachments',     icon: Paperclip,        desc: 'Attachments' },
  { value: 'deleteAttachment',    label: 'Delete Attachment',    icon: Trash2,           desc: 'Attachments' },
  { value: 'createChecklist',     label: 'Create Checklist',     icon: ListPlus,         desc: 'Checklists' },
  { value: 'listChecklists',      label: 'List Checklists',      icon: ListChecks,       desc: 'Checklists' },
  { value: 'getChecklist',        label: 'Get Checklist',        icon: Eye,              desc: 'Checklists' },
  { value: 'deleteChecklist',     label: 'Delete Checklist',     icon: Trash2,           desc: 'Checklists' },
  { value: 'addChecklistItem',    label: 'Add Checklist Item',   icon: Plus,             desc: 'Checklists' },
  { value: 'updateChecklistItem', label: 'Update Checklist Item',icon: Pencil,           desc: 'Checklists' },
  { value: 'deleteChecklistItem', label: 'Delete Checklist Item',icon: Trash2,           desc: 'Checklists' },
  { value: 'listBoards',          label: 'List My Boards',       icon: LayoutDashboard,  desc: 'Boards' },
  { value: 'getBoard',            label: 'Get Board',            icon: Eye,              desc: 'Boards' },
  { value: 'createBoard',         label: 'Create Board',         icon: Plus,             desc: 'Boards' },
  { value: 'updateBoard',         label: 'Update Board',         icon: Pencil,           desc: 'Boards' },
  { value: 'deleteBoard',         label: 'Delete Board',         icon: Trash2,           desc: 'Boards' },
  { value: 'listLists',           label: 'List Lists in Board',  icon: ListChecks,       desc: 'Lists' },
  { value: 'getList',             label: 'Get List',             icon: Eye,              desc: 'Lists' },
  { value: 'createList',          label: 'Create List',          icon: Plus,             desc: 'Lists' },
  { value: 'updateList',          label: 'Update List',          icon: Pencil,           desc: 'Lists' },
  { value: 'archiveList',         label: 'Archive List',         icon: Archive,          desc: 'Lists' },
  { value: 'moveListToBoard',     label: 'Move List to Board',   icon: MoveRight,        desc: 'Lists' },
];

const CARD_ID_OPS = ['updateCard', 'moveCard', 'archiveCard', 'deleteCard', 'getCard', 'addComment', 'listComments', 'addLabel', 'removeLabel', 'addMember', 'removeMember', 'addAttachment', 'listAttachments', 'deleteAttachment', 'listChecklists', 'createChecklist', 'updateChecklistItem'];
const LIST_ID_OPS = ['createCard', 'moveCard', 'listCards', 'getList', 'updateList', 'archiveList', 'moveListToBoard'];
const BOARD_ID_OPS = ['listLists', 'getBoard', 'updateBoard', 'deleteBoard', 'listBoardMembers', 'listBoardLabels', 'createList', 'moveListToBoard', 'createLabel'];
const CHECKLIST_ID_OPS = ['getChecklist', 'deleteChecklist', 'addChecklistItem', 'deleteChecklistItem'];
const LABEL_COLOR_OPS = ['addLabel', 'createLabel', 'updateLabel'];

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
  const op = config.operation || 'createCard';
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
      <ConfigHeader logoUrl={imgTrello} title="Trello" subtitle={currentOp?.label || 'Cards, lists, boards, comments'} />

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {CARD_ID_OPS.includes(op) &&
        text('Card ID', 'cardId', { placeholder: '{{ $json.card.id }}' })}

      {LIST_ID_OPS.includes(op) &&
        text(op === 'moveCard' ? 'Destination List ID' : 'List ID', 'listId', { placeholder: 'Trello list ID' })}

      {op === 'updateCard' &&
        text('Move to List ID', 'listId', { optional: true, placeholder: 'Trello list ID' })}

      {BOARD_ID_OPS.includes(op) &&
        text(op === 'moveListToBoard' ? 'Destination Board ID' : 'Board ID', 'boardId', { placeholder: '{{ $json.board.id }}' })}

      {CHECKLIST_ID_OPS.includes(op) &&
        text('Checklist ID', 'checklistId', { placeholder: '{{ $json.checklist.id }}' })}

      {['removeLabel', 'updateLabel', 'deleteLabel'].includes(op) &&
        text('Label ID', 'labelId', { placeholder: '{{ $json.label.id }}' })}

      {['addMember', 'removeMember', 'getMember'].includes(op) &&
        text('Member ID', 'memberId', { placeholder: '{{ $json.member.id }}' })}

      {['updateChecklistItem', 'deleteChecklistItem'].includes(op) &&
        text('Check Item ID', 'checkItemId', { placeholder: '{{ $json.checkItem.id }}' })}

      {(op === 'createCard' || op === 'updateCard') && (
        <>
          {text('Card Name', 'name', { optional: op === 'updateCard', placeholder: 'New task: {{ $json.title }}' })}
          {text('Description', 'desc', { optional: true, placeholder: 'Card description...', multiline: true })}
          {text('Due Date', 'due', { optional: true, placeholder: '{{ $json.dueDate }}' })}
          {text('Start Date', 'start', { optional: true, placeholder: '2026-08-01' })}
          {text('Label IDs (comma-sep)', 'labelIds', { optional: true, placeholder: 'labelId1, labelId2' })}
          {text('Member IDs (comma-sep)', 'memberIds', { optional: true, placeholder: 'memberId1, memberId2' })}
          <ConfigToggleRow
            label="Due complete"
            on={!!config.dueComplete}
            onChange={(v) => updateConfig('dueComplete', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {['createCard', 'updateCard', 'moveCard', 'createList', 'updateList', 'addChecklistItem', 'updateChecklistItem'].includes(op) &&
        text('Position', 'position', { optional: true, placeholder: 'top, bottom, or a number' })}

      {op === 'addComment' &&
        text('Comment Text', 'text', { placeholder: 'Comment added via Blinkbox: {{ $json.note }}', multiline: true })}

      {op === 'addLabel' &&
        text('Existing Label ID', 'labelId', { optional: true, placeholder: 'Leave empty to create by color below' })}

      {LABEL_COLOR_OPS.includes(op) && (
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
          {text('Label Name', 'labelName', { optional: op !== 'createLabel', placeholder: 'Priority' })}
        </>
      )}

      {op === 'addAttachment' && (
        <>
          {text('Attachment URL', 'attachmentUrl', { placeholder: '{{ $json.fileUrl }}' })}
          {text('Attachment Name', 'attachmentName', { optional: true, placeholder: 'report.pdf' })}
        </>
      )}

      {op === 'deleteAttachment' &&
        text('Attachment ID', 'attachmentId', { placeholder: '{{ $json.attachment.id }}' })}

      {op === 'createChecklist' &&
        text('Checklist Name', 'name', { placeholder: 'Launch checklist' })}

      {op === 'addChecklistItem' && (
        <>
          {text('Item Name', 'name', { placeholder: 'Ship the build' })}
          <ConfigToggleRow
            label="Checked"
            on={!!config.checked}
            onChange={(v) => updateConfig('checked', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {op === 'updateChecklistItem' && (
        <>
          {text('New Item Name', 'name', { optional: true, placeholder: 'Ship the build' })}
          <ConfigPills
            label="State"
            value={config.state || ''}
            onChange={(val) => updateConfig('state', val)}
            options={[{ value: 'complete', label: 'complete' }, { value: 'incomplete', label: 'incomplete' }]}
            accentColor={ACCENT}
          />
        </>
      )}

      {op === 'createBoard' && (
        <>
          {text('Board Name', 'name', { placeholder: 'Q3 Roadmap' })}
          {text('Description', 'desc', { optional: true, placeholder: 'Board description...', multiline: true })}
          {text('Workspace ID', 'idOrganization', { optional: true, placeholder: 'Trello workspace ID' })}
          <ConfigToggleRow
            label="Create default lists"
            on={config.defaultLists !== false}
            onChange={(v) => updateConfig('defaultLists', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {op === 'updateBoard' && (
        <>
          {text('New Board Name', 'name', { optional: true, placeholder: 'Q3 Roadmap' })}
          {text('New Description', 'desc', { optional: true, placeholder: 'Board description...', multiline: true })}
          <ConfigToggleRow
            label="Closed (archive board)"
            on={!!config.closed}
            onChange={(v) => updateConfig('closed', v)}
            accentColor={ACCENT}
          />
        </>
      )}

      {op === 'createList' &&
        text('List Name', 'name', { placeholder: 'In Progress' })}

      {op === 'updateList' &&
        text('New List Name', 'name', { optional: true, placeholder: 'In Progress' })}

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
