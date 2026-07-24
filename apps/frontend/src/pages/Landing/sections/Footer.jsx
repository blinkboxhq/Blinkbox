import { Link } from 'react-router-dom';
import logo from '../../../assets/logo.svg';

const COLUMNS = [
  { title: 'Product', links: ['Features', 'Integrations', 'Pricing', 'Changelog'] },
  { title: 'Developers', links: ['Docs', 'API', 'Self-hosting', 'Status'] },
  { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.06] bg-[#08080a]">
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
