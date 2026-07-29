import Header from './sections/Header';
import Hero from './Hero';
import { motion, useScroll, useSpring } from 'framer-motion';
import Marquee from './sections/Marquee';
import Vision from './sections/Vision';
import Footer from './sections/Footer';

export default function LandingV2() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 26, mass: 0.4 });

  return (
    <div className="bg-[#050507] antialiased">
      <motion.div
        aria-hidden
        className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left"
        style={{ scaleX: progress, background: 'linear-gradient(90deg, #1d5fe0, #8fb4ff, #6f97e8)' }}
      />
      <Header />
      <Hero />
      <Marquee />
      <Vision />
      <Footer />
    </div>
  );
}
