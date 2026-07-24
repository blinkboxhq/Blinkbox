import Hero from './Hero';
import Marquee from './sections/Marquee';
import Features from './sections/Features';
import HowItWorks from './sections/HowItWorks';
import Pricing from './sections/Pricing';
import Footer from './sections/Footer';

export default function LandingV2() {
  return (
    <div className="bg-[#050507] antialiased">
      <Hero />
      <Marquee />
      <Features />
      <HowItWorks />
      <Pricing />
      <Footer />
    </div>
  );
}
