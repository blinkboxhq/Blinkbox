import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import PixelBlast from '../../components/PixelBlast';
import productShot from './assets/image.png';

const ease = [0.22, 1, 0.36, 1];

export default function Hero() {
  const reduce = useReducedMotion();
  const frameRef = useRef(null);
  const [flash, setFlash] = useState(null);

  const onBgClick = (e) => {
    const el = frameRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setFlash({ id: e.timeStamp, x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    <section
      onPointerDown={onBgClick}
      className="relative w-full overflow-hidden bg-[#060608] pb-44"
    >
      {/* pixel-blast field behind the hero — interactive, catches pointer events */}
      <div className="absolute inset-0">
        <PixelBlast
          variant="diamond"
          pixelSize={2}
          color="#3b82f6"
          patternScale={5}
          patternDensity={1.2}
          enableRipples
          rippleSpeed={0.3}
          rippleThickness={0.07}
          rippleIntensityScale={0.4}
          speed={2}
          edgeFade={0.15}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute left-1/2 top-[32%] h-[560px] w-[1000px] -translate-x-1/2 rounded-full opacity-40 blur-[130px]"
            style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.20), transparent 68%)' }}
          />
          <div
            className="absolute inset-x-0 top-0 h-[220px]"
            style={{ background: 'linear-gradient(180deg, #060608, transparent)' }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[320px]"
            style={{ background: 'linear-gradient(0deg, #060608, transparent)' }}
          />
        </div>
      </div>

      {/* headline + announcement */}
      <div className="pointer-events-none relative z-10 mx-auto max-w-[1200px] px-6 pt-16 sm:px-8 sm:pt-24">
        <motion.h1
          initial={{ opacity: 0, y: reduce ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: reduce ? 0 : 0.08 }}
          className="max-w-[900px] font-medium leading-[1.02] tracking-[-0.03em] text-white"
          style={{ fontSize: 'clamp(2.5rem, 6.4vw, 4.7rem)' }}
        >
          The{' '}
          <span className="bg-gradient-to-br from-white via-[#8fb4ff] to-[#1d5fe0] bg-clip-text text-transparent">
            automation platform
          </span>
          <br className="hidden sm:block" /> for teams and agents
        </motion.h1>

        {/* product screenshot on a lit stage */}
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 40, scale: reduce ? 1 : 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, ease, delay: reduce ? 0 : 0.34 }}
          className="relative mt-10 sm:mt-12"
        >
          {/* floor shadow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-10 left-1/2 h-24 w-[85%] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
            style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85), transparent 70%)' }}
          />
          <div
            ref={frameRef}
            className="relative rounded-xl p-[3px]"
            style={{ boxShadow: '0 60px 150px -30px rgba(0,0,0,0.9)' }}
          >
            {/* metallic border ring — even, opaque, no bright corners */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 rounded-xl"
              style={{
                padding: 3,
                background: 'linear-gradient(180deg, #34343a, #17171a 55%, #121214)',
                WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            />
            {flash && (
              <motion.div
                key={flash.id}
                aria-hidden
                className="pointer-events-none absolute inset-0 z-30 rounded-xl"
                style={{
                  padding: 3,
                  background: `radial-gradient(200px 200px at ${flash.x}px ${flash.y}px, rgba(255,255,255,0.95), rgba(150,190,255,0.55) 32%, transparent 62%)`,
                  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.7, ease }}
              />
            )}
            <div className="relative z-10 overflow-hidden rounded-[9px]">
              <img src={productShot} alt="Blinkbox workflow canvas" className="block w-full opacity-[0.85]" />
              {/* top edge highlight */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 50%, transparent)' }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
