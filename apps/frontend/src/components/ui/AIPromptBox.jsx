import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  ArrowUp, Paperclip, Square, X, StopCircle, Mic,
  Globe, BrainCog, FolderCode,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const cn = (...classes) => classes.filter(Boolean).join(' ');

/* ── Textarea ─────────────────────────────────────────────────────────── */
const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={1}
    className={cn(
      'flex w-full rounded-md border-none bg-transparent px-3 py-2.5 text-[13px] text-gray-100 placeholder:text-[#555] focus-visible:outline-none resize-none min-h-[44px]',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

/* ── Tooltip ──────────────────────────────────────────────────────────── */
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border border-[#333] bg-[#1a1a1a] px-3 py-1.5 text-[11px] text-white shadow-md animate-in fade-in-0 zoom-in-95',
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = 'TooltipContent';

/* ── Dialog ───────────────────────────────────────────────────────────── */
const Dialog        = DialogPrimitive.Root;
const DialogPortal  = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/60 backdrop-blur-sm', className)}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 border border-[#333] bg-[#141414] p-0 shadow-xl rounded-2xl w-full max-w-[90vw] md:max-w-[800px]',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full bg-[#2a2a2a]/80 p-2 hover:bg-[#2a2a2a] transition-all">
        <X className="h-4 w-4 text-gray-300" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = 'DialogContent';

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-sm font-semibold text-gray-100', className)} {...props} />
));
DialogTitle.displayName = 'DialogTitle';

/* ── Button ───────────────────────────────────────────────────────────── */
const Button = React.forwardRef(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  const v = {
    default: 'bg-white hover:bg-white/80 text-black',
    outline: 'border border-[#444] bg-transparent hover:bg-[#2a2a2a]',
    ghost:   'bg-transparent hover:bg-[#2a2a2a]',
  };
  const s = {
    default: 'h-10 px-4 py-2',
    sm:      'h-8 px-3 text-sm',
    lg:      'h-12 px-6',
    icon:    'h-8 w-8 rounded-full aspect-square',
  };
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        v[variant], s[size], className,
      )}
      {...props}
    />
  );
});
Button.displayName = 'Button';

/* ── VoiceRecorder ────────────────────────────────────────────────────── */
function VoiceRecorder({ isRecording, onStartRecording, onStopRecording, visualizerBars = 32 }) {
  const [time, setTime]   = React.useState(0);
  const timerRef          = React.useRef(null);

  React.useEffect(() => {
    if (isRecording) {
      onStartRecording?.();
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      onStopRecording?.(time);
      setTime(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]); // eslint-disable-line

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  return (
    <div className={cn('flex flex-col items-center justify-center w-full transition-all duration-300 py-3', isRecording ? 'opacity-100' : 'opacity-0 h-0')}>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="font-mono text-sm text-white/80">{fmt(time)}</span>
      </div>
      <div className="w-full h-10 flex items-center justify-center gap-0.5 px-4">
        {Array.from({ length: visualizerBars }, (_, i) => (
          <div key={i} className="w-0.5 rounded-full bg-white/40 animate-pulse"
            style={{ height: `${Math.max(15, Math.random() * 100)}%`, animationDelay: `${i * 0.05}s`, animationDuration: `${0.5 + Math.random() * 0.5}s` }} />
        ))}
      </div>
    </div>
  );
}

/* ── ImageViewDialog ──────────────────────────────────────────────────── */
function ImageViewDialog({ imageUrl, onClose }) {
  if (!imageUrl) return null;
  return (
    <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="p-0 border-none bg-transparent shadow-none">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <img src={imageUrl} alt="preview" className="w-full max-h-[80vh] object-contain rounded-2xl" />
      </DialogContent>
    </Dialog>
  );
}

/* ── PromptInput context ──────────────────────────────────────────────── */
const PromptInputCtx = React.createContext({ isLoading: false, value: '', setValue: () => {}, maxHeight: 240, onSubmit: undefined, disabled: false });
const usePromptInput = () => React.useContext(PromptInputCtx);

const PromptInput = React.forwardRef(({ className, isLoading = false, maxHeight = 240, value, onValueChange, onSubmit, children, disabled = false, onDragOver, onDragLeave, onDrop }, ref) => {
  const [internal, setInternal] = React.useState(value || '');
  return (
    <TooltipProvider>
      <PromptInputCtx.Provider value={{ isLoading, value: value ?? internal, setValue: onValueChange ?? setInternal, maxHeight, onSubmit, disabled }}>
        <div
          ref={ref}
          className={cn('rounded-2xl border border-[#2a2a2a] bg-[#111] p-2 shadow-lg transition-all duration-300', isLoading && 'border-red-500/70', className)}
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        >
          {children}
        </div>
      </PromptInputCtx.Provider>
    </TooltipProvider>
  );
});
PromptInput.displayName = 'PromptInput';

function PromptInputTextarea({ className, onKeyDown, disableAutosize = false, placeholder, ...props }) {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput();
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (disableAutosize || !ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = typeof maxHeight === 'number'
      ? `${Math.min(ref.current.scrollHeight, maxHeight)}px`
      : `min(${ref.current.scrollHeight}px, ${maxHeight})`;
  }, [value, maxHeight, disableAutosize]);

  return (
    <Textarea
      ref={ref}
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit?.(); } onKeyDown?.(e); }}
      className={className}
      disabled={disabled}
      placeholder={placeholder}
      {...props}
    />
  );
}

function PromptInputActions({ children, className, ...props }) {
  return <div className={cn('flex items-center gap-2', className)} {...props}>{children}</div>;
}

function PromptInputAction({ tooltip, children, side = 'top' }) {
  const { disabled } = usePromptInput();
  return (
    <Tooltip>
      <TooltipTrigger asChild disabled={disabled}>{children}</TooltipTrigger>
      <TooltipContent side={side}>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

/* ── Divider ──────────────────────────────────────────────────────────── */
function CustomDivider() {
  return <div className="h-5 w-px mx-1 bg-gradient-to-b from-transparent via-[#9b87f5]/60 to-transparent rounded-full" />;
}

/* ── Main export ──────────────────────────────────────────────────────── */
export const AIPromptBox = React.forwardRef(function AIPromptBox({
  onSend = () => {},
  isLoading = false,
  placeholder = 'Describe an automation and Brian will build it…',
  className,
}, ref) {
  const [input,        setInput]        = React.useState('');
  const [files,        setFiles]        = React.useState([]);
  const [filePreviews, setFilePreviews] = React.useState({});
  const [selImg,       setSelImg]       = React.useState(null);
  const [isRecording,  setIsRecording]  = React.useState(false);
  const [showSearch,   setShowSearch]   = React.useState(false);
  const [showThink,    setShowThink]    = React.useState(false);
  const [showCanvas,   setShowCanvas]   = React.useState(false);
  const uploadRef = React.useRef(null);
  const boxRef    = React.useRef(null);

  const processFile = file => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) return;
    setFiles([file]);
    const r = new FileReader();
    r.onload = e => setFilePreviews({ [file.name]: e.target.result });
    r.readAsDataURL(file);
  };

  const handlePaste = React.useCallback(e => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) { const f = item.getAsFile(); if (f) { e.preventDefault(); processFile(f); break; } }
    }
  }, []);

  React.useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleSubmit = () => {
    if (!input.trim() && !files.length) return;
    const prefix = showSearch ? '[Search: ' : showThink ? '[Think: ' : showCanvas ? '[Canvas: ' : '';
    onSend(prefix ? `${prefix}${input}]` : input, files);
    setInput(''); setFiles([]); setFilePreviews({});
  };

  const hasContent = input.trim() !== '' || files.length > 0;

  return (
    <>
      <PromptInput
        value={input} onValueChange={setInput} isLoading={isLoading} onSubmit={handleSubmit}
        disabled={isLoading || isRecording} ref={ref || boxRef}
        className={cn('w-full bg-[#111] border-[#2a2a2a]', isRecording && 'border-red-500/70', className)}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
        onDragLeave={e => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); const f = Array.from(e.dataTransfer.files).find(x => x.type.startsWith('image/')); if (f) processFile(f); }}
      >
        {/* File previews */}
        {files.length > 0 && !isRecording && (
          <div className="flex flex-wrap gap-2 pb-2">
            {files.map((file, i) => filePreviews[file.name] && (
              <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden cursor-pointer" onClick={() => setSelImg(filePreviews[file.name])}>
                <img src={filePreviews[file.name]} alt={file.name} className="w-full h-full object-cover" />
                <button onClick={e => { e.stopPropagation(); setFiles([]); setFilePreviews({}); }} className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5">
                  <X className="h-2.5 w-2.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <div className={cn('transition-all duration-300', isRecording ? 'h-0 overflow-hidden opacity-0' : 'opacity-100')}>
          <PromptInputTextarea
            placeholder={showSearch ? 'Search the web…' : showThink ? 'Think deeply…' : showCanvas ? 'Create on canvas…' : placeholder}
          />
        </div>

        {isRecording && (
          <VoiceRecorder isRecording={isRecording} onStartRecording={() => {}} onStopRecording={d => { setIsRecording(false); onSend(`[Voice message – ${d}s]`, []); }} />
        )}

        {/* Actions row */}
        <PromptInputActions className="justify-between pt-2">
          {/* Left toggles */}
          <div className={cn('flex items-center gap-1 transition-opacity duration-300', isRecording ? 'opacity-0 invisible h-0' : 'opacity-100 visible')}>
            {/* Attach */}
            <PromptInputAction tooltip="Upload image">
              <button onClick={() => uploadRef.current?.click()}
                className="h-8 w-8 flex items-center justify-center rounded-full text-[#666] hover:text-[#aaa] hover:bg-white/[0.06] transition-all"
                disabled={isRecording}>
                <Paperclip className="h-4 w-4" />
                <input ref={uploadRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]); if (e.target) e.target.value = ''; }} />
              </button>
            </PromptInputAction>

            {/* Search */}
            <button type="button"
              onClick={() => { setShowSearch(p => !p); setShowThink(false); }}
              className={cn('rounded-full flex items-center gap-1 px-2 py-1 border h-8 transition-all',
                showSearch ? 'bg-[#1EAEDB]/10 border-[#1EAEDB]/50 text-[#1EAEDB]' : 'bg-transparent border-transparent text-[#666] hover:text-[#aaa]')}>
              <motion.div animate={{ rotate: showSearch ? 360 : 0, scale: showSearch ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 260, damping: 25 }}>
                <Globe className="w-4 h-4" />
              </motion.div>
              <AnimatePresence>
                {showSearch && (
                  <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="text-[11px] overflow-hidden whitespace-nowrap text-[#1EAEDB]">Search</motion.span>
                )}
              </AnimatePresence>
            </button>

            <CustomDivider />

            {/* Think */}
            <button type="button"
              onClick={() => { setShowThink(p => !p); setShowSearch(false); }}
              className={cn('rounded-full flex items-center gap-1 px-2 py-1 border h-8 transition-all',
                showThink ? 'bg-violet-500/10 border-violet-500/40 text-violet-400' : 'bg-transparent border-transparent text-[#666] hover:text-[#aaa]')}>
              <motion.div animate={{ rotate: showThink ? 360 : 0, scale: showThink ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 260, damping: 25 }}>
                <BrainCog className="w-4 h-4" />
              </motion.div>
              <AnimatePresence>
                {showThink && (
                  <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="text-[11px] overflow-hidden whitespace-nowrap text-violet-400">Think</motion.span>
                )}
              </AnimatePresence>
            </button>

            <CustomDivider />

            {/* Canvas */}
            <button type="button"
              onClick={() => setShowCanvas(p => !p)}
              className={cn('rounded-full flex items-center gap-1 px-2 py-1 border h-8 transition-all',
                showCanvas ? 'bg-orange-500/10 border-orange-500/40 text-orange-400' : 'bg-transparent border-transparent text-[#666] hover:text-[#aaa]')}>
              <motion.div animate={{ rotate: showCanvas ? 360 : 0, scale: showCanvas ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 260, damping: 25 }}>
                <FolderCode className="w-4 h-4" />
              </motion.div>
              <AnimatePresence>
                {showCanvas && (
                  <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="text-[11px] overflow-hidden whitespace-nowrap text-orange-400">Canvas</motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Send / mic / stop */}
          <PromptInputAction tooltip={isLoading ? 'Stop' : isRecording ? 'Stop recording' : hasContent ? 'Send' : 'Voice'}>
            <Button variant="default" size="icon"
              className={cn('h-8 w-8 rounded-full transition-all duration-200',
                isRecording ? 'bg-transparent text-red-500 hover:bg-white/[0.06]' :
                hasContent  ? 'bg-white hover:bg-white/80 text-black' :
                              'bg-transparent text-[#555] hover:text-[#aaa] hover:bg-white/[0.06]')}
              onClick={() => {
                if (isRecording)    setIsRecording(false);
                else if (hasContent) handleSubmit();
                else                 setIsRecording(true);
              }}
              disabled={isLoading && !hasContent}>
              {isLoading    ? <Square className="h-3.5 w-3.5 fill-black animate-pulse" /> :
               isRecording  ? <StopCircle className="h-4 w-4 text-red-500" /> :
               hasContent   ? <ArrowUp className="h-3.5 w-3.5 text-black" /> :
                              <Mic className="h-4 w-4" />}
            </Button>
          </PromptInputAction>
        </PromptInputActions>
      </PromptInput>

      <ImageViewDialog imageUrl={selImg} onClose={() => setSelImg(null)} />
    </>
  );
});
