import DomeGallery from '../../../components/DomeGallery';
import slack from '../../../assets/credentials/slack-new-logo-logo-svgrepo-com.svg';
import notion from '../../../assets/notion.svg';
import github from '../../../assets/github.svg';
import sheets from '../../../assets/google-sheets.svg';
import discord from '../../../assets/discord.svg';
import figma from '../../../assets/figma.svg';
import openai from '../../../assets/openai.svg';
import stripe from '../../../assets/stripe.svg';
import shopify from '../../../assets/shopify.svg';
import hubspot from '../../../assets/hubspot.svg';
import linear from '../../../assets/linear.svg';
import twilio from '../../../assets/Twilio-Icon--Streamline-Svg-Logos.svg';
import airtable from '../../../assets/Airtable--Streamline-Svg-Logos.svg';
import zoom from '../../../assets/zoom.svg';

const LOGOS = [
  { src: slack, alt: 'Slack' },
  { src: notion, alt: 'Notion' },
  { src: github, alt: 'GitHub' },
  { src: sheets, alt: 'Google Sheets' },
  { src: discord, alt: 'Discord' },
  { src: figma, alt: 'Figma' },
  { src: openai, alt: 'OpenAI' },
  { src: stripe, alt: 'Stripe' },
  { src: shopify, alt: 'Shopify' },
  { src: hubspot, alt: 'HubSpot' },
  { src: linear, alt: 'Linear' },
  { src: twilio, alt: 'Twilio' },
  { src: airtable, alt: 'Airtable' },
  { src: zoom, alt: 'Zoom' },
];

export default function Marquee() {
  return (
    <section className="relative border-y border-white/[0.06] bg-[#060608]">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-[130px]"
        style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.3), transparent 70%)' }}
      />
      <div className="relative h-[420px] w-full sm:h-[520px]">
        <DomeGallery
          images={LOGOS}
          grayscale={false}
          overlayBlurColor="#060608"
          imageBorderRadius="16px"
          openedImageBorderRadius="20px"
          openedImageWidth="260px"
          openedImageHeight="260px"
          fit={0.6}
        />
      </div>
      <p className="relative pb-12 pt-2 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-[#6d6d6d]">
        Connects everything you already run
      </p>
    </section>
  );
}
