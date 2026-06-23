import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Zap, Plus, Play, ArrowRight, Check } from "lucide-react";

const STEPS = [
  {
    id: "welcome",
    icon: Zap,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10",
    title: "Welcome to Blinkbox",
    body: "Build powerful automations visually — no code required. Connect any app, trigger on any event, and let your workflows run 24/7.",
    cta: "Get Started",
  },
  {
    id: "trigger",
    icon: Plus,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
    title: "Start with a Trigger",
    body: "Every workflow begins with a trigger — a webhook, a schedule, a form, or just a manual click. Click the ＋ button on the canvas to pick yours.",
    cta: "Got it",
  },
  {
    id: "nodes",
    icon: ArrowRight,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/10",
    title: "Connect Actions",
    body: "Drag nodes from the sidebar onto the canvas and connect them. Each node does one thing: make an HTTP call, run AI, send an email, loop over data.",
    cta: "Next",
  },
  {
    id: "run",
    icon: Play,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10",
    title: "Run & Debug",
    body: 'Hit "Run Test" to execute your workflow. The Execution Trace panel shows every node\'s status, input, and output in real time.',
    cta: "Let's go →",
  },
];

const STORAGE_KEY = "bb:onboarding";

export default function OnboardingModal() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "done");
    setVisible(false);
  };

  const advance = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="onboarding-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-[3px]"
        >
          <motion.div
            key={`step-${step}`}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden"
          >
            {/* Close */}
            <div className="flex justify-end px-5 pt-4">
              <button
                onClick={dismiss}
                className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                title="Skip onboarding"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-8 pb-8 pt-2 text-center">
              <div className={`w-14 h-14 rounded-2xl ${current.iconBg} flex items-center justify-center mx-auto mb-5`}>
                <Icon className={`w-7 h-7 ${current.iconColor}`} />
              </div>

              <h2 className="text-lg font-bold text-zinc-100 mb-2.5">{current.title}</h2>
              <p className="text-sm text-zinc-400 leading-relaxed mb-7">{current.body}</p>

              {/* Step indicators */}
              <div className="flex items-center justify-center gap-1.5 mb-6">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`transition-all duration-200 rounded-full ${
                      i === step
                        ? "w-5 h-1.5 bg-zinc-300"
                        : i < step
                        ? "w-1.5 h-1.5 bg-zinc-500"
                        : "w-1.5 h-1.5 bg-zinc-700"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={advance}
                className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-bold transition-colors"
              >
                {current.cta}
              </button>

              {step < STEPS.length - 1 && (
                <button
                  onClick={dismiss}
                  className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Skip tutorial
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
