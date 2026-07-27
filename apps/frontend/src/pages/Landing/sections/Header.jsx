import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Menu, X, ChevronDown } from 'lucide-react';
import logo from '../../../assets/logo.svg';
import githubLogo from '../../../assets/credentials/github.svg';

const REPO_URL = 'https://github.com/blinkboxhq/Blinkbox';

const ease = [0.22, 1, 0.36, 1];

const NAV = [
  {
    label: 'Product',
    items: [
      { label: 'Features', to: '/product' },
      { label: 'Integrations', to: '/integrations' },
    ],
  },
  {
    label: 'Developers',
    items: [
      { label: 'Docs', to: '/docs' },
      { label: 'API', to: '/api' },
      { label: 'Self-hosting', to: '/self-hosting' },
      { label: 'Status', to: '/status' },
    ],
  },
];

export default function Header() {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

        {/* center — dropdown groups (desktop) */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {NAV.map((group) => (
            <div
              key={group.label}
              className="relative"
              onMouseEnter={() => setMenu(group.label)}
              onMouseLeave={() => setMenu(null)}
            >
              <button
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                  menu === group.label ? 'bg-white/[0.05] text-[#fafafa]' : 'text-[#8c8c8c] hover:text-[#fafafa]'
                }`}
              >
                {group.label}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${menu === group.label ? 'rotate-180' : ''}`}
                  strokeWidth={2}
                />
              </button>
              <AnimatePresence>
                {menu === group.label && (
                  <motion.div
                    initial={{ opacity: 0, y: reduce ? 0 : 6, scale: reduce ? 1 : 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: reduce ? 0 : 6, scale: reduce ? 1 : 0.98 }}
                    transition={{ duration: 0.18, ease }}
                    className="absolute left-1/2 top-full w-[180px] -translate-x-1/2 pt-2"
                  >
                    <div className="rounded-xl border border-white/[0.08] bg-neutral-900/80 p-1.5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md">
                      {group.items.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMenu(null)}
                          className="block rounded-lg px-3 py-2 text-[13px] font-medium text-[#8c8c8c] transition-colors duration-150 hover:bg-white/[0.05] hover:text-[#fafafa]"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          {/* plain <a>: the section lives on "/", so this must work from the marketing pages too */}
          <a
            href="/#pricing"
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#8c8c8c] transition-colors duration-150 hover:text-[#fafafa]"
          >
            Pricing
          </a>
        </div>

        {/* right — actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            title="GitHub"
            className="hidden h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-white/[0.05] sm:flex"
          >
            <img src={githubLogo} alt="" className="h-[18px] w-[18px] opacity-60 transition-opacity duration-150 hover:opacity-100 [filter:brightness(0)_invert(1)]" />
          </a>
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
            <div className="flex flex-col gap-5 px-6 pb-5 pt-2">
              {NAV.map((group) => (
                <div key={group.label}>
                  <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6d6d6d]">
                    {group.label}
                  </p>
                  <div className="flex flex-col">
                    {group.items.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className="rounded-lg px-3 py-2 text-[14px] font-medium text-[#b6b6b6] transition-colors hover:bg-white/[0.05] hover:text-[#fafafa]"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <a
                href="/#pricing"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-[14px] font-medium text-[#b6b6b6] transition-colors hover:bg-white/[0.05] hover:text-[#fafafa]"
              >
                Pricing
              </a>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] font-medium text-[#b6b6b6] transition-colors hover:bg-white/[0.05] hover:text-[#fafafa]"
              >
                <img src={githubLogo} alt="" className="h-4 w-4 opacity-70 [filter:brightness(0)_invert(1)]" />
                GitHub
              </a>
              <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-4">
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
