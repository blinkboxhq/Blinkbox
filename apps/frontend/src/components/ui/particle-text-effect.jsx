import { useEffect, useRef } from 'react';

class Particle {
  constructor() {
    this.pos = { x: 0, y: 0 };
    this.vel = { x: 0, y: 0 };
    this.acc = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.closeEnoughTarget = 100;
    this.maxSpeed = 1.0;
    this.maxForce = 0.1;
    this.particleSize = 10;
    this.isKilled = false;
    this.startColor = { r: 255, g: 255, b: 255 };
    this.targetColor = { r: 255, g: 255, b: 255 };
    this.colorWeight = 0;
    this.colorBlendRate = 0.01;
  }

  move() {
    let proximityMult = 1;
    const dx = this.pos.x - this.target.x;
    const dy = this.pos.y - this.target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.closeEnoughTarget) {
      proximityMult = distance / this.closeEnoughTarget;
    }

    const toTarget = { x: this.target.x - this.pos.x, y: this.target.y - this.pos.y };
    const mag = Math.sqrt(toTarget.x * toTarget.x + toTarget.y * toTarget.y);
    if (mag > 0) {
      toTarget.x = (toTarget.x / mag) * this.maxSpeed * proximityMult;
      toTarget.y = (toTarget.y / mag) * this.maxSpeed * proximityMult;
    }

    const steer = { x: toTarget.x - this.vel.x, y: toTarget.y - this.vel.y };
    const sm = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
    if (sm > 0) {
      steer.x = (steer.x / sm) * this.maxForce;
      steer.y = (steer.y / sm) * this.maxForce;
    }

    this.acc.x += steer.x;
    this.acc.y += steer.y;
    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.acc.x = 0;
    this.acc.y = 0;
  }

  draw(ctx) {
    if (this.colorWeight < 1.0) {
      this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1.0);
    }
    const r = Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight);
    const g = Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight);
    const b = Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight);

    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(this.pos.x, this.pos.y, 2, 2);
  }

  kill(width, height) {
    if (!this.isKilled) {
      const angle = Math.random() * Math.PI * 2;
      const dist = (width + height) / 2;
      this.target.x = width / 2 + Math.cos(angle) * dist;
      this.target.y = height / 2 + Math.sin(angle) * dist;

      this.startColor = {
        r: this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight,
        g: this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight,
        b: this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight,
      };
      this.targetColor = { r: 0, g: 0, b: 0 };
      this.colorWeight = 0;
      this.isKilled = true;
    }
  }
}

export function ParticleTextEffect({ words = [] }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef();
  const frameRef = useRef(0);
  const wordIdxRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;

    const genRandomPos = (cx, cy, mag) => {
      const angle = Math.random() * Math.PI * 2;
      return { x: cx + Math.cos(angle) * mag, y: cy + Math.sin(angle) * mag };
    };

    const fontSize = Math.min(Math.max(W * 0.06, 36), 120);

    const nextWord = (word) => {
      const off = document.createElement('canvas');
      off.width = W;
      off.height = H;
      const offCtx = off.getContext('2d');

      offCtx.fillStyle = 'white';
      offCtx.font = `bold ${fontSize}px Arial`;
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      offCtx.fillText(word, W / 2, H / 2);

      const imageData = offCtx.getImageData(0, 0, W, H);
      const pixels = imageData.data;
      const particles = particlesRef.current;

      const newColor = {
        r: 200 + Math.floor(Math.random() * 55),
        g: 200 + Math.floor(Math.random() * 55),
        b: 200 + Math.floor(Math.random() * 55),
      };

      const step = Math.max(4, Math.round(6 * (1000 / W)));
      const coords = [];
      for (let i = 0; i < pixels.length; i += step * 4) {
        coords.push(i);
      }
      for (let i = coords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [coords[i], coords[j]] = [coords[j], coords[i]];
      }

      let pIdx = 0;
      for (const ci of coords) {
        if (pixels[ci + 3] > 0) {
          const x = (ci / 4) % W;
          const y = Math.floor(ci / 4 / W);

          let p;
          if (pIdx < particles.length) {
            p = particles[pIdx];
            p.isKilled = false;
            pIdx++;
          } else {
            p = new Particle();
            const rp = genRandomPos(W / 2, H / 2, (W + H) / 2);
            p.pos.x = rp.x;
            p.pos.y = rp.y;
            p.maxSpeed = Math.random() * 6 + 4;
            p.maxForce = p.maxSpeed * 0.05;
            p.particleSize = Math.random() * 6 + 6;
            p.colorBlendRate = Math.random() * 0.0275 + 0.0025;
            particles.push(p);
          }

          p.startColor = {
            r: p.startColor.r + (p.targetColor.r - p.startColor.r) * p.colorWeight,
            g: p.startColor.g + (p.targetColor.g - p.startColor.g) * p.colorWeight,
            b: p.startColor.b + (p.targetColor.b - p.startColor.b) * p.colorWeight,
          };
          p.targetColor = newColor;
          p.colorWeight = 0;
          p.target.x = x;
          p.target.y = y;
        }
      }

      for (let i = pIdx; i < particles.length; i++) {
        particles[i].kill(W, H);
      }
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, W, H);

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.move();
        p.draw(ctx);
        if (p.isKilled && (p.pos.x < -50 || p.pos.x > W + 50 || p.pos.y < -50 || p.pos.y > H + 50)) {
          particles.splice(i, 1);
        }
      }

      frameRef.current++;
      if (frameRef.current % 200 === 0) {
        wordIdxRef.current = (wordIdxRef.current + 1) % words.length;
        nextWord(words[wordIdxRef.current]);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    nextWord(words[0]);
    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full" style={{ height: '300px' }}>
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
