import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import logo from '../../../assets/logo.svg';

const ease = [0.22, 1, 0.36, 1];

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: '/product' },
      { label: 'Integrations', to: '/integrations' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'Docs', to: '/docs' },
      { label: 'API', to: '/api' },
      { label: 'Self-hosting', to: '/self-hosting' },
      { label: 'Status', to: '/status' },
    ],
  },
];

export default function Footer() {
  const reduce = useReducedMotion();
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.06] bg-[#08080a]">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-px w-[360px] -translate-x-1/2"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(111,151,232,0.6), transparent)' }}
      />
      {/* link columns */}
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, ease }}
            className="col-span-2"
          >
            <Link to="/" className="flex items-center gap-2.5">
              <img src={logo} alt="Blinkbox" className="h-7 w-7" />
              <span className="text-[15px] font-semibold tracking-tight text-[#fafafa]">blinkbox</span>
            </Link>
            <p className="mt-4 max-w-[260px] text-[13px] leading-relaxed text-[#6d6d6d]">
              The automation platform that builds itself. Replace Zapier, Make, and n8n — without the wiring.
            </p>
          </motion.div>

          {COLUMNS.map((col, i) => (
            <motion.div
              key={col.title}
              initial={{ opacity: 0, y: reduce ? 0 : 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, ease, delay: reduce ? 0 : 0.08 * (i + 1) }}
            >
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#8c8c8c]">{col.title}</p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-[13px] text-[#6d6d6d] transition-colors duration-150 hover:text-[#fafafa]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease, delay: reduce ? 0 : 0.2 }}
          className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row"
        >
          <p className="text-[12px] text-[#6d6d6d]">© {new Date().getFullYear()} Blinkbox. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-[12px] text-[#6d6d6d] transition-colors hover:text-[#b6b6b6]">Privacy</Link>
            <Link to="/terms" className="text-[12px] text-[#6d6d6d] transition-colors hover:text-[#b6b6b6]">Terms</Link>
            <Link to="/security" className="text-[12px] text-[#6d6d6d] transition-colors hover:text-[#b6b6b6]">Security</Link>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
