import Header from './sections/Header';
import Hero from './Hero';
import ScrollFloat from '../../components/ScrollFloat';
import HowItWorks from './sections/HowItWorks';
import Platform from './sections/Platform';
import Pricing from './sections/Pricing';
import Footer from './sections/Footer';

export default function LandingV2() {
  return (
    <div className="bg-[#050507] antialiased">
      <Header />
      <Hero />
      <section className="relative bg-[#060608] py-24 sm:py-32">
        <div className="mx-auto max-w-[1100px] px-6 text-center sm:px-8">
          <ScrollFloat
            containerClassName="!my-0"
            textClassName="font-semibold tracking-[-0.02em] text-[#fafafa]"
          >
            Welcome to autonomous orchestration
          </ScrollFloat>
        </div>
      </section>
      <div id="how" className="scroll-mt-20">
        <HowItWorks />
      </div>
      <Platform />
      <div id="pricing" className="scroll-mt-20">
        <Pricing />
      </div>
      <Footer />
    </div>
  );
}
