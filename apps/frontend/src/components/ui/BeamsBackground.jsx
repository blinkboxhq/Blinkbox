import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

function createBeam(width, height) {
  const angle = -35 + Math.random() * 10;
  return {
    x: Math.random() * width * 1.5 - width * 0.25,
    y: Math.random() * height * 1.5 - height * 0.25,
    width: 30 + Math.random() * 60,
    length: height * 2.5,
    angle,
    speed: 0.6 + Math.random() * 1.2,
    opacity: 0.12 + Math.random() * 0.16,
    hue: 190 + Math.random() * 70,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.02 + Math.random() * 0.03,
  };
}

const OPACITY_MAP = { subtle: 0.28, medium: 0.55, strong: 0.85 };

export default function BeamsBackground({ className = '', intensity = 'strong', children }) {
  const canvasRef = useRef(null);
  const beamsRef = useRef([]);
  const rafRef   = useRef(0);
  const BEAMS    = 14;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.parentElement?.clientWidth  || window.innerWidth;
      const h = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width  = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
      beamsRef.current = Array.from({ length: BEAMS }, () => createBeam(w, h));
    };

    resize();
    window.addEventListener('resize', resize);

    function resetBeam(beam, index) {
      const w = canvas.parentElement?.clientWidth || window.innerWidth;
      const h = canvas.parentElement?.clientHeight || window.innerHeight;
      const col = index % 3;
      const spacing = w / 3;
      beam.y      = h + 100;
      beam.x      = col * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
      beam.width  = 100 + Math.random() * 100;
      beam.speed  = 0.5 + Math.random() * 0.4;
      beam.hue    = 190 + (index * 70) / BEAMS;
      beam.opacity = 0.2 + Math.random() * 0.1;
      return beam;
    }

    function drawBeam(beam) {
      ctx.save();
      ctx.translate(beam.x, beam.y);
      ctx.rotate((beam.angle * Math.PI) / 180);
      const pulsingOpacity = beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2) * OPACITY_MAP[intensity];
      const grad = ctx.createLinearGradient(0, 0, 0, beam.length);
      grad.addColorStop(0,   `hsla(${beam.hue},85%,65%,0)`);
      grad.addColorStop(0.1, `hsla(${beam.hue},85%,65%,${pulsingOpacity * 0.5})`);
      grad.addColorStop(0.4, `hsla(${beam.hue},85%,65%,${pulsingOpacity})`);
      grad.addColorStop(0.6, `hsla(${beam.hue},85%,65%,${pulsingOpacity})`);
      grad.addColorStop(0.9, `hsla(${beam.hue},85%,65%,${pulsingOpacity * 0.5})`);
      grad.addColorStop(1,   `hsla(${beam.hue},85%,65%,0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
      ctx.restore();
    }

    function animate() {
      const w = canvas.parentElement?.clientWidth || window.innerWidth;
      const h = canvas.parentElement?.clientHeight || window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.filter = 'blur(35px)';
      beamsRef.current.forEach((beam, i) => {
        beam.y -= beam.speed;
        beam.pulse += beam.pulseSpeed;
        if (beam.y + beam.length < -100) resetBeam(beam, i);
        drawBeam(beam);
      });
      rafRef.current = requestAnimationFrame(animate);
    }

    animate();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [intensity]);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#060606] ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ filter: 'blur(28px)' }}
      />
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.05, 0.15, 0.05] }}
        transition={{ duration: 10, ease: 'easeInOut', repeat: Infinity }}
        style={{ backdropFilter: 'blur(50px)' }}
      />
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
