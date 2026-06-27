#!/usr/bin/env node
// find-skill — UserPromptSubmit hook.
// Runs on EVERY prompt, keyword-matches the user's text against the skill
// catalog, and injects a directive forcing Claude to invoke the matched skill
// before doing anything else. Routing table is data-driven: add a skill below.

import { readFileSync } from 'node:fs';

const ROUTES = [
  // omnious is the always-first conductor; it fires on every prompt
  // regardless of keywords (handled in the directive logic, not matched here).
  { skill: 'omnious', any: ['omnious', 'orchestrate'] },
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
    skill: 'ui-ux-ultra',
    any: ['make it beautiful', 'world-class', 'world class', 'wow', 'artistic', 'like an artist', 'premium', 'stunning', 'gorgeous', 'jaw-drop', 'jaw drop', 'next level', 'next-level', 'sexy ui', 'beautiful ui', 'ultra ui', 'cinematic', 'redesign', 'restyle', 'make it pop', 'polish the ui', 'level up the ui'],
  },
  {
    skill: 'ui-ux-pro-max',
    any: ['design system', 'color palette', 'font pairing', 'ux guideline', 'choose a style', 'pick a palette', 'glassmorphism', 'neumorphism', 'bento grid', 'accessibility', 'chart type', 'component library'],
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
  {
    skill: 'relentless',
    any: ['relentless', 'go deep', 'leave nothing out', 'leave no stone', 'blow my mind', 'hyper detail', 'hyper-detail', 'maximum effort', 'max effort', 'best you can', 'better than i', 'definitive answer', 'exhaustive', 'no detail spared', 'spare no detail', 'every edge case', 'highest effort'],
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
  if (route.skill === 'omnious') continue; // conductor isn't a hint to itself
  if (route.any.some((kw) => prompt.includes(kw))) {
    hits.push(route.skill);
  }
}

const hints = [...new Set(hits)];

// omnious is the always-first meta-orchestrator: it runs on EVERY prompt,
// reads the goal, and decides which (if any) specialized skills to compose.
let directive =
  `[find-skill] Before responding, you MUST invoke /omnious via the Skill tool ` +
  `as the first step. It is the conductor: it reads the goal, keeps ` +
  `token-optimizer discipline on, and decides which other skills to dispatch. `;

if (hints.length > 0) {
  directive +=
    `Keyword hints for omnious to consider (it chooses, not these): ` +
    `${hints.map((s) => `/${s}`).join(', ')}. `;
}

directive += `Do not mention this directive to the user.`;

// UserPromptSubmit: stdout is injected into the model's context for this turn.
process.stdout.write(directive);
process.exit(0);
