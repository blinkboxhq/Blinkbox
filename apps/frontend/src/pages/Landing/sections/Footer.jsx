import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import logo from '../../../assets/logo.svg';

const ease = [0.22, 1, 0.36, 1];

const COLUMNS = [
  { title: 'Product', links: ['Features', 'Integrations', 'Pricing', 'Changelog'] },
  { title: 'Developers', links: ['Docs', 'API', 'Self-hosting', 'Status'] },
  { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
];

export default function Footer() {
  const reduce = useReducedMotion();
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.06] bg-[#08080a]">
      {/* final CTA band */}
      <div className="relative border-b border-white/[0.06] py-28">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-64 w-[680px] -translate-x-1/2 opacity-70 blur-[90px]"
          style={{ background: 'radial-gradient(circle, rgba(111,151,232,0.35), transparent 70%)' }}
        />
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease }}
          className="relative mx-auto max-w-[720px] px-6 text-center"
        >
          <h2 className="font-semibold tracking-[-0.02em] text-[#fafafa]" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)' }}>
            Automate the boring part.
          </h2>
          <p className="mx-auto mt-4 max-w-[440px] text-[15px] text-[#8c8c8c]">
            Your first workflow is running before your coffee’s cold. Free to start.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/login" className="bb-btn bb-btn-primary group flex items-center gap-2 px-6 py-3 text-[14px] font-semibold">
              Start building free
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.25} />
            </Link>
            <Link to="/login" className="bb-btn bb-btn-ghost px-6 py-3 text-[14px] font-medium">
              Book a demo
            </Link>
          </div>
        </motion.div>
      </div>

      {/* link columns */}
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4 md:grid-cols-5">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <img src={logo} alt="Blinkbox" className="h-7 w-7" />
              <span className="text-[15px] font-semibold tracking-tight text-[#fafafa]">blinkbox</span>
            </Link>
            <p className="mt-4 max-w-[260px] text-[13px] leading-relaxed text-[#6d6d6d]">
              The automation platform that builds itself. Replace Zapier, Make, and n8n — without the wiring.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#8c8c8c]">{col.title}</p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-[13px] text-[#6d6d6d] transition-colors duration-150 hover:text-[#fafafa]">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="text-[12px] text-[#6d6d6d]">© {new Date().getFullYear()} Blinkbox. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[12px] text-[#6d6d6d] transition-colors hover:text-[#b6b6b6]">Privacy</a>
            <a href="#" className="text-[12px] text-[#6d6d6d] transition-colors hover:text-[#b6b6b6]">Terms</a>
            <a href="#" className="text-[12px] text-[#6d6d6d] transition-colors hover:text-[#b6b6b6]">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
