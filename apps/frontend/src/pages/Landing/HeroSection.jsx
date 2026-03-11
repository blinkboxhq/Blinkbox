import { ArrowRight, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      
      {/* 🌌 THE LIVE MOVING CANVAS */}
      <div className="absolute inset-0 w-full h-full bg-[#050505] z-0">
        {/* The Breathing Core */}
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] animate-aura"></div>
        
        {/* The Infinitely Panning Grid */}
        <div className="absolute inset-0 bg-grid-pattern animate-grid [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]"></div>
      </div>

      {/* 💎 THE FOREGROUND CONTENT */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-sm font-medium mb-8">
          <Workflow className="w-4 h-4 text-blue-400" /> Enterprise Workflow Automation
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-white">
          Build scalable workflows. <br className="hidden md:block" /> 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
            Automate your business.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          Connect your apps, orchestrate data, and build complex automations visually. 
          BlinkBox gives you the power of code with the intuitive design of a node-based canvas.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          {/* Changed 'to="/dashboard"' to 'to="/login"' */}
          <Link 
            to="/login" 
            className="flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-500 transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:shadow-[0_0_40px_rgba(37,99,235,0.5)] hover:-translate-y-0.5"
          >
            Start Building <ArrowRight className="w-5 h-5" />
          </Link>
          
          <a 
            href="#documentation" 
            className="flex items-center gap-3 px-8 py-4 rounded-lg font-bold text-lg text-white border border-white/10 hover:bg-white/5 transition-all"
          >
            View Documentation
          </a>
        </div>
      </div>
    </section>
  );
}