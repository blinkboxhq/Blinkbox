import { useEffect, useRef, useState, Component } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Check, Minus, Plus, ArrowRight, Zap, Bot, Shield } from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DottedSurface } from '@/components/ui/dotted-surface';
import logo from '../../assets/logo.svg';
import heroScreenshot from '../../assets/landing-hero.png';

import imgSlack from '../../assets/slack.png';
import imgGmail from '../../assets/gmail.png';
import imgStripe from '../../assets/stripe.svg';
import imgGithub from '../../assets/github.svg';
import imgNotion from '../../assets/notion.svg';
import imgShopify from '../../assets/shopify.svg';
import imgDiscord from '../../assets/discord.png';
import imgTelegram from '../../assets/telegram.png';
import imgOpenai from '../../assets/openai.svg';
import imgJira from '../../assets/jira.svg';
import imgLinear from '../../assets/linear.svg';
import imgVercel from '../../assets/vercel.svg';
import imgPostgres from '../../assets/postgresql.svg';
import imgAnthropic from '../../assets/anthropic.svg';
import imgHubspot from '../../assets/hubspot.svg';
import imgFigma from '../../assets/figma.svg';
import imgSalesforce from '../../assets/salesforce.svg';
import imgGoogleSheets from '../../assets/google-sheets.svg';
import imgAirtable from '../../assets/Airtable--Streamline-Svg-Logos.svg';
import imgZoom from '../../assets/zoom.svg';
import imgTwilio from '../../assets/Twilio-Icon--Streamline-Svg-Logos.svg';
import imgTypeform from '../../assets/typeform.svg';

// ─── Error boundary ───────────────────────────────────────────────────────────
class SilentBoundary extends Component {
  constructor(props) { super(props); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? null : this.props.children; }
}



// ─── WebGL Lightning Background ──────────────────────────────────────────────
function LightningBg({ hue = 230, speed = 1.6, intensity = 0.55, size = 2 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; };
    resize();
    window.addEventListener('resize', resize);

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vert = `attribute vec2 aPosition; void main(){gl_Position=vec4(aPosition,0.0,1.0);}`;
    const frag = `
      precision mediump float;
      uniform vec2 iResolution; uniform float iTime;
      uniform float uHue,uSpeed,uIntensity,uSize;
      #define OCTAVE_COUNT 10
      vec3 hsv2rgb(vec3 c){vec3 rgb=clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0);return c.z*mix(vec3(1.0),rgb,c.y);}
      float hash11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
      float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
      mat2 rot2d(float t){float c=cos(t),s=sin(t);return mat2(c,-s,s,c);}
      float noise(vec2 p){vec2 ip=floor(p),fp=fract(p);float a=hash12(ip),b=hash12(ip+vec2(1,0)),c=hash12(ip+vec2(0,1)),d=hash12(ip+vec2(1,1));vec2 t=smoothstep(0.0,1.0,fp);return mix(mix(a,b,t.x),mix(c,d,t.x),t.y);}
      float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<OCTAVE_COUNT;++i){v+=a*noise(p);p*=rot2d(0.45);p*=2.0;a*=0.5;}return v;}
      void main(){
        vec2 uv=gl_FragCoord.xy/iResolution.xy;
        uv=2.0*uv-1.0; uv.x*=iResolution.x/iResolution.y;
        uv+=2.0*fbm(uv*uSize+0.8*iTime*uSpeed)-1.0;
        float dist=abs(uv.x);
        vec3 base=hsv2rgb(vec3(uHue/360.0,0.0,1.0));
        vec3 col=base*pow(mix(0.0,0.07,hash11(iTime*uSpeed))/dist,1.0)*uIntensity;
        gl_FragColor=vec4(col,1.0);
      }
    `;

    const compile = (src, type) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      return s;
    };
    const vs = compile(vert, gl.VERTEX_SHADER);
    const fs = compile(frag, gl.FRAGMENT_SHADER);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const ap = gl.getAttribLocation(prog, 'aPosition');
    gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'iResolution');
    const uTime = gl.getUniformLocation(prog, 'iTime');
    const uHueL = gl.getUniformLocation(prog, 'uHue');
    const uSpeedL = gl.getUniformLocation(prog, 'uSpeed');
    const uIntL = gl.getUniformLocation(prog, 'uIntensity');
    const uSizeL = gl.getUniformLocation(prog, 'uSize');

    const t0 = performance.now();
    let raf;
    const render = () => {
      resize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (performance.now() - t0) / 1000);
      gl.uniform1f(uHueL, hue);
      gl.uniform1f(uSpeedL, speed);
      gl.uniform1f(uIntL, intensity);
      gl.uniform1f(uSizeL, size);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };
    render();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [hue, speed, intensity, size]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

// ─── Typewriter ──────────────────────────────────────────────────────────────
const TYPEWRITER_WORDS = ['anything', 'Shopify orders', 'lead generation', 'data pipelines', 'support tickets', 'AI workflows'];

function Typewriter() {
  const [wordIdx, setWordIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [pause, setPause] = useState(false);

  useEffect(() => {
    if (pause) {
      const t = setTimeout(() => { setPause(false); setDeleting(true); }, 1800);
      return () => clearTimeout(t);
    }
    const word = TYPEWRITER_WORDS[wordIdx];
    if (!deleting) {
      if (displayed.length < word.length) {
        const t = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 60);
        return () => clearTimeout(t);
      } else {
        setPause(true);
      }
    } else {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 35);
        return () => clearTimeout(t);
      } else {
        setDeleting(false);
        setWordIdx(i => (i + 1) % TYPEWRITER_WORDS.length);
      }
    }
  }, [displayed, deleting, pause, wordIdx]);

  return (
    <span className="relative">
      <span className="text-blue-400">
        {displayed}
      </span>
      <span className="inline-block w-[2px] h-[0.85em] ml-[2px] align-middle rounded-sm animate-pulse bg-blue-400"
        style={{ verticalAlign: 'middle' }} />
    </span>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection({ heroRef, heroInView }) {
  return (
    <section className="relative overflow-hidden" style={{ minHeight: '100vh' }}>
      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.12]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* WebGL lightning — white, left only */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ maskImage: 'radial-gradient(ellipse 50% 60% at 10% 50%, black 0%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 50% 60% at 10% 50%, black 0%, transparent 100%)' }}>
        <LightningBg hue={0} speed={0.9} intensity={0.32} size={2.0} />
      </div>

      <div className="relative z-10 w-full flex items-center" style={{ minHeight: '100vh' }}>

        {/* ── Left: text ── */}
        <div ref={heroRef} className="relative z-20 flex flex-col items-start flex-shrink-0 w-full max-w-[520px] py-32 ml-[8vw]">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full mb-8"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset' }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400/60 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400" />
            </span>
            <span className="text-[11px] font-medium tracking-tight" style={{ color: '#b4b4b8' }}>Your competitors are already automating</span>
          </motion.div>

          {/* Headline with typewriter */}
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="font-bold leading-[1.05] tracking-[-0.03em] mb-4"
            style={{ fontSize: 'clamp(40px, 5vw, 68px)' }}
          >
            <span className="text-white">Automate </span><Typewriter /><br />
            <span style={{ background: 'linear-gradient(180deg, #ffffff 30%, #9a9aa3 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>in minutes.</span>
          </motion.h1>

          {/* Subline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="text-[16px] leading-relaxed mb-10"
            style={{ color: '#71717a', maxWidth: 420 }}
          >
            Blinkbox is a workflow automation platform. Visually connect your apps — Gmail, Google Drive, Calendar, Sheets, and 250+ more — to chain your APIs, databases, and AI agents together, running silently 24/7. <a href="#google-services" className="text-neutral-300 underline hover:text-white transition-colors">See what we do with your Google data</a> or read our <a href="/privacy" className="text-neutral-300 underline hover:text-white transition-colors">Privacy Policy</a>.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 mb-10"
          >
            <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer" className="group">
              <button className="h-11 px-6 text-[14px] font-semibold rounded-lg transition-all duration-200 hover:bg-neutral-200 active:scale-[0.98] inline-flex items-center gap-1.5"
                style={{ background: '#fff', color: '#000', boxShadow: '0 8px 24px rgba(255,255,255,0.12), 0 0 0 1px rgba(255,255,255,0.04)' }}>
                Start for free
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </a>
            <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer">
              <button className="h-11 px-5 text-[14px] font-medium rounded-lg border transition-all duration-200 hover:text-white hover:border-white/20 hover:bg-white/[0.04]"
                style={{ color: '#a1a1aa', borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                See how it works
              </button>
            </a>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={heroInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col gap-2"
          >
            {[
              'Saves teams 20+ hours every week',
              'Runs while you sleep — zero babysitting',
              'Free forever. Upgrade only when you scale.',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px]" style={{ color: '#52525b' }}>
                <div className="w-1 h-1 rounded-full shrink-0" style={{ background: '#555' }} />
                {item}
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Right: screenshot ── */}
        <motion.div
          initial={{ opacity: 0, x: 50, filter: 'blur(20px)' }}
          animate={heroInView ? { opacity: 1, x: 0, filter: 'blur(0px)' } : {}}
          transition={{ duration: 1.1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-0 bottom-0 flex items-center"
          style={{ left: '48vw', right: '-10vw' }}
        >
          {/* Subtle white glow behind screenshot */}
          <div className="absolute inset-0 pointer-events-none -z-10"
            style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.04) 0%, transparent 60%)', filter: 'blur(30px)' }} />
          {/* Right fade */}
          <div className="absolute inset-y-0 right-0 w-32 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to right, transparent, #080808)' }} />
          {/* Top fade */}
          <div className="absolute inset-x-0 top-0 h-20 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, #080808, transparent)' }} />
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-20 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to top, #080808, transparent)' }} />
          <img
            src={heroScreenshot}
            alt="Blinkbox workflow canvas"
            className="w-full block rounded-2xl"
            style={{ opacity: 0.8, boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(255,255,255,0.04)' }}
          />
        </motion.div>

      </div>
    </section>
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
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
      <motion.nav
        className="flex items-center justify-between gap-6 px-5 py-2.5 rounded-xl border border-white/[0.08]"
        animate={{
          backgroundColor: scrolled ? 'rgba(12,12,12,0.92)' : 'rgba(12,12,12,0.7)',
          backdropFilter: 'blur(20px)',
        }}
        style={{ width: '100%', maxWidth: 860 }}
        transition={{ duration: 0.2 }}
      >
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="Blinkbox" className="w-5 h-5" />
          <span className="text-[14px] font-semibold text-white tracking-tight">Blinkbox</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {[['Product','/product'],['Integrations','/integrations'],['Docs','/docs'],['Pricing','#pricing']].map(([item,href]) => (
            <a key={item} href={href} className="text-[13px] text-neutral-400 hover:text-white transition-colors duration-150">
              {item}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <div className="w-px h-4 bg-white/[0.1] mx-1" />
          <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer" className="text-[13px] text-neutral-400 hover:text-white transition-colors duration-150 px-2">Log in</a>
          <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer">
            <button className="text-[13px] font-medium text-black bg-white hover:bg-neutral-200 transition-colors duration-150 px-3.5 py-1.5 rounded-lg">
              Sign up
            </button>
          </a>
        </div>

        <button className="md:hidden text-neutral-400" onClick={() => setMobileOpen(v => !v)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-4 right-4 mt-2 bg-[#0c0c0c]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4"
          >
            {[['Product','/product'],['Integrations','/integrations'],['Docs','/docs'],['Pricing','#pricing']].map(([item,href]) => (
              <a key={item} href={href} className="text-[15px] text-neutral-400" onClick={() => setMobileOpen(false)}>{item}</a>
            ))}
            <div className="flex flex-col gap-3 pt-4 border-t border-white/[0.06]">
              <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer" className="text-[15px] text-neutral-500">Log in</a>
              <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer"><Button className="w-full rounded-full">Sign up</Button></a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Logo Strip ───────────────────────────────────────────────────────────────
const LOGOS = [
  { src: imgSlack,        name: 'Slack' },
  { src: imgGmail,        name: 'Gmail' },
  { src: imgStripe,       name: 'Stripe' },
  { src: imgGithub,       name: 'GitHub' },
  { src: imgNotion,       name: 'Notion' },
  { src: imgShopify,      name: 'Shopify' },
  { src: imgOpenai,       name: 'OpenAI' },
  { src: imgAnthropic,    name: 'Anthropic' },
  { src: imgJira,         name: 'Jira' },
  { src: imgLinear,       name: 'Linear' },
  { src: imgVercel,       name: 'Vercel' },
  { src: imgPostgres,     name: 'Postgres' },
  { src: imgHubspot,      name: 'HubSpot' },
  { src: imgFigma,        name: 'Figma' },
  { src: imgSalesforce,   name: 'Salesforce' },
  { src: imgGoogleSheets, name: 'Sheets' },
  { src: imgAirtable,     name: 'Airtable' },
  { src: imgZoom,         name: 'Zoom' },
  { src: imgTwilio,       name: 'Twilio' },
  { src: imgTypeform,     name: 'Typeform' },
  { src: imgDiscord,      name: 'Discord' },
  { src: imgTelegram,     name: 'Telegram' },
];

function LogoStrip() {
  const track = [...LOGOS, ...LOGOS];
  return (
    <div className="relative overflow-hidden py-12" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Left fade */}
      <div className="absolute inset-y-0 left-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #080808, transparent)' }} />
      {/* Right fade */}
      <div className="absolute inset-y-0 right-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #080808, transparent)' }} />

      <p className="text-center text-[11px] font-semibold text-neutral-600 uppercase tracking-widest mb-6">
        Connects with everything you already use
      </p>

      <div className="flex overflow-hidden group/strip">
        <motion.div
          className="flex gap-10 items-center shrink-0"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          style={{ animationPlayState: 'running' }}
          whileHover={{ transition: { duration: 0 } }}
        >
          {track.map((l, i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0 group cursor-pointer">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <img src={l.src} alt={l.name} className="w-6 h-6 object-contain transition-all duration-200" />
              </div>
              <span className="text-[10px] text-neutral-600 font-medium whitespace-nowrap group-hover:text-neutral-300 transition-colors duration-200">{l.name}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// ─── Features (scroll-expose) ─────────────────────────────────────────────────
const FEATURES = [
  {
    label: 'Connect anything',
    headline: '250+ integrations,\nzero config.',
    body: 'Slack, Gmail, Stripe, GitHub, Notion — every tool your team uses, wired in seconds. Blinkbox speaks every API so you don\'t have to.',
    visual: { type: 'network' },
  },
  {
    label: 'Build flows visually',
    headline: 'Drag. Drop.\nDone.',
    body: 'Visual canvas maps out logic, branches, loops and AI steps without code. If you can draw a flowchart, you can ship an automation.',
    visual: { type: 'canvas' },
  },
  {
    label: 'AI agents built-in',
    headline: 'Your AI co-worker,\nnot a chatbot.',
    body: 'Embed GPT-4, Claude, or any model inside any workflow. Summarize, classify, generate — AI steps chain into the rest of your automation naturally.',
    visual: { type: 'ai' },
  },
  {
    label: 'Run at any scale',
    headline: 'Millions of runs.\nFlat price.',
    body: 'Cursor-based execution with Redis crash recovery restarts exactly where it left off. No lost data. No duplicate runs. No surprise bills.',
    visual: { type: 'metrics' },
  },
  {
    label: 'Observe everything',
    headline: 'Full execution\nhistory.',
    body: 'Every run logged step-by-step. See exactly what happened, what data flowed, where it failed — and replay any execution in one click.',
    visual: { type: 'log' },
  },
];

function FeatureVisualNetwork({ progress }) {
  const apps = [
    { label: 'Slack', color: '#4A154B', x: 50, y: 18 },
    { label: 'Gmail', color: '#EA4335', x: 18, y: 52 },
    { label: 'Stripe', color: '#635BFF', x: 82, y: 52 },
    { label: 'GitHub', color: '#24292e', x: 33, y: 82 },
    { label: 'Notion', color: '#000', x: 67, y: 82 },
  ];
  const edges = [[0,1],[0,2],[1,3],[2,4],[1,4]];
  return (
    <div className="relative w-full h-full">
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        {edges.map(([a, b], i) => (
          <motion.line key={i}
            x1={`${apps[a].x}%`} y1={`${apps[a].y}%`}
            x2={`${apps[b].x}%`} y2={`${apps[b].y}%`}
            stroke="rgba(255,255,255,0.08)" strokeWidth="1"
            initial={{ opacity: 0 }}
            animate={{ opacity: progress > 0.1 ? 1 : 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
          />
        ))}
      </svg>
      {apps.map((app, i) => (
        <motion.div key={i}
          className="absolute flex flex-col items-center gap-1.5"
          style={{ left: `${app.x}%`, top: `${app.y}%`, transform: 'translate(-50%,-50%)' }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: progress > i * 0.12 ? 1 : 0, scale: progress > i * 0.12 ? 1 : 0.6 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: app.color, border: '1px solid rgba(255,255,255,0.12)' }}>
            {app.label[0]}
          </div>
          <span className="text-[10px] text-neutral-600 font-medium">{app.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function FeatureVisualCanvas({ progress }) {
  const nodes = [
    { x: 12, y: 50, label: 'Webhook', icon: '⚡', w: 88 },
    { x: 42, y: 30, label: 'Filter', icon: '⚙', w: 72 },
    { x: 42, y: 70, label: 'Delay', icon: '⏱', w: 72 },
    { x: 72, y: 30, label: 'Slack', icon: '💬', w: 72 },
    { x: 72, y: 70, label: 'Email', icon: '✉', w: 72 },
  ];
  const edges = [[0,1],[0,2],[1,3],[2,4]];
  return (
    <div className="relative w-full h-full">
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        {edges.map(([a, b], i) => (
          <motion.line key={i}
            x1={`${nodes[a].x + 4}%`} y1={`${nodes[a].y}%`}
            x2={`${nodes[b].x - 4}%`} y2={`${nodes[b].y}%`}
            stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3 3"
            initial={{ opacity: 0 }} animate={{ opacity: progress > 0.15 ? 1 : 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          />
        ))}
      </svg>
      {nodes.map((n, i) => (
        <motion.div key={i}
          className="absolute flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px]"
          style={{ left: `${n.x}%`, top: `${n.y}%`, transform: 'translate(-50%,-50%)', width: n.w, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: progress > i * 0.15 ? 1 : 0, y: progress > i * 0.15 ? 0 : 8 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <span>{n.icon}</span>
          <span className="text-neutral-400 font-medium truncate">{n.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function FeatureVisualAI({ progress }) {
  const msgs = [
    { side: 'right', text: 'Classify this support ticket and set priority.' },
    { side: 'left', text: 'Priority: High\nCategory: Billing\nSentiment: Frustrated' },
    { side: 'system', text: 'Routed → billing-team channel ✓' },
  ];
  return (
    <div className="w-full h-full flex flex-col justify-center gap-2.5 px-5 py-5">
      {msgs.map((m, i) => (
        <motion.div key={i}
          className={`flex ${m.side === 'right' ? 'justify-end' : 'justify-start'}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: progress > i * 0.28 ? 1 : 0, y: progress > i * 0.28 ? 0 : 6 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {m.side === 'system'
            ? <span className="text-[11px] text-neutral-600 italic mx-auto">{m.text}</span>
            : <div className="max-w-[85%] px-3 py-2 rounded-2xl text-[12px] leading-relaxed"
                style={m.side === 'right'
                  ? { background: 'rgba(255,255,255,0.07)', color: '#d4d4d4', border: '1px solid rgba(255,255,255,0.1)' }
                  : { background: 'rgba(255,255,255,0.03)', color: '#737373', border: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'pre-line' }
                }>{m.text}</div>
          }
        </motion.div>
      ))}
      <motion.div className="flex items-center gap-2 mt-1"
        initial={{ opacity: 0 }} animate={{ opacity: progress > 0.85 ? 1 : 0 }}
        transition={{ duration: 0.3 }}>
        <div className="flex gap-0.5">
          {[0,1,2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }} />
          ))}
        </div>
        <span className="text-[10px] text-neutral-700">AI processing…</span>
      </motion.div>
    </div>
  );
}

function FeatureVisualMetrics({ progress }) {
  const bars = [
    { h: 0.4, label: 'Mon' }, { h: 0.65, label: 'Tue' }, { h: 0.5, label: 'Wed' },
    { h: 0.85, label: 'Thu' }, { h: 0.6, label: 'Fri' }, { h: 0.9, label: 'Sat' }, { h: 1.0, label: 'Sun' },
  ];
  return (
    <div className="w-full h-full flex flex-col justify-end px-5 py-5 gap-3">
      <div className="flex items-end gap-1.5" style={{ height: 120 }}>
        {bars.map((b, i) => (
          <motion.div key={i} className="flex-1 rounded-t"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: progress > i * 0.08 ? 1 : 0 }}
            transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            style={{ height: `${b.h * 100}%`, transformOrigin: 'bottom', background: `rgba(255,255,255,${0.04 + b.h * 0.16})`, border: '1px solid rgba(255,255,255,0.07)', borderRadius: '3px 3px 0 0' }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {bars.map(b => <span key={b.label} className="text-[9px] text-neutral-700">{b.label}</span>)}
      </div>
      <div className="flex items-center justify-between pt-2.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div>
          <div className="text-[10px] text-neutral-600 mb-0.5">Runs this week</div>
          <motion.div className="text-[18px] font-semibold text-white"
            initial={{ opacity: 0 }} animate={{ opacity: progress > 0.6 ? 1 : 0 }}
            transition={{ duration: 0.4 }}>2,847,301</motion.div>
        </div>
        <motion.div className="text-[11px] px-2 py-1 rounded-lg"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', color: '#4ade80' }}
          initial={{ opacity: 0 }} animate={{ opacity: progress > 0.7 ? 1 : 0 }}>
          ↑ 18%
        </motion.div>
      </div>
    </div>
  );
}

function FeatureVisualLog({ progress }) {
  const steps = [
    { label: 'Webhook received', ms: '1ms', out: '{ event: "payment.success" }' },
    { label: 'Filter: is_paying', ms: '2ms', out: 'true' },
    { label: 'Stripe → fetch invoice', ms: '187ms', out: 'inv_3Ps9X2…' },
    { label: 'Transform output', ms: '4ms', out: '{ amount: 4900, … }' },
    { label: 'Slack notify', ms: '54ms', out: 'ok' },
  ];
  return (
    <div className="w-full h-full flex flex-col justify-center gap-1 px-4 py-5">
      {steps.map((s, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: progress > i * 0.14 ? 1 : 0, x: progress > i * 0.14 ? 0 : -10 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#22c55e' }} />
          <span className="text-[12px] text-neutral-400 flex-1">{s.label}</span>
          <span className="text-[10px] font-mono text-neutral-600 shrink-0">{s.ms}</span>
        </motion.div>
      ))}
      <motion.div className="flex items-center justify-between mt-2 pt-2 border-t text-[11px]"
        style={{ borderColor: 'rgba(255,255,255,0.05)' }}
        initial={{ opacity: 0 }} animate={{ opacity: progress > 0.75 ? 1 : 0 }}
        transition={{ duration: 0.3 }}>
        <span className="text-neutral-600">Total duration</span>
        <span className="text-white font-medium">248ms</span>
      </motion.div>
    </div>
  );
}

function FeatureVisual({ feature, progress }) {
  const t = feature.visual.type;
  if (t === 'network') return <FeatureVisualNetwork progress={progress} />;
  if (t === 'canvas')  return <FeatureVisualCanvas progress={progress} />;
  if (t === 'ai')      return <FeatureVisualAI progress={progress} />;
  if (t === 'metrics') return <FeatureVisualMetrics progress={progress} />;
  if (t === 'log')     return <FeatureVisualLog progress={progress} />;
  return null;
}

function FeaturesSection() {
  const sectionRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const totalH = sectionRef.current.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const pct = Math.max(0, Math.min(1, scrolled / totalH));
      const idx = Math.min(FEATURES.length - 1, Math.floor(pct * FEATURES.length));
      const localPct = (pct * FEATURES.length) - idx;
      setActiveIdx(idx);
      setStepProgress(localPct);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section ref={sectionRef} style={{ height: `${FEATURES.length * 80}vh` }} className="relative">
      <div className="sticky top-0 h-screen flex items-center bg-[#080808]">
        <div className="w-full max-w-6xl mx-auto px-8 grid grid-cols-2 gap-16 items-center">

          {/* Left: text */}
          <div className="flex flex-col">
            {/* Step pills */}
            <div className="flex items-center gap-3 mb-8">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500"
                    style={{
                      background: i === activeIdx ? '#fff' : 'transparent',
                      color: i === activeIdx ? '#000' : '#555',
                      border: i === activeIdx ? '1px solid #fff' : '1px solid #333',
                    }}
                  >
                    {i + 1}
                  </div>
                  {i < FEATURES.length - 1 && (
                    <div className="w-8 h-px" style={{ background: i < activeIdx ? '#fff' : '#222' }} />
                  )}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeIdx}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="text-[11px] font-bold text-neutral-600 uppercase tracking-widest mb-4">
                  {FEATURES[activeIdx].label}
                </p>
                <h2 className="text-[42px] font-bold text-white tracking-tight leading-[1.08] mb-6"
                  style={{ whiteSpace: 'pre-line' }}>
                  {FEATURES[activeIdx].headline}
                </h2>
                <p className="text-[16px] text-neutral-500 leading-relaxed max-w-[380px]">
                  {FEATURES[activeIdx].body}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: 3D-style card with visual */}
          <div className="relative flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIdx}
                initial={{ opacity: 0, rotateY: -15, scale: 0.92 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                exit={{ opacity: 0, rotateY: 15, scale: 0.92 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{ perspective: '800px', transformStyle: 'preserve-3d', width: '100%', maxWidth: 420, height: 360 }}
              >
                <div className="relative rounded-3xl overflow-hidden w-full h-full"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
                  {/* Top-left accent line */}
                  <div className="absolute top-0 left-8 right-8 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
                  <FeatureVisual feature={FEATURES[activeIdx]} progress={stepProgress} />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Floating glow */}
            <div className="absolute inset-0 pointer-events-none -z-10 rounded-3xl"
              style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 70%)', filter: 'blur(40px)' }} />
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    desc: 'For solo builders and side projects.',
    features: ['5,000 executions / mo', '10 active workflows', '50+ integrations', 'Community support'],
    cta: 'Get started free',
    href: 'https://blinkbox.net/login',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/ month',
    desc: 'For teams serious about automation.',
    features: ['Unlimited executions', 'Unlimited workflows', '250+ integrations', 'AI agent builder', 'Headless scraping', 'Priority support'],
    cta: 'Start Pro',
    href: 'https://blinkbox.net/login',
    highlight: true,
  },
];

function PricingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  return (
    <section ref={ref} className="py-16 px-6" id="pricing">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10"
        >
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-[40px] font-bold text-white tracking-tight leading-tight mb-4">One flat rate.<br />No surprises.</h2>
          <p className="text-[15px] text-neutral-500">Run millions of tasks. Your bill doesn't move.</p>
        </motion.div>
        <div className="grid md:grid-cols-2 max-w-2xl mx-auto gap-4 w-full">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col p-6 rounded-2xl border"
              style={{
                background: plan.highlight ? 'rgba(255,255,255,0.03)' : '#0d0d0d',
                borderColor: plan.highlight ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
              }}
            >
              {plan.highlight && (
                <div className="absolute -top-px left-6 right-6 h-px"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
              )}
              <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-4">{plan.name}</p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-[32px] font-bold text-white">{plan.price}</span>
                {plan.period && <span className="text-[13px] text-neutral-500">{plan.period}</span>}
              </div>
              <p className="text-[13px] text-neutral-500 mb-6">{plan.desc}</p>
              <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-[13px] text-neutral-400">
                    <Check className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a href={plan.href} target="_blank" rel="noopener noreferrer">
                <button
                  className="w-full h-10 rounded-xl text-[13px] font-semibold transition-all duration-200"
                  style={plan.highlight
                    ? { background: '#fff', color: '#000' }
                    : { background: 'transparent', color: '#a3a3a3', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {plan.cta}
                </button>
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Google Services ──────────────────────────────────────────────────────────
function GoogleServicesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  const services = [
    {
      name: 'Gmail',
      color: '#EA4335',
      description: 'Send emails, read and parse incoming messages, trigger workflows on new mail, and auto-reply based on conditions you set.',
    },
    {
      name: 'Google Calendar',
      color: '#4285F4',
      description: 'Create, update, and delete calendar events automatically. Trigger workflows when meetings are scheduled, rescheduled, or cancelled.',
    },
    {
      name: 'Google Drive',
      color: '#34A853',
      description: 'Upload, download, move, and organize files. Trigger automations when files are added or modified in specific folders.',
    },
    {
      name: 'Google Sheets',
      color: '#0F9D58',
      description: 'Read rows, append data, update cells, and build live dashboards — no code. Sync any external data source directly into your spreadsheets.',
    },
    {
      name: 'Google Docs',
      color: '#4285F4',
      description: 'Create documents from templates, append content, and extract text programmatically as part of larger automated workflows.',
    },
    {
      name: 'Google Forms',
      color: '#7B1FA2',
      description: 'Trigger workflows the moment a form is submitted. Route responses, notify team members, and store data wherever you need it.',
    },
  ];

  return (
    <section ref={ref} id="google-services" className="py-20 px-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12"
        >
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest mb-3">Google Workspace</p>
          <h2 className="text-[34px] font-bold text-white tracking-tight leading-tight mb-4">
            What Blinkbox does with<br />your Google account
          </h2>
          <p className="text-[15px] text-neutral-500 max-w-2xl leading-relaxed">
            Blinkbox is a workflow automation platform. When you connect your Google account via OAuth, Blinkbox
            acts on your behalf — reading, writing, and triggering actions in Google services — only for the
            automations you explicitly configure. Your data is never sold or shared. Access is scoped to exactly
            what each workflow requires.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {services.map((svc, i) => (
            <motion.div
              key={svc.name}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl p-5 border"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ background: svc.color + '22', border: `1px solid ${svc.color}40` }}>
                  <span style={{ color: svc.color }}>{svc.name[0]}</span>
                </div>
                <span className="text-[13px] font-semibold text-white">{svc.name}</span>
              </div>
              <p className="text-[12px] text-neutral-500 leading-relaxed">{svc.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-[12px] text-neutral-700 mt-8"
        >
          Blinkbox's use of Google user data complies with the{' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer"
            className="text-neutral-500 hover:text-white underline transition-colors">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </motion.p>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b py-5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <button className="flex items-center justify-between w-full text-left gap-4" onClick={() => setOpen(v => !v)}>
        <span className="text-[15px] font-medium text-white">{q}</span>
        <div className="shrink-0 text-neutral-600">
          {open ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <p className="text-[14px] text-neutral-500 leading-relaxed pt-4">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FaqSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  return (
    <section ref={ref} className="py-14 px-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="max-w-2xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-[32px] font-bold text-white tracking-tight mb-8"
        >Questions</motion.h2>
        {[
          { q: 'How is Blinkbox different from Zapier or Make?', a: "Zapier and Make charge per task — your costs grow with usage. Blinkbox is flat. Run 500 or 5,000,000 tasks for the same monthly price. We also ship first-class AI agents, headless browser automation, and a code sandbox." },
          { q: 'What happens if a workflow fails mid-run?', a: "Blinkbox uses a cursor-based execution engine with Redis locking. If a run is interrupted, the resumer picks up exactly where it left off — no lost data, no duplicate processing." },
          { q: 'Is my credential data safe?', a: "All credentials are stored in an AES-256 encrypted vault and are never logged or exposed in execution output. They are only decrypted at runtime, in memory, for the specific node that needs them." },
          { q: 'Can I self-host Blinkbox?', a: "Yes. Blinkbox is open-architecture — it runs on Node.js, MongoDB, and Redis, making it straightforward to deploy on your own infrastructure. Reach out for self-hosting guidance." },
        ].map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t py-10 px-6" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
          <div className="max-w-[200px]">
            <div className="flex items-center gap-2 mb-3">
              <img src={logo} alt="Blinkbox" className="w-5 h-5" />
              <span className="text-[14px] font-semibold text-white">Blinkbox</span>
            </div>
            <p className="text-[12px] text-neutral-600">The automation engine for teams that move fast.</p>
          </div>
          <div className="grid grid-cols-3 gap-10">
            {[
              { header: 'Product',   links: [{ label: 'Features', href: '/product' }, { label: 'Integrations', href: '/integrations' }, { label: 'Pricing', href: '#pricing' }, { label: 'Changelog', href: 'https://blinkbox.net/login' }] },
              { header: 'Resources', links: [{ label: 'Docs', href: '/docs' }, { label: 'Blog', href: 'https://blinkbox.net/login' }, { label: 'Templates', href: 'https://blinkbox.net/login' }, { label: 'Status', href: 'https://blinkbox.net/login' }] },
              { header: 'Company',   links: [{ label: 'About', href: '#' }, { label: 'Privacy', href: '/policy' }, { label: 'Terms', href: '/terms' }, { label: 'Contact', href: 'mailto:blinkbox.co.in@gmail.com' }] },
            ].map(col => (
              <div key={col.header}>
                <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider mb-3">{col.header}</p>
                {col.links.map(link => (
                  <a key={link.label} href={link.href}
                    {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="block text-[13px] text-neutral-600 hover:text-neutral-300 transition-colors mb-2">
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          <p className="text-[12px] text-neutral-700">© 2025 Blinkbox. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="/policy" className="text-[12px] text-neutral-700 hover:text-neutral-400 transition-colors">Privacy Policy</a>
            <a href="/terms" className="text-[12px] text-neutral-700 hover:text-neutral-400 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function CtaSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <section ref={ref} className="relative py-20 px-6 overflow-hidden">
      <DottedSurface className="opacity-30" />
      <div className="relative z-10 max-w-xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <img src={logo} alt="Blinkbox" className="w-10 h-10 mb-6" />
          <h2 className="text-[40px] font-bold text-white tracking-tight leading-tight mb-4">
            Stop doing work<br />that shouldn't exist.
          </h2>
          <p className="text-[16px] text-neutral-500 mb-7">
            Join thousands of teams automating their busywork. Free forever to start.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer">
              <button className="h-11 px-7 text-[14px] font-semibold rounded-xl text-black bg-white hover:bg-neutral-200 transition-colors duration-200">
                Automate for free <ArrowRight className="inline w-4 h-4 ml-1" />
              </button>
            </a>
            <a href="https://blinkbox.net/login" target="_blank" rel="noopener noreferrer">
              <button className="h-11 px-7 text-[14px] font-medium rounded-xl transition-colors duration-200"
                style={{ color: '#71717a', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                Log in
              </button>
            </a>
          </div>
          <p className="text-[12px] text-neutral-700 mt-5">No credit card required · Free forever on Starter</p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true, amount: 0.2 });

  return (
    <SilentBoundary>
      <div className="min-h-screen bg-[#080808] text-white" style={{ overflowX: 'clip' }}>
        <Header />

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <HeroSection heroRef={heroRef} heroInView={heroInView} />

        {/* ── LOGO STRIP ───────────────────────────────────────────────── */}
        <LogoStrip />

        {/* ── FEATURES ─────────────────────────────────────────────────── */}
        <FeaturesSection />

        {/* ── PRICING ──────────────────────────────────────────────────── */}
        <PricingSection />

        {/* ── GOOGLE SERVICES ──────────────────────────────────────────── */}
        <GoogleServicesSection />

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <FaqSection />

        {/* ── CTA + DOTTED SURFACE ─────────────────────────────────────── */}
        <CtaSection />

        {/* ── FOOTER ───────────────────────────────────────────────────── */}
        <Footer />

      </div>
    </SilentBoundary>
  );
}
