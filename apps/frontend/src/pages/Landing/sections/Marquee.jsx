import { motion, useReducedMotion } from 'framer-motion';
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

const ease = [0.22, 1, 0.36, 1];

export default function Marquee() {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden bg-[#060608]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24"
        style={{ background: 'linear-gradient(180deg, #060608, transparent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24"
        style={{ background: 'linear-gradient(0deg, #060608, transparent)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-1/2 h-[360px] w-[720px] -translate-y-1/2 translate-x-1/4 rounded-full opacity-25 blur-[130px]"
        style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.3), transparent 70%)' }}
      />
      <div className="relative mx-auto grid max-w-[1440px] grid-cols-1 items-center px-6 sm:px-8 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-10">
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease }}
          className="pb-4 pt-16 lg:py-24"
        >
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#6f97e8]">Integrations</p>
          <h2 className="max-w-[520px] font-semibold tracking-[-0.02em] text-[#fafafa]" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Connects everything{' '}
            <span className="bg-gradient-to-br from-white via-[#8fb4ff] to-[#1d5fe0] bg-clip-text text-transparent">
              you already run.
            </span>
          </h2>
          <p className="mt-4 max-w-[440px] text-[15px] leading-relaxed text-[#8c8c8c]">
            Slack, Stripe, Sheets, OpenAI — 251 apps, all first-class. Drop any of them on the canvas and they just talk to each other.
          </p>
        </motion.div>
        <div className="relative h-[440px] w-full sm:h-[560px] lg:-mr-12">
          <DomeGallery
            images={LOGOS}
            grayscale={false}
            overlayBlurColor="#060608"
            imageBorderRadius="16px"
            openedImageBorderRadius="20px"
            openedImageWidth="260px"
            openedImageHeight="260px"
            fit={0.6}
            maxVerticalRotationDeg={0}
            segments={34}
            dragDampening={4.8}
          />
        </div>
      </div>
    </section>
  );
}
