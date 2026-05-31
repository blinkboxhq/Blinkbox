import { useEffect, useRef, useState, Component } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Check, Minus, Plus, ArrowRight, Zap, Bot, Shield } from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DottedSurface } from '@/components/ui/dotted-surface';
import logo from '../../assets/logo.svg';
import heroScreenshot from '../../assets/logos/landingpage-hero-screenshot.png';

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
        vec3 base=hsv2rgb(vec3(uHue/360.0,0.7,0.8));
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
const TYPEWRITER_WORDS = ['Shopify orders', 'lead follow-ups', 'invoice sending', 'support tickets', 'data syncing', 'report building'];

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
      <span className="text-violet-400">
        {displayed}
      </span>
      <span className="inline-block w-[2px] h-[0.85em] ml-[2px] align-middle rounded-sm animate-pulse bg-white"
        style={{ verticalAlign: 'middle' }} />
    </span>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection({ heroRef, heroInView }) {
  return (
    <section className="relative overflow-hidden" style={{ minHeight: '100vh' }}>
      {/* Ambient violet glow — top left */}
      <div className="absolute pointer-events-none"
        style={{ top: '-10%', left: '-5%', width: '55%', height: '70%', background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      {/* Ambient indigo glow — center right */}
      <div className="absolute pointer-events-none"
        style={{ top: '20%', right: '5%', width: '40%', height: '60%', background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* WebGL lightning — left only, subtle */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ maskImage: 'radial-gradient(ellipse 45% 55% at 15% 55%, black 0%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 45% 55% at 15% 55%, black 0%, transparent 100%)' }}>
        <LightningBg hue={255} speed={1.2} intensity={0.25} size={2.5} />
      </div>

      <div className="relative z-10 w-full flex items-center" style={{ minHeight: '100vh' }}>

        {/* ── Left: text ── */}
        <div ref={heroRef} className="relative z-20 flex flex-col items-start flex-shrink-0 w-full max-w-[520px] py-32 ml-[8vw]">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-[11px] font-medium" style={{ color: '#a3a3a3' }}>Your competitors are already automating</span>
          </motion.div>

          {/* Headline with typewriter */}
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="font-bold leading-[1.05] tracking-[-0.03em] mb-4 text-white"
            style={{ fontSize: 'clamp(40px, 5vw, 68px)' }}
          >
            Automate your<br />
            <Typewriter /><br />
            <span className="text-white">in minutes.</span>
          </motion.h1>

          {/* Subline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="text-[16px] leading-relaxed mb-10"
            style={{ color: '#71717a', maxWidth: 420 }}
          >
            Every hour spent on manual work is an hour your rivals spend on growth.
            Blinkbox runs it for you — silently, 24/7, zero code.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 mb-10"
          >
            <Link to="/register">
              <button className="h-11 px-6 text-[14px] font-semibold rounded-lg transition-all duration-200 hover:bg-neutral-200 active:scale-[0.98]"
                style={{ background: '#fff', color: '#000' }}>
                Start for free →
              </button>
            </Link>
            <Link to="/docs">
              <button className="h-11 px-5 text-[14px] font-medium rounded-lg border transition-all duration-200 hover:text-white hover:border-white/20"
                style={{ color: '#71717a', borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                See how it works
              </button>
            </Link>
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
          {/* Violet glow behind screenshot */}
          <div className="absolute inset-0 pointer-events-none -z-10"
            style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(124,58,237,0.15) 0%, transparent 60%)', filter: 'blur(30px)' }} />
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
            style={{ opacity: 0.75, boxShadow: '0 0 0 1px rgba(124,58,237,0.2), 0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(124,58,237,0.08)' }}
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
          {['Product', 'Integrations', 'Docs', 'Pricing'].map(item => (
            <Link key={item} to="#" className="text-[13px] text-neutral-400 hover:text-white transition-colors duration-150">
              {item}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <div className="w-px h-4 bg-white/[0.1] mx-1" />
          <Link to="/login" className="text-[13px] text-neutral-400 hover:text-white transition-colors duration-150 px-2">Log in</Link>
          <Link to="/register">
            <button className="text-[13px] font-medium text-black bg-white hover:bg-neutral-200 transition-colors duration-150 px-3.5 py-1.5 rounded-lg">
              Sign up
            </button>
          </Link>
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
            {['Product', 'Integrations', 'Docs', 'Pricing'].map(item => (
              <Link key={item} to="#" className="text-[15px] text-neutral-400" onClick={() => setMobileOpen(false)}>{item}</Link>
            ))}
            <div className="flex flex-col gap-3 pt-4 border-t border-white/[0.06]">
              <Link to="/login" className="text-[15px] text-neutral-500">Log in</Link>
              <Link to="/register"><Button className="w-full rounded-full">Sign up</Button></Link>
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

      <p className="text-center text-[11px] font-semibold text-neutral-600 uppercase tracking-widest mb-8">
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

// ─── Pricing ──────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    desc: 'For solo builders and side projects.',
    features: ['5,000 executions / mo', '10 active workflows', '50+ integrations', 'Community support'],
    cta: 'Get started free',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/ month',
    desc: 'For teams serious about automation.',
    features: ['Unlimited executions', 'Unlimited workflows', '250+ integrations', 'AI agent builder', 'Headless scraping', 'Priority support'],
    cta: 'Start Pro',
    href: '/register',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For regulated and large-scale deployments.',
    features: ['Everything in Pro', 'Self-hosting', 'SSO / SAML', 'SLA guarantees', 'Dedicated engineer'],
    cta: 'Contact us',
    href: 'mailto:blinkbox.co.in@gmail.com',
    highlight: false,
  },
];

function PricingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  return (
    <section ref={ref} className="py-28 px-6" id="pricing">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest mb-4">Pricing</p>
          <h2 className="text-[40px] font-bold text-white tracking-tight leading-tight mb-4">One flat rate.<br />No surprises.</h2>
          <p className="text-[15px] text-neutral-500">Run millions of tasks. Your bill doesn't move.</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-4">
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
              <Link to={plan.href}>
                <button
                  className="w-full h-10 rounded-xl text-[13px] font-semibold transition-all duration-200"
                  style={plan.highlight
                    ? { background: '#fff', color: '#000' }
                    : { background: 'transparent', color: '#a3a3a3', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {plan.cta}
                </button>
              </Link>
            </motion.div>
          ))}
        </div>
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
    <section ref={ref} className="py-20 px-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="max-w-2xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-[32px] font-bold text-white tracking-tight mb-12"
        >Questions</motion.h2>
        {[
          { q: 'How is Blinkbox different from Zapier or Make?', a: "Zapier and Make charge per task — your costs grow with usage. Blinkbox is flat. Run 500 or 5,000,000 tasks for the same monthly price. We also ship first-class AI agents, headless browser automation, and a code sandbox." },
          { q: 'What happens if a workflow fails mid-run?', a: "Blinkbox uses a cursor-based execution engine with Redis locking. If a run is interrupted, the resumer picks up exactly where it left off — no lost data, no duplicate processing." },
          { q: 'Is my credential data safe?', a: "All credentials are stored in an AES-256 encrypted vault and are never logged or exposed in execution output. They are only decrypted at runtime, in memory, for the specific node that needs them." },
          { q: 'Can I self-host Blinkbox?', a: "Yes. The Enterprise plan includes full self-hosting support. Blinkbox runs on Node.js, MongoDB, and Redis — straightforward to deploy on your own infrastructure." },
        ].map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t py-16 px-6" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-12">
          <div className="max-w-[200px]">
            <div className="flex items-center gap-2 mb-3">
              <img src={logo} alt="Blinkbox" className="w-5 h-5" />
              <span className="text-[14px] font-semibold text-white">Blinkbox</span>
            </div>
            <p className="text-[12px] text-neutral-600">The automation engine for teams that move fast.</p>
          </div>
          <div className="grid grid-cols-3 gap-10">
            {[
              { header: 'Product',   links: [{ label: 'Features', href: '#' }, { label: 'Integrations', href: '#' }, { label: 'Pricing', href: '#pricing' }, { label: 'Changelog', href: '#' }] },
              { header: 'Resources', links: [{ label: 'Docs', href: '#' }, { label: 'Blog', href: '#' }, { label: 'Templates', href: '#' }, { label: 'Status', href: '#' }] },
              { header: 'Company',   links: [{ label: 'About', href: '#' }, { label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }, { label: 'Contact', href: 'mailto:blinkbox.co.in@gmail.com' }] },
            ].map(col => (
              <div key={col.header}>
                <p className="text-[11px] font-semibold text-neutral-600 uppercase tracking-wider mb-3">{col.header}</p>
                {col.links.map(link => (
                  <Link key={link.label} to={link.href}
                    className="block text-[13px] text-neutral-600 hover:text-neutral-300 transition-colors mb-2">
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          <p className="text-[12px] text-neutral-700">© 2025 Blinkbox. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-[12px] text-neutral-700 hover:text-neutral-400 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-[12px] text-neutral-700 hover:text-neutral-400 transition-colors">Terms of Service</Link>
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
    <section ref={ref} className="relative py-32 px-6 overflow-hidden">
      <DottedSurface className="opacity-30" />
      <div className="relative z-10 max-w-xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-8"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-[40px] font-bold text-white tracking-tight leading-tight mb-5">
            Stop doing work<br />that shouldn't exist.
          </h2>
          <p className="text-[16px] text-neutral-500 mb-10">
            Join thousands of teams automating their busywork. Free forever to start.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register">
              <button className="h-11 px-7 text-[14px] font-semibold rounded-xl text-black bg-white hover:bg-neutral-200 transition-colors duration-200">
                Automate for free <ArrowRight className="inline w-4 h-4 ml-1" />
              </button>
            </Link>
            <Link to="/login">
              <button className="h-11 px-7 text-[14px] font-medium rounded-xl transition-colors duration-200"
                style={{ color: '#71717a', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                Log in
              </button>
            </Link>
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
      <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">
        <Header />

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <HeroSection heroRef={heroRef} heroInView={heroInView} />

        {/* ── LOGO STRIP ───────────────────────────────────────────────── */}
        <LogoStrip />

        {/* ── PRICING ──────────────────────────────────────────────────── */}
        <PricingSection />

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
