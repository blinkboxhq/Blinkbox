import { Link } from 'react-router-dom';
import logo from '../../assets/logo.svg'; // Importing your actual logo

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* The Brand */}
        <div className="flex items-center gap-3">
          <img src={logo} alt="Blinkbox Logo" className="w-10 h-10 object-contain rounded-full" />
          <span className="text-2xl font-bold tracking-wide text-white">
            Blinkbox
          </span>
        </div>

        {/* Enterprise Nav Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300 tracking-wide">
          <a href="#features" className="hover:text-white transition-colors duration-300">Features</a>
          <a href="#integrations" className="hover:text-white transition-colors duration-300">Integrations</a>
          <a href="#pricing" className="hover:text-white transition-colors duration-300">Pricing</a>
          
          <div className="h-4 w-px bg-white/20"></div> {/* Divider */}
          
          <Link to="/dashboard" className="bg-white text-black px-6 py-2.5 font-bold rounded-md transition-all hover:bg-slate-200 hover:scale-105">
            Open Workspace
          </Link>
        </div>

      </div>
    </nav>
  );
}