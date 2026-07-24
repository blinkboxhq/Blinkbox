import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import logo from '../../../assets/logo.svg';

const ease = [0.22, 1, 0.36, 1];

const LINKS = [
  { label: 'How it works', id: 'how' },
  { label: 'Pricing', id: 'pricing' },
];

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Header() {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (id) => {
    setOpen(false);
    scrollTo(id);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: reduce ? 0 : -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled || open
          ? 'border-b border-white/[0.07] bg-[#060608]/80 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-3.5 sm:px-8">
        {/* left — brand */}
        <Link to="/" className="group flex items-center gap-2.5">
          <img
            src={logo}
            alt="Blinkbox"
            className="h-6 w-6 transition-transform duration-300 group-hover:rotate-[8deg]"
            style={{ filter: 'drop-shadow(0 0 10px rgba(111,151,232,0.3))' }}
          />
          <span className="text-[14px] font-semibold tracking-tight text-[#fafafa]">blinkbox</span>
        </Link>

        {/* center — links (desktop) */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#8c8c8c] transition-colors duration-150 hover:bg-white/[0.05] hover:text-[#fafafa]"
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* right — actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <Link
            to="/login"
            className="hidden rounded-[10px] px-3.5 py-2 text-[13px] font-medium text-[#b6b6b6] transition-colors duration-150 hover:text-[#fafafa] sm:block"
          >
            Log in
          </Link>
          <Link
            to="/login"
            className="bb-btn bb-btn-primary group hidden items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold sm:flex"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.25} />
          </Link>

          {/* mobile toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#b6b6b6] transition-colors hover:bg-white/[0.05] hover:text-[#fafafa] md:hidden"
          >
            {open ? <X className="h-5 w-5" strokeWidth={2} /> : <Menu className="h-5 w-5" strokeWidth={2} />}
          </button>
        </div>
      </nav>

      {/* mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease }}
            className="overflow-hidden md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 pb-5 pt-1">
              {LINKS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => go(l.id)}
                  className="rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#b6b6b6] transition-colors hover:bg-white/[0.05] hover:text-[#fafafa]"
                >
                  {l.label}
                </button>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-white/[0.06] pt-4">
                <Link to="/login" className="bb-btn bb-btn-ghost justify-center py-2.5 text-[14px] font-medium">
                  Log in
                </Link>
                <Link to="/login" className="bb-btn bb-btn-primary justify-center rounded-full py-2.5 text-[14px] font-semibold">
                  Get started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
