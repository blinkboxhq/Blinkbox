import { Video } from 'lucide-react';
import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from '../../../../components/ui/CredentialPicker';
import OAuthConnectButton from '../../../../components/ui/OAuthConnectButton';

export default function ZoomNode({ config = {}, updateConfig, nodeId }) {
  const operation = config.operation || "createMeeting";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-[#2D8CFF]/10 border border-[#2D8CFF]/20 flex items-center justify-center shrink-0">
            <Video className="w-4 h-4 text-[#2D8CFF]" />
          </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-blue-400">Zoom</span>
          <span className="text-[10px] text-zinc-500">Create and manage Zoom video meetings</span>
        </div>
      </div>

      <CredentialPicker
        value={config.credentialId || ""}
        onChange={(v) => updateConfig("credentialId", v)}
        serviceType="Zoom"
        label="Zoom OAuth"
        nodeId={nodeId}
      />

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { value: "createMeeting", label: "Create Meeting" },
            { value: "getMeeting",    label: "Get Meeting" },
            { value: "listMeetings",  label: "List Meetings" },
            { value: "updateMeeting", label: "Update Meeting" },
            { value: "deleteMeeting", label: "Delete Meeting" },
          ].map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${operation === o.value ? "bg-blue-500/10 border-blue-500/40 text-blue-400" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {(operation === "getMeeting" || operation === "deleteMeeting" || operation === "updateMeeting") && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Meeting ID</label>
          <SmartVariableInput
            value={config.meetingId || ""}
            onChange={(v) => updateConfig("meetingId", v)}
            placeholder="{{upstream.meetingId}}"
            nodeId={nodeId}
          />
        </div>
      )}

      {(operation === "createMeeting" || operation === "updateMeeting") && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Topic</label>
            <SmartVariableInput
              value={config.topic || ""}
              onChange={(v) => updateConfig("topic", v)}
              placeholder="Team standup"
              nodeId={nodeId}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Start Time (ISO)</label>
              <SmartVariableInput
                value={config.startTime || ""}
                onChange={(v) => updateConfig("startTime", v)}
                placeholder="2025-06-01T14:00:00Z"
                nodeId={nodeId}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Duration (min)</label>
              <input
                type="number" min="15"
                value={config.duration || 60}
                onChange={(e) => updateConfig("duration", parseInt(e.target.value))}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500/40"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Agenda</label>
            <SmartVariableInput
              value={config.agenda || ""}
              onChange={(v) => updateConfig("agenda", v)}
              placeholder="Meeting agenda..."
              nodeId={nodeId}
            />
          </div>
        </>
      )}
    </div>
  );
}
