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

export default function Marquee() {
  const reduce = useReducedMotion();
  const row = [...LOGOS, ...LOGOS];

  return (
    <section className="relative border-y border-white/[0.06] bg-[#08080a] py-14">
      <p className="mb-9 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-[#6d6d6d]">
        Connects everything you already run
      </p>

      <div
        className="relative overflow-hidden"
        style={{ maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)' }}
      >
        <motion.div
          className="flex w-max items-center gap-16 pr-16"
          animate={reduce ? {} : { x: ['0%', '-50%'] }}
          transition={{ duration: 38, ease: 'linear', repeat: Infinity }}
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
    </section>
  );
}
