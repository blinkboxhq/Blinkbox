import Header from './sections/Header';
import Hero from './Hero';
import Vision from './sections/Vision';
import Footer from './sections/Footer';

export default function LandingV2() {
  return (
    <div className="bg-[#050507] antialiased">
      <Header />
      <Hero />
      <Vision />
      <Footer />
    </div>
  );
}
