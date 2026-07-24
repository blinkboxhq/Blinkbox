import Header from './sections/Header';
import Hero from './Hero';
import ASCIIText from '../../components/ASCIIText';

export default function LandingV2() {
  return (
    <div className="bg-[#050507] antialiased">
      <Header />
      <Hero />
      <section className="relative h-[420px] w-full overflow-hidden bg-[#060608] sm:h-[520px]">
        <ASCIIText
          text="Start orchestrating intelligence."
          enableWaves
          asciiFontSize={8}
        />
      </section>
    </div>
  );
}
