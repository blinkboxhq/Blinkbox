import SideRays from '../../components/SideRays';

export default function Hero() {
  return (
    <section className="relative min-h-dvh w-full overflow-hidden bg-[#0a0a0c]">
      <div className="absolute inset-0">
        <SideRays
          origin="top-right"
          rayColor1="#6f97e8"
          rayColor2="#a9c0ef"
          speed={2.5}
          intensity={2}
          spread={2}
          tilt={0}
          saturation={1.5}
          blend={0.75}
          falloff={1.6}
          opacity={1.0}
        />
      </div>
    </section>
  );
}
