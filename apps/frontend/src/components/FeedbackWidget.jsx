import { useState } from "react";
import { MessageSquare, X, Send, Bug, Lightbulb, MessageCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useLocation } from "react-router-dom";

const TYPES = [
  { id: "feedback", label: "Feedback", icon: MessageCircle },
  { id: "bug",      label: "Bug",      icon: Bug },
  { id: "idea",     label: "Idea",     icon: Lightbulb },
];

export default function FeedbackWidget() {
  const [open, setOpen]       = useState(false);
  const [type, setType]       = useState("feedback");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const location = useLocation();

  const token = localStorage.getItem("blinkbox_token");
  if (!token) return null;

  async function submit() {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await api.post("/api/feedback", { type, message, page: location.pathname });
      setSent(true);
      setMessage("");
      setTimeout(() => { setSent(false); setOpen(false); }, 2000);
    } catch {
      toast.error('Failed to send feedback');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Beta badge */}
      <div className="fixed top-3 right-3 z-50 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[10px] font-bold uppercase tracking-widest select-none">
        Beta
      </div>

      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3 py-2 bg-neutral-900 border border-[#333] rounded-full text-neutral-400 hover:text-white hover:border-neutral-600 transition-all duration-150 text-[12px] font-medium shadow-lg"
      >
        <MessageSquare size={14} />
        Feedback
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-5" onClick={() => setOpen(false)}>
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-xl w-[320px] p-5 shadow-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "fbIn 0.15s ease-out" }}
          >
            <style>{`@keyframes fbIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-zinc-100">Share your thoughts</span>
              <button onClick={() => setOpen(false)} className="text-neutral-500 hover:text-neutral-300 transition-colors">
                <X size={15} />
              </button>
            </div>

            {/* Type selector */}
            <div className="flex gap-2">
              {TYPES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setType(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-150 ${
                    type === id
                      ? "bg-violet-500/10 border-violet-500/40 text-violet-400"
                      : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Icon size={11} />
                  {label}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                type === "bug"  ? "What broke? What did you expect to happen?" :
                type === "idea" ? "What feature would make this 10x better?" :
                "What's your experience so far?"
              }
              rows={4}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none transition-colors"
            />

            <button
              onClick={submit}
              disabled={!message.trim() || sending || sent}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-medium transition-all duration-150"
            >
              {sent ? (
                <><CheckCircle size={14} /> Sent!</>
              ) : sending ? (
                "Sending..."
              ) : (
                <><Send size={14} /> Send</>
              )}
            </button>

            <p className="text-[10px] text-zinc-600 text-center">You're using Blinkbox Beta — your feedback shapes what gets built next.</p>
          </div>
        </div>
      )}
    </>
  );
}
