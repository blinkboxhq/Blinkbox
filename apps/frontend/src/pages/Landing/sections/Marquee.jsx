import { motion, useReducedMotion } from 'framer-motion';
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
  { src: slack, name: 'Slack' },
  { src: notion, name: 'Notion' },
  { src: github, name: 'GitHub' },
  { src: sheets, name: 'Google Sheets' },
  { src: discord, name: 'Discord' },
  { src: figma, name: 'Figma' },
  { src: openai, name: 'OpenAI' },
  { src: stripe, name: 'Stripe' },
  { src: shopify, name: 'Shopify' },
  { src: hubspot, name: 'HubSpot' },
  { src: linear, name: 'Linear' },
  { src: twilio, name: 'Twilio' },
  { src: airtable, name: 'Airtable' },
  { src: zoom, name: 'Zoom' },
];

function Row({ logos, reverse, duration, reduce }) {
  const row = [...logos, ...logos];
  return (
    <div
      className="relative overflow-hidden"
      style={{ maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)' }}
    >
      <motion.div
        className="flex w-max items-center gap-16 pr-16"
        animate={reduce ? {} : { x: reverse ? ['-50%', '0%'] : ['0%', '-50%'] }}
        transition={{ duration, ease: 'linear', repeat: Infinity }}
      >
        {row.map((logo, i) => (
          <img
            key={i}
            src={logo.src}
            alt={logo.name}
            title={logo.name}
            className="h-7 w-auto shrink-0 opacity-45 transition-opacity duration-300 hover:opacity-90"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        ))}
      </motion.div>
    </div>
  );
}

export default function Marquee() {
  const reduce = useReducedMotion();

  return (
    <section className="relative border-y border-white/[0.06] bg-[#060608] py-14">
      <p className="mb-9 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-[#6d6d6d]">
        Connects everything you already run
      </p>

      <div className="flex flex-col gap-8">
        <Row logos={LOGOS} duration={38} reduce={reduce} />
        <Row logos={[...LOGOS].reverse()} reverse duration={46} reduce={reduce} />
      </div>
    </section>
  );
}
