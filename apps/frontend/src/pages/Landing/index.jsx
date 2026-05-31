import { useEffect, useRef, useState, Component, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Bot, GitBranch, Check,
  Menu, X, Layers, Globe, MessageSquare, Lock,
  Database, Code2, RefreshCw,
  Webhook, Minus, Plus,
} from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';

import imgSlack from '../../assets/slack.png';
import imgGmail from '../../assets/gmail.png';
import imgStripe from '../../assets/stripe.svg';
import imgGithub from '../../assets/github.svg';
import imgNotion from '../../assets/notion.svg';
import imgHubspot from '../../assets/hubspot.svg';
import imgTypeform from '../../assets/typeform.svg';
import imgShopify from '../../assets/shopify.svg';
import imgDiscord from '../../assets/discord.png';
import imgTelegram from '../../assets/telegram.png';
import imgOpenai from '../../assets/openai.svg';
import imgJira from '../../assets/jira.svg';
import imgSalesforce from '../../assets/salesforce.svg';
import imgLinear from '../../assets/linear.svg';
import imgVercel from '../../assets/vercel.svg';
import imgPostgres from '../../assets/postgresql.svg';
import imgAnthropic from '../../assets/anthropic.svg';
import imgGemini from '../../assets/gemini-color.svg';
import logo from '../../assets/logo.svg';
import heroScreenshot from '../../assets/logos/landingpage-hero-screenshot.png';

// ─── Error boundary ───────────────────────────────────────────────────────────
class SilentBoundary extends Component {
  constructor(props) { super(props); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? null : this.props.children; }
}

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: threshold });
  return { ref, inView };
}

// ─── Animated counter ────────────────────────────────────────────────────────
function Counter({ to, suffix = '', duration = 2000 }) {
  const [val, setVal] = useState(0);
  const { ref, inView } = useReveal(0.5);
  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * to));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, to, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ─── 3D Node Graph Hero ───────────────────────────────────────────────────────

// Nodes in 3D space [x, y, z] — centered around origin
const GRAPH_NODES = [
  { id: 0, pos: [-2.2,  0.8,  0.5], label: 'Webhook',   sub: 'HTTP trigger',     icon: Webhook,       color: '#a78bfa', status: 'live'    },
  { id: 1, pos: [ 0.0,  1.4, -0.8], label: 'Filter',    sub: 'Condition check',  icon: GitBranch,     color: '#60a5fa', status: 'done'    },
  { id: 2, pos: [ 2.0,  0.6,  0.3], label: 'Slack',     sub: '#alerts',          icon: MessageSquare, color: '#34d399', status: 'done'    },
  { id: 3, pos: [-1.2, -1.0,  1.2], label: 'Database',  sub: 'Postgres write',   icon: Database,      color: '#f472b6', status: 'done'    },
  { id: 4, pos: [ 1.0, -1.2, -0.6], label: 'AI Agent',  sub: 'GPT-4o task',      icon: Bot,           color: '#fb923c', status: 'running' },
  { id: 5, pos: [-0.2,  0.1,  1.8], label: 'Code',      sub: 'Transform data',   icon: Code2,         color: '#facc15', status: 'done'    },
  { id: 6, pos: [ 2.2, -0.4, -1.4], label: 'Email',     sub: 'SendGrid',         icon: Globe,         color: '#38bdf8', status: 'done'    },
  { id: 7, pos: [-2.0, -0.2, -1.0], label: 'Encrypt',   sub: 'Vault store',      icon: Lock,          color: '#c084fc', status: 'done'    },
];

const GRAPH_EDGES = [
  [0, 1], [0, 5], [1, 2], [1, 3], [1, 4],
  [3, 5], [4, 6], [4, 7], [5, 2],
];

// Pulse packets travelling along edges
const PULSES = [
  { edge: [0, 1], color: '#a78bfa', speed: 0.6, offset: 0.0 },
  { edge: [0, 5], color: '#a78bfa', speed: 0.5, offset: 0.3 },
  { edge: [1, 2], color: '#60a5fa', speed: 0.7, offset: 0.6 },
  { edge: [1, 4], color: '#60a5fa', speed: 0.55, offset: 0.1 },
  { edge: [4, 6], color: '#fb923c', speed: 0.65, offset: 0.5 },
  { edge: [3, 5], color: '#f472b6', speed: 0.5, offset: 0.8 },
  { edge: [5, 2], color: '#facc15', speed: 0.6, offset: 0.2 },
];

function project(x, y, z, rotY, rotX, W, H) {
  // Rotate around Y axis
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const rx = x * cosY - z * sinY;
  const rz = x * sinY + z * cosY;
  // Rotate around X axis
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const ry = y * cosX - rz * sinX;
  const fz = y * sinX + rz * cosX;
  // Perspective
  const fov = 5;
  const scale = fov / (fov + fz + 2);
  return {
    sx: W / 2 + rx * scale * (W * 0.28),
    sy: H / 2 + ry * scale * (H * 0.38),
    scale,
    z: fz,
  };
}

function GridCanvas3D() {
  const canvasRef = useRef(null);
  const frameRef  = useRef(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      offsetRef.current = (offsetRef.current + 0.003) % 1;
      const t = offsetRef.current;

      const HORIZON_Y = H * 0.52;
      const VANISH_X  = W * 0.5;
      const SPREAD     = W * 1.8;
      const COLS       = 14;
      const ROWS       = 18;

      ctx.save();

      for (let r = 0; r <= ROWS; r++) {
        const frac = ((r / ROWS) + t) % 1;
        const depth = Math.pow(frac, 2.4);
        const y = HORIZON_Y + (H - HORIZON_Y) * depth;
        const halfW = SPREAD * 0.5 * depth;
        const alpha = Math.min(0.13, depth * 0.28) * (frac < 0.04 ? frac / 0.04 : 1);

        ctx.beginPath();
        ctx.moveTo(VANISH_X - halfW, y);
        ctx.lineTo(VANISH_X + halfW, y);
        ctx.strokeStyle = `rgba(139,92,246,${alpha})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      for (let c = 0; c <= COLS; c++) {
        const fracX = c / COLS - 0.5;
        const nearX  = VANISH_X + fracX * SPREAD;
        const alpha  = 0.055;

        ctx.beginPath();
        ctx.moveTo(VANISH_X, HORIZON_Y);
        ctx.lineTo(nearX, H);
        ctx.strokeStyle = `rgba(139,92,246,${alpha})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      const gradH = HORIZON_Y * 1.1;
      const glow = ctx.createLinearGradient(0, gradH, 0, H);
      glow.addColorStop(0, 'rgba(139,92,246,0.0)');
      glow.addColorStop(1, 'rgba(139,92,246,0.03)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, gradH, W, H - gradH);

      ctx.restore();

      frameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  );
}

function NodeGraph3D() {
  const canvasRef = useRef(null);
  const nodesRef  = useRef([]);
  const frameRef  = useRef(null);
  const rotY      = useRef(0.3);
  const rotX      = useRef(-0.18);
  const pulses    = useRef(PULSES.map(p => ({ ...p, t: p.offset })));
  const [projected, setProjected] = useState([]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    rotY.current += 0.0028;

    // Project all nodes
    const proj = GRAPH_NODES.map(n => ({
      ...n,
      ...project(n.pos[0], n.pos[1], n.pos[2], rotY.current, rotX.current, W, H),
    }));

    // Sort back-to-front for painter's algorithm
    proj.sort((a, b) => a.z - b.z);

    // Draw edges
    for (const [ai, bi] of GRAPH_EDGES) {
      const a = proj.find(p => p.id === ai);
      const b = proj.find(p => p.id === bi);
      const avgScale = (a.scale + b.scale) / 2;
      const alpha = Math.max(0.04, Math.min(0.18, avgScale * 0.14));
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw pulse packets
    pulses.current.forEach(pulse => {
      pulse.t = (pulse.t + pulse.speed * 0.004) % 1;
      const [ai, bi] = pulse.edge;
      const a = proj.find(p => p.id === ai);
      const b = proj.find(p => p.id === bi);
      const t = pulse.t;
      const px = a.sx + (b.sx - a.sx) * t;
      const py = a.sy + (b.sy - a.sy) * t;
      const ps = a.scale + (b.scale - a.scale) * t;
      // Glow
      const grad = ctx.createRadialGradient(px, py, 0, px, py, 8 * ps);
      grad.addColorStop(0, pulse.color + 'cc');
      grad.addColorStop(1, pulse.color + '00');
      ctx.beginPath();
      ctx.arc(px, py, 8 * ps, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      // Core dot
      ctx.beginPath();
      ctx.arc(px, py, 2.5 * ps, 0, Math.PI * 2);
      ctx.fillStyle = pulse.color;
      ctx.fill();
    });

    // Store for DOM node overlay
    nodesRef.current = proj;
    setProjected([...proj]);

    frameRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width  = rect.width  * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width  = rect.width  + 'px';
      canvas.style.height = rect.height + 'px';
      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);
    frameRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, [draw]);

  // Mouse drag to rotate
  const dragRef = useRef(null);
  const onMouseDown = (e) => { dragRef.current = { x: e.clientX, y: e.clientY, ry: rotY.current, rx: rotX.current }; };
  const onMouseMove = (e) => {
    if (!dragRef.current) return;
    rotY.current = dragRef.current.ry + (e.clientX - dragRef.current.x) * 0.007;
    rotX.current = dragRef.current.rx + (e.clientY - dragRef.current.y) * 0.004;
    rotX.current = Math.max(-0.6, Math.min(0.6, rotX.current));
  };
  const onMouseUp = () => { dragRef.current = null; };

  return (
    <div
      className="relative w-full select-none cursor-grab active:cursor-grabbing"
      style={{ height: 520 }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Canvas for edges + pulses */}
      <canvas ref={canvasRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />

      {/* DOM node cards overlaid on canvas */}
      {projected.map(node => {
        const W = canvasRef.current?.parentElement?.offsetWidth  || 900;
        const H = canvasRef.current?.parentElement?.offsetHeight || 520;
        const cardW = 112, cardH = 60;
        const left = node.sx - cardW / 2;
        const top  = node.sy - cardH / 2;
        const s    = Math.max(0.55, Math.min(1, node.scale * 1.8));
        const opacity = Math.max(0.25, Math.min(1, (node.scale + 0.1) * 2.2));
        return (
          <div
            key={node.id}
            className="absolute rounded-xl border border-white/[0.08] bg-[#0f0f0f] p-2.5 pointer-events-none"
            style={{
              left, top, width: cardW,
              transform: `scale(${s})`,
              transformOrigin: 'center center',
              opacity,
              transition: 'none',
              backdropFilter: 'blur(4px)',
              boxShadow: `0 0 20px ${node.color}18, inset 0 1px 0 rgba(255,255,255,0.04)`,
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: `${node.color}1a`, border: `1px solid ${node.color}30` }}>
                <node.icon className="w-2.5 h-2.5" style={{ color: node.color }} />
              </div>
              {node.status === 'live' && (
                <div className="relative w-1.5 h-1.5">
                  <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
                  <div className="relative rounded-full w-full h-full bg-emerald-500" />
                </div>
              )}
              {node.status === 'running' && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
              {node.status === 'done' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />}
            </div>
            <p className="text-[10px] font-semibold text-white leading-none">{node.label}</p>
            <p className="text-[8px] text-neutral-600 mt-0.5 leading-none">{node.sub}</p>
          </div>
        );
      })}

      {/* Drag hint */}
      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-neutral-700 pointer-events-none select-none">drag to rotate</p>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────
function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
      animate={{
        backgroundColor: scrolled ? 'rgba(8,8,8,0.92)' : 'transparent',
        borderBottomColor: scrolled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0)',
        backdropFilter: scrolled ? 'blur(16px)' : 'blur(0px)',
      }}
      style={{ borderBottomWidth: 1, borderBottomStyle: 'solid' }}
      transition={{ duration: 0.2 }}
    >
      <Link to="/" className="flex items-center gap-2.5">
        <img src={logo} alt="Blinkbox" className="w-6 h-6" />
        <span className="text-[15px] font-semibold text-white tracking-tight">Blinkbox</span>
      </Link>

      <div className="hidden md:flex items-center gap-7">
        {['Product', 'Integrations', 'Docs', 'Pricing'].map(item => (
          <Link key={item} to="#" className="text-[13px] text-neutral-500 hover:text-white transition-colors duration-150">
            {item}
          </Link>
        ))}
      </div>

      <div className="hidden md:flex items-center gap-3">
        <Link to="/login" className="text-[13px] text-neutral-500 hover:text-white transition-colors duration-150">Sign in</Link>
        <Link to="/register">
          <Button size="sm" className="text-[13px] h-8 px-4 rounded-lg">Get started free</Button>
        </Link>
      </div>

      <button className="md:hidden text-neutral-400" onClick={() => setMobileOpen(v => !v)}>
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 right-0 bg-[#080808]/95 backdrop-blur-xl border-b border-white/[0.06] p-6 flex flex-col gap-4"
          >
            {['Product', 'Integrations', 'Docs', 'Pricing'].map(item => (
              <Link key={item} to="#" className="text-[15px] text-neutral-400" onClick={() => setMobileOpen(false)}>{item}</Link>
            ))}
            <div className="flex flex-col gap-3 pt-4 border-t border-white/[0.06]">
              <Link to="/login" className="text-[15px] text-neutral-500">Sign in</Link>
              <Link to="/register"><Button className="w-full">Get started free</Button></Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ─── Scrolling logo strip ─────────────────────────────────────────────────────
const ALL_LOGOS = [
  { src: imgSlack, name: 'Slack' }, { src: imgGmail, name: 'Gmail' },
  { src: imgStripe, name: 'Stripe' }, { src: imgGithub, name: 'GitHub' },
  { src: imgNotion, name: 'Notion' }, { src: imgHubspot, name: 'HubSpot' },
  { src: imgTypeform, name: 'Typeform' }, { src: imgShopify, name: 'Shopify' },
  { src: imgDiscord, name: 'Discord' }, { src: imgTelegram, name: 'Telegram' },
  { src: imgOpenai, name: 'OpenAI' }, { src: imgJira, name: 'Jira' },
  { src: imgSalesforce, name: 'Salesforce' }, { src: imgLinear, name: 'Linear' },
  { src: imgVercel, name: 'Vercel' }, { src: imgPostgres, name: 'Postgres' },
  { src: imgAnthropic, name: 'Anthropic' }, { src: imgGemini, name: 'Gemini' },
];

function LogoStrip() {
  const doubled = [...ALL_LOGOS, ...ALL_LOGOS];
  return (
    <div className="relative overflow-hidden py-2">
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #080808, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #080808, transparent)' }} />
      <motion.div
        className="flex items-center gap-8"
        animate={{ x: [0, -(ALL_LOGOS.length * 88)] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        style={{ width: 'max-content' }}
      >
        {doubled.map((item, i) => (
          <div key={i} className="flex items-center gap-2 shrink-0">
            <img src={item.src} alt={item.name} className="w-4 h-4 object-contain opacity-30 grayscale" />
            <span className="text-[12px] text-neutral-600 font-medium">{item.name}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Integration grid ─────────────────────────────────────────────────────────
const GRID_LOGOS = [
  { src: imgSlack, name: 'Slack' }, { src: imgGmail, name: 'Gmail' },
  { src: imgStripe, name: 'Stripe' }, { src: imgGithub, name: 'GitHub' },
  { src: imgNotion, name: 'Notion' }, { src: imgHubspot, name: 'HubSpot' },
  { src: imgTypeform, name: 'Typeform' }, { src: imgShopify, name: 'Shopify' },
  { src: imgOpenai, name: 'OpenAI' }, { src: imgJira, name: 'Jira' },
  { src: imgSalesforce, name: 'Salesforce' }, { src: imgPostgres, name: 'Postgres' },
];

function IntegrationGrid() {
  return (
    <div className="grid grid-cols-3 gap-2.5 max-w-[300px]">
      {GRID_LOGOS.map((item, i) => (
        <motion.div
          key={item.name}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04, duration: 0.35, ease: 'easeOut' }}
          viewport={{ once: true, amount: 0.3 }}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-white/[0.07] bg-[#0f0f0f] hover:border-white/[0.14] transition-colors duration-200"
        >
          <img src={item.src} alt={item.name} className="w-5 h-5 object-contain" />
          <span className="text-[9px] text-neutral-600 font-medium">{item.name}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Scraper demo ─────────────────────────────────────────────────────────────
const SCRAPE_ROWS = [
  { company: 'Stripe', price: '$199/mo', status: 'Active', change: '+12%' },
  { company: 'Linear', price: '$8/seat', status: 'Active', change: '+5%' },
  { company: 'Vercel', price: '$20/mo', status: 'Active', change: '—' },
  { company: 'Resend', price: '$20/mo', status: 'Active', change: '+3%' },
];

function ScraperDemo() {
  const [rows, setRows] = useState([]);
  const { ref, inView } = useReveal(0.4);

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const tick = setInterval(() => {
      if (i < SCRAPE_ROWS.length) { setRows(r => [...r, SCRAPE_ROWS[i]]); i++; }
      else clearInterval(tick);
    }, 420);
    return () => clearInterval(tick);
  }, [inView]);

  return (
    <div ref={ref} className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] overflow-hidden w-full max-w-[480px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        <div className="flex gap-1.5">
          {[0.08, 0.06, 0.04].map((o, i) => <div key={i} className="w-2 h-2 rounded-full" style={{ background: `rgba(255,255,255,${o})` }} />)}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/[0.03] border border-white/[0.06]">
            <Globe className="w-3 h-3 text-neutral-600" />
            <span className="text-[10px] text-neutral-600 font-mono">pricing-monitor.blinkbox.run</span>
          </div>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>
      <div className="p-4">
        <p className="text-[10px] text-neutral-600 uppercase tracking-wider mb-3 font-semibold">Scraped · updated every 6h</p>
        <table className="w-full">
          <thead>
            <tr className="text-[9px] text-neutral-700 uppercase tracking-wider">
              <th className="text-left pb-2 font-semibold">Company</th>
              <th className="text-left pb-2 font-semibold">Price</th>
              <th className="text-left pb-2 font-semibold">Status</th>
              <th className="text-right pb-2 font-semibold">30d Δ</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {rows.map(row => (
                <motion.tr key={row.company}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
                  className="border-t border-white/[0.04]">
                  <td className="py-2 text-[12px] text-white font-medium">{row.company}</td>
                  <td className="py-2 text-[12px] text-neutral-400 font-mono">{row.price}</td>
                  <td className="py-2"><span className="text-[9px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium">{row.status}</span></td>
                  <td className="py-2 text-right text-[11px] text-neutral-500 font-mono">{row.change}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {rows.length < SCRAPE_ROWS.length && (
          <div className="flex items-center gap-2 mt-3">
            <div className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-[10px] text-neutral-700">Scraping…</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pricing comparison chart ─────────────────────────────────────────────────
function PricingChart() {
  const { ref, inView } = useReveal(0.4);

  const pts = [0, 2000, 5000, 10000, 20000, 50000];
  const zapierCost = (t) => Math.min(560, 20 + t * 0.0088);
  const bbCost = 29;
  const maxCost = 580;
  const maxTasks = 50000;

  const toX = (t) => 44 + (t / maxTasks) * 256;
  const toY = (c) => 155 - (c / maxCost) * 135;

  const zapPath = pts.map((t, i) => `${i === 0 ? 'M' : 'L'} ${toX(t).toFixed(1)} ${toY(zapierCost(t)).toFixed(1)}`).join(' ');
  const bbLine  = `M ${toX(0)} ${toY(bbCost)} L ${toX(50000)} ${toY(bbCost)}`;

  return (
    <div ref={ref} className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-6 w-full max-w-[480px]">
      <svg viewBox="0 0 320 180" className="w-full overflow-visible">
        {[0, 150, 300, 450].map(c => (
          <line key={c} x1="44" y1={toY(c)} x2="300" y2={toY(c)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}
        {[0, 200, 400].map(c => (
          <text key={c} x="38" y={toY(c) + 4} fill="rgba(255,255,255,0.18)" fontSize="9" textAnchor="end" fontFamily="monospace">${c}</text>
        ))}
        {[0, 25000, 50000].map(t => (
          <text key={t} x={toX(t)} y="172" fill="rgba(255,255,255,0.18)" fontSize="8" textAnchor="middle" fontFamily="monospace">
            {t >= 1000 ? `${t / 1000}k` : '0'}
          </text>
        ))}
        <text x="172" y="184" fill="rgba(255,255,255,0.12)" fontSize="8" textAnchor="middle">tasks / month</text>

        {inView && (
          <>
            <motion.path d={`${zapPath} L ${toX(50000)} ${toY(0)} L ${toX(0)} ${toY(0)} Z`}
              fill="rgba(255,255,255,0.025)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
            <motion.path d={zapPath} stroke="rgba(255,100,60,0.55)" strokeWidth="2" fill="none"
              strokeDasharray="400" strokeDashoffset="400"
              animate={{ strokeDashoffset: 0 }} transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }} />
            <motion.path d={bbLine} stroke="#a78bfa" strokeWidth="2.5" fill="none"
              strokeDasharray="280" strokeDashoffset="280"
              animate={{ strokeDashoffset: 0 }} transition={{ duration: 1.0, delay: 0.7, ease: 'easeOut' }} />
            <motion.text initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}
              x="298" y={toY(zapierCost(50000)) - 7} fill="rgba(255,100,60,0.65)" fontSize="9" textAnchor="end" fontFamily="sans-serif">
              Zapier ~$490/mo
            </motion.text>
            <motion.text initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
              x="298" y={toY(bbCost) - 7} fill="#a78bfa" fontSize="9" textAnchor="end" fontFamily="sans-serif">
              Blinkbox $29/mo
            </motion.text>
          </>
        )}
      </svg>
      <p className="text-[10px] text-neutral-700 mt-1 text-center">At 50k tasks/month · illustrative</p>
    </div>
  );
}

// ─── Feature block (alternating) ─────────────────────────────────────────────
function Feature({ eyebrow, headline, body, visual, flip = false }) {
  const { ref, inView } = useReveal();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col ${flip ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16`}
    >
      <div className="flex-1 max-w-[420px]">
        <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-widest mb-4">{eyebrow}</p>
        <h3 className="text-3xl font-bold text-white tracking-tight leading-tight mb-5 whitespace-pre-line">{headline}</h3>
        <p className="text-[15px] text-neutral-500 leading-relaxed">{body}</p>
      </div>
      <div className="flex-1 flex justify-center">
        {visual}
      </div>
    </motion.div>
  );
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06] py-5">
      <button className="flex items-center justify-between w-full text-left gap-4" onClick={() => setOpen(v => !v)}>
        <span className="text-[15px] font-medium text-white">{q}</span>
        <div className="shrink-0 w-5 h-5 flex items-center justify-center text-neutral-600">
          {open ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="text-[14px] text-neutral-500 leading-relaxed pt-4">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true, amount: 0.2 });

  return (
    <SilentBoundary>
      <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">
        <Header />

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden" style={{ minHeight: '100vh' }}>
          {/* Subtle radial glow — bottom right, where the screenshot sits */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 60% at 80% 60%, rgba(255,255,255,0.03) 0%, transparent 70%)' }} />

          <div className="relative z-10 w-full flex items-center" style={{ minHeight: '100vh' }}>

            {/* ── Left: text column — pushed to ~20% from left ── */}
            <div ref={heroRef} className="relative z-20 flex flex-col items-start flex-shrink-0 w-full max-w-[480px] py-32 ml-[8vw]">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
                animate={heroInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.1] bg-white/[0.03] mb-8"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                <span className="text-[11px] text-neutral-400 font-medium">Now in public beta — free to start</span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 24, filter: 'blur(12px)' }}
                animate={heroInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
                transition={{ duration: 0.75, delay: 0.07, ease: [0.16, 1, 0.3, 1] }}
                className="text-[56px] sm:text-[64px] font-bold leading-[1.0] tracking-[-0.03em] mb-6 text-white"
              >
                Build workflows<br />that run<br />themselves.
              </motion.h1>

              {/* Subline */}
              <motion.p
                initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
                animate={heroInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
                transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="text-[16px] text-neutral-500 leading-relaxed mb-10"
              >
                250+ integrations, AI agents, and logic routing —
                on a flat plan that never charges per task.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
                animate={heroInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
                transition={{ duration: 0.55, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3 mb-8"
              >
                <Link to="/register">
                  <Button className="h-11 px-6 text-[14px] rounded-lg bg-white text-black hover:bg-neutral-200">
                    Get started
                  </Button>
                </Link>
                <Link to="/docs">
                  <Button variant="ghost" className="h-11 px-6 text-[14px] rounded-lg text-neutral-400 hover:text-white">
                    Documentation
                  </Button>
                </Link>
              </motion.div>

              {/* Trust strip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={heroInView ? { opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.38 }}
                className="flex flex-col gap-2"
              >
                {['No credit card required', 'AES-256 encrypted', 'Self-hostable'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px] text-neutral-600">
                    <Check className="w-3 h-3 text-neutral-700 shrink-0" />
                    {item}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* ── Right: screenshot — oversized, bleeds off screen ── */}
            <motion.div
              initial={{ opacity: 0, x: 60, filter: 'blur(16px)' }}
              animate={heroInView ? { opacity: 1, x: 0, filter: 'blur(0px)' } : {}}
              transition={{ duration: 1.0, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-0 bottom-0 flex items-center"
              style={{ width: '58vw', marginRight: '-8vw' }}
            >
              {/* Right edge fade */}
              <div className="absolute inset-y-0 right-0 w-64 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to right, transparent, #080808)' }} />
              {/* Top fade */}
              <div className="absolute inset-x-0 top-0 h-24 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, #080808, transparent)' }} />
              {/* Bottom fade */}
              <div className="absolute inset-x-0 bottom-0 h-24 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to top, #080808, transparent)' }} />
              <div className="rounded-2xl border border-white/[0.08] overflow-hidden"
                style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.04), -40px 0 80px rgba(0,0,0,0.6), 0 40px 100px rgba(0,0,0,0.8)' }}>
                <img
                  src={heroScreenshot}
                  alt="Blinkbox workflow canvas"
                  className="w-full block"
                  style={{ objectFit: 'cover', objectPosition: 'top left' }}
                />
              </div>
            </motion.div>

          </div>
        </section>

        {/* ── STATS ────────────────────────────────────────────────────── */}
        <section className="py-16 px-6 border-y border-white/[0.05]">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-14">
              {[
                { n: 2300000, suf: '+', label: 'Executions / day' },
                { n: 250, suf: '+', label: 'Integrations' },
                { n: 99, suf: '.9%', label: 'Uptime SLA' },
                { n: 40, suf: 'ms', label: 'Median latency' },
              ].map(({ n, suf, label }) => (
                <div key={label} className="text-center">
                  <div className="text-3xl font-bold text-white tracking-tight mb-1">
                    <Counter to={n} suffix={suf} />
                  </div>
                  <div className="text-[12px] text-neutral-600">{label}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/[0.05] pt-10">
              <p className="text-center text-[11px] text-neutral-700 uppercase tracking-widest mb-6 font-semibold">
                Connects with everything you already use
              </p>
              <LogoStrip />
            </div>
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────────────────── */}
        <section className="py-32 px-6">
          <div className="max-w-5xl mx-auto flex flex-col gap-32">
            <Feature
              eyebrow="250+ native integrations"
              headline={'Every tool in\none canvas.'}
              body="Connect Slack, Gmail, Stripe, GitHub, and 246 more without a single line of code. Blinkbox's node canvas makes multi-step workflows visual and maintainable — no spaghetti scripts, no YAML."
              visual={<IntegrationGrid />}
            />
            <Feature
              flip
              eyebrow="Headless browser automation"
              headline={'Scrape any site.\nStructure any data.'}
              body="Blinkbox runs a full Chromium instance in the cloud. Extract competitor pricing, monitor news, scrape authenticated portals — anything a browser can see, your workflow can consume."
              visual={<ScraperDemo />}
            />
            <Feature
              eyebrow="Flat pricing"
              headline={'Scale without\nthe tax bill.'}
              body="Zapier bills per task. Blinkbox bills per month. At 50,000 monthly tasks, you'd pay ~$490 on Zapier. On Blinkbox, it's $29. Every month. That math never changes."
              visual={<PricingChart />}
            />
          </div>
        </section>

        {/* ── CAPABILITY GRID ───────────────────────────────────────────── */}
        <section className="py-20 px-6 border-y border-white/[0.05]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-white tracking-tight mb-4">Everything your stack needs</h2>
              <p className="text-[15px] text-neutral-500 max-w-md mx-auto">
                Blinkbox isn't one tool — it's the infrastructure layer between all of yours.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { icon: Bot,       color: '#a78bfa', label: 'AI Agents',       desc: 'Deploy Brian as a standalone agent that acts on triggers and makes decisions autonomously.' },
                { icon: Globe,     color: '#60a5fa', label: 'Headless Scraping', desc: 'Full-browser automation with Puppeteer, anti-bot evasion, and structured data output.' },
                { icon: GitBranch, color: '#34d399', label: 'Logic Routing',   desc: 'Conditional branches, merge gates, loops, and retry logic — no code needed.' },
                { icon: Code2,     color: '#fb923c', label: 'Code Sandbox',    desc: 'Drop into JavaScript or Python mid-workflow when no built-in node quite fits.' },
                { icon: Lock,      color: '#f472b6', label: 'Encrypted Vault', desc: 'AES-256 credential store for OAuth tokens, API keys, and secrets — never in plaintext.' },
                { icon: RefreshCw, color: '#facc15', label: 'Crash Recovery',  desc: 'Cursor-based execution resumes exactly where it left off after any server failure.' },
              ].map(({ icon: Icon, color, label, desc }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.5 }}
                  viewport={{ once: true, amount: 0.3 }}
                  className="p-5 rounded-2xl border border-white/[0.07] bg-[#0d0d0d] hover:border-white/[0.12] transition-colors duration-200"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${color}14`, border: `1px solid ${color}22` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <p className="text-[13px] font-semibold text-white mb-1.5">{label}</p>
                  <p className="text-[12px] text-neutral-600 leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ───────────────────────────────────────────────────── */}
        <section className="py-32 px-6" id="pricing">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white tracking-tight mb-4">One flat rate. No surprises.</h2>
              <p className="text-[15px] text-neutral-500">Run millions of tasks. Your bill doesn't move.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  name: 'Starter', price: 'Free', period: 'forever',
                  desc: 'For solo builders and side projects.',
                  features: ['5,000 executions / mo', '10 active workflows', '50+ integrations', 'Community support'],
                  cta: 'Start free', variant: 'outline', highlight: false,
                },
                {
                  name: 'Pro', price: '$29', period: '/ month',
                  desc: 'For teams serious about automation.',
                  features: ['Unlimited executions', 'Unlimited workflows', '250+ integrations', 'Brian AI builder', 'Headless scraping', 'Priority support'],
                  cta: 'Get started', variant: 'default', highlight: true,
                },
                {
                  name: 'Enterprise', price: 'Custom', period: '',
                  desc: 'For regulated and large-scale deployments.',
                  features: ['Everything in Pro', 'Self-hosting', 'SSO / SAML', 'SLA guarantees', 'Dedicated engineer'],
                  cta: 'Contact us', variant: 'outline', highlight: false,
                },
              ].map(plan => (
                <div key={plan.name}
                  className={`relative p-6 rounded-2xl border flex flex-col ${plan.highlight
                    ? 'border-violet-500/40 bg-violet-500/[0.05]'
                    : 'border-white/[0.07] bg-[#0d0d0d]'}`}>
                  {plan.highlight && (
                    <div className="absolute -top-px left-6 right-6 h-px"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)' }} />
                  )}
                  <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-3">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    {plan.period && <span className="text-[13px] text-neutral-600">{plan.period}</span>}
                  </div>
                  <p className="text-[13px] text-neutral-600 mb-6">{plan.desc}</p>
                  <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-[13px] text-neutral-400">
                        <Check className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={plan.name === 'Enterprise' ? '#' : '/register'}>
                    <Button variant={plan.variant} className="w-full rounded-xl h-10 text-[13px]">
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section className="py-20 px-6 border-t border-white/[0.05]">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-12">Questions</h2>
            {[
              {
                q: 'How is Blinkbox different from Zapier or Make?',
                a: "Zapier and Make charge per task, so your costs grow with usage. Blinkbox is flat — run 500 or 5,000,000 tasks for the same monthly price. We also ship first-class AI agents, headless browser automation, and a code sandbox that neither competitor has.",
              },
              {
                q: 'What is Brian AI?',
                a: "Brian is Blinkbox's built-in AI agent. It can build workflows from plain English descriptions, make decisions inside running workflows, and be deployed as a standalone agent that monitors triggers and acts without manual intervention.",
              },
              {
                q: 'Can I self-host Blinkbox?',
                a: 'Yes. The Enterprise plan includes full self-hosting support. Blinkbox runs on Node.js, MongoDB, and Redis — straightforward to deploy on your own infrastructure or private cloud.',
              },
              {
                q: 'Is my credential data safe?',
                a: 'All credentials (OAuth tokens, API keys, passwords) are stored in an AES-256 encrypted vault and are never logged or exposed in execution output. They are only decrypted at runtime, in memory, for the specific node that needs them.',
              },
              {
                q: 'What happens if a workflow fails mid-run?',
                a: 'Blinkbox uses a cursor-based execution engine with Redis locking. If a run is interrupted by a crash or restart, the resumer picks up exactly where it left off — no lost data, no duplicate processing.',
              },
            ].map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────────── */}
        <section className="py-32 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="relative inline-block mb-10">
              <div className="absolute inset-0 rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)' }} />
              <img src={logo} alt="Blinkbox" className="relative w-12 h-12" />
            </div>
            <h2 className="text-4xl font-bold text-white tracking-tight mb-5">
              Ready to stop duct-taping your stack?
            </h2>
            <p className="text-[16px] text-neutral-500 mb-10 max-w-md mx-auto">
              Replace the patchwork of scripts, Zapier zaps, and Make scenarios with one reliable engine.
            </p>
            <Link to="/register">
              <Button className="h-12 px-8 text-[15px] rounded-xl gap-2">
                Get started free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="text-[12px] text-neutral-700 mt-5">Free forever on Starter · No credit card</p>
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────────────────── */}
        <footer className="border-t border-white/[0.05] py-12 px-6">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src={logo} alt="Blinkbox" className="w-5 h-5" />
                <span className="text-[14px] font-semibold text-white">Blinkbox</span>
              </div>
              <p className="text-[12px] text-neutral-700 max-w-[220px]">
                The automation engine for teams that move fast.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-10">
              {[
                { header: 'Product',   links: ['Features', 'Integrations', 'Pricing', 'Changelog'] },
                { header: 'Resources', links: ['Docs', 'Blog', 'Templates', 'Status'] },
                { header: 'Company',   links: ['About', 'Privacy', 'Terms', 'Contact'] },
              ].map(col => (
                <div key={col.header}>
                  <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider mb-3">{col.header}</p>
                  {col.links.map(link => (
                    <Link key={link} to="#"
                      className="block text-[13px] text-neutral-700 hover:text-neutral-400 transition-colors mb-2">
                      {link}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="max-w-4xl mx-auto mt-12 pt-6 border-t border-white/[0.04] flex items-center justify-between">
            <p className="text-[12px] text-neutral-700">© 2025 Blinkbox. All rights reserved.</p>
            <p className="text-[12px] text-neutral-700">blinkbox.co.in</p>
          </div>
        </footer>
      </div>
    </SilentBoundary>
  );
}
