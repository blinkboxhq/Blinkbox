import imgZoom from './logo.svg';
import {
  VideoIcon, Video, List, Pencil, Info,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigInput, ConfigPills, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'createMeeting', label: 'Create Meeting', icon: VideoIcon },
  { value: 'getMeeting',    label: 'Get Meeting',    icon: Video },
  { value: 'listMeetings',  label: 'List Meetings',  icon: List },
  { value: 'updateMeeting', label: 'Update Meeting', icon: Pencil },
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

export default function ZoomNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || 'createMeeting';
  const currentOp = OPERATIONS.find((o) => o.value === op);

  const text = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional}>
      <SmartVariableInput
        value={config[key] ?? opts.def ?? ''}
        onChange={(val) => updateConfig(key, val)}
        placeholder={opts.placeholder || ''}
        multiline={opts.multiline}
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">
      <ConfigHeader logoUrl={imgZoom} title="Zoom" subtitle={currentOp?.label || 'Meetings via the Zoom API'} />

      <ConfigBanner>
        <Info className="w-3.5 h-3.5 shrink-0" />
        Requires a Zoom OAuth credential (Server-to-Server or OAuth app).
      </ConfigBanner>

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {['createMeeting', 'updateMeeting'].includes(op) && (
        <>
          {text('Topic', 'topic', {})}
          {text('Start Time', 'startTime', { placeholder: '2024-12-25T10:00:00Z' })}
          <ConfigInput
            label="Duration (minutes)"
            type="number"
            value={config.duration ?? 60}
            onChange={(val) => updateConfig('duration', Number(val))}
          />
        </>
      )}

      {op === 'createMeeting' && (
        <>
          <ConfigInput
            label="Timezone"
            value={config.timezone ?? 'UTC'}
            onChange={(val) => updateConfig('timezone', val)}
          />
          {text('Agenda', 'agenda', { optional: true, multiline: true })}
        </>
      )}

      {['createMeeting', 'updateMeeting'].includes(op) &&
        text('Password', 'password', { optional: true })}

      {['getMeeting', 'updateMeeting'].includes(op) &&
        text('Meeting ID', 'meetingId', {})}

      {op === 'listMeetings' && (
        <>
          <ConfigPills
            label="Type"
            value={config.type ?? 'scheduled'}
            onChange={(val) => updateConfig('type', val)}
            options={[{ value: 'scheduled', label: 'Scheduled' }, { value: 'live', label: 'Live' }, { value: 'upcoming', label: 'Upcoming' }]}
            accentColor={ACCENT}
          />
          <ConfigInput
            label="Page Size"
            type="number"
            value={config.pageSize ?? 30}
            onChange={(val) => updateConfig('pageSize', Number(val))}
          />
        </>
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="blue"
        label="Zoom OAuth"
        placeholder="Select Zoom credential…"
      />

      <ConfigBanner>Returns:&nbsp;<span className="text-neutral-300">meeting, meetings</span></ConfigBanner>
    </ConfigSection>
  );
}
