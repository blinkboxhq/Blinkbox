import Header from './sections/Header';
import Hero from './Hero';
import Marquee from './sections/Marquee';
import Features from './sections/Features';
import HowItWorks from './sections/HowItWorks';
import Pricing from './sections/Pricing';
import Footer from './sections/Footer';

export default function LandingV2() {
  return (
    <div className="bg-[#050507] antialiased">
      <Header />
      <Hero />
      <Marquee />
      <div id="features" className="scroll-mt-20">
        <Features />
      </div>
      <div id="how" className="scroll-mt-20">
        <HowItWorks />
      </div>
      <div id="pricing" className="scroll-mt-20">
        <Pricing />
      </div>
      <Footer />
    </div>
  );
}
