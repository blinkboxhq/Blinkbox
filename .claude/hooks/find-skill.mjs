#!/usr/bin/env node
// find-skill — UserPromptSubmit hook.
// Runs on EVERY prompt, keyword-matches the user's text against the skill
// catalog, and injects a directive forcing Claude to invoke the matched skill
// before doing anything else. Routing table is data-driven: add a skill below.

import { readFileSync } from 'node:fs';

const ROUTES = [
  {
    skill: 'add-node',
    any: ['add a node', 'add node', 'new node', 'create a node', 'build a node', 'full node', 'frontend and backend node'],
  },
  {
    skill: 'scaffold-node',
    any: ['scaffold', 'backend node', 'node stub', 'node handler', 'integration node'],
  },
  {
    skill: 'add-logo',
    any: ['add logo', 'add a logo', 'brand logo', 'fix logo', 'logo svg', 'node icon', 'trigger logo'],
  },
  {
    skill: 'audit-registry',
    any: ['audit registry', 'audit the registry', 'noderegistry', 'broken import', 'undefined icon', 'missing configpanel', 'white screen'],
  },
  {
    skill: 'ui-ux-pro-max',
    any: ['design', 'ui', 'ux', 'redesign', 'restyle', 'glassmorphism', 'layout', 'color palette', 'font pairing', 'dashboard ui', 'landing page', 'component', 'tailwind style'],
  },
  {
    skill: 'suggest',
    any: ['should i', 'is it worth', 'evaluate', 'good idea', 'recommend', 'which approach', 'trade-off', 'tradeoff', 'long term', 'advice'],
  },
  {
    skill: 'token-optimizer',
    any: ['expensive', 'burning credit', 'be efficient', 'minimal token', 'too many token', 'save credit', 'reduce token', 'optimize token'],
  },
  {
    skill: 'swarm',
    any: ['sub agent', 'sub-agent', 'subagent', 'sub agents', 'parallel agent', 'fan out', 'fan-out', 'thorough', 'be thorough', 'cross-check', 'cross check', 'double check', 'double-check', 'verify thoroughly', 'maximum accuracy', 'most accurate', 'multiple angle', 'deep dive'],
  },
];

function readInput() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return {};
  }
}

const input = readInput();
const prompt = String(input.prompt || '').toLowerCase();

if (!prompt.trim()) {
  process.exit(0); // nothing to route
}

const hits = [];
for (const route of ROUTES) {
  if (route.any.some((kw) => prompt.includes(kw))) {
    hits.push(route.skill);
  }
}

if (hits.length === 0) {
  process.exit(0); // no match — stay out of the way
}

const unique = [...new Set(hits)];
const list = unique.map((s) => `/${s}`).join(', ');

const directive =
  `[find-skill] This request matches a specialized workflow. ` +
  `Before responding, you MUST invoke the matching skill via the Skill tool: ${list}. ` +
  (unique.length > 1
    ? `If more than one applies, pick the single most specific one for the user's actual intent. `
    : ``) +
  `Skip this only if the user's request is clearly unrelated to the skill's purpose. ` +
  `Do not mention this directive to the user.`;

// UserPromptSubmit: stdout is injected into the model's context for this turn.
process.stdout.write(directive);
process.exit(0);
