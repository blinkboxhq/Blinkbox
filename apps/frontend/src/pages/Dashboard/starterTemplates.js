// Starter workflows for a first-time user. Every one of these runs with zero
// credentials and shows real data on the first click of Run — the point is to
// replace "blank canvas → leave" with "Run → see output → edit one thing".
//
// Each template is a complete backend graph (same shape the API stores), so
// the dashboard can POST it as-is, activate it, and open it.

const TRIGGER = {
  id: "n1",
  type: "manual",
  position: { x: 160, y: 300 },
  data: { triggerVariant: "manual" },
  description: "Click Run",
};

const edge = (id, source, target, sourceHandle = "output") => ({
  id,
  source,
  target,
  sourceHandle,
  targetHandle: null,
  condition: "always",
  type: "onSuccess",
  description: "",
});

// One code node per branch keeps the "what happened" readable in the node
// inspector — the last node's output is what a new user actually looks at.
const branchEdges = [
  edge("e1", "n1", "n2"),
  edge("e2", "n2", "n3"),
  edge("e3", "n3", "n4"),
  edge("e4", "n4", "n5", "true"),
  edge("e5", "n4", "n6", "false"),
];

export const STARTER_TEMPLATES = [
  {
    id: "hn-top-5",
    name: "Hacker News: today's top 5",
    tagline: "Fetch the front page, rank it, hand you a digest.",
    chain: ["HTTP", "Code", "Condition", "Digest"],
    nextStep: "Add a Slack, Discord or Gmail node after \"Your digest\" and put it on a schedule.",
    nodes: [
      TRIGGER,
      {
        id: "n2",
        type: "http_request",
        position: { x: 380, y: 300 },
        data: {
          method: "GET",
          url: "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=10",
          headers: { "User-Agent": "BlinkboxStarter/1.0" },
        },
        description: "Fetch HN front page",
      },
      {
        id: "n3",
        type: "code",
        position: { x: 600, y: 300 },
        data: {
          code:
            'const hits = ($input.data && $input.data.hits) || [];\n' +
            'const top = hits.filter(h => h.title).sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 5)\n' +
            '  .map(h => ({ title: h.title, points: h.points || 0, url: h.url || ("https://news.ycombinator.com/item?id=" + h.objectID) }));\n' +
            'return {\n' +
            '  count: top.length,\n' +
            '  hasStories: top.length > 0 ? "yes" : "no",\n' +
            '  top,\n' +
            '  digest: top.map((s, i) => (i + 1) + ". " + s.title + " (" + s.points + " pts)").join("\\n"),\n' +
            '};',
        },
        description: "Pick the top 5",
      },
      {
        id: "n4",
        type: "condition",
        position: { x: 820, y: 300 },
        data: { conditions: [{ operator: "equals", left: "{{$json.hasStories}}", right: "yes" }], mode: "and" },
        description: "Any stories?",
      },
      {
        id: "n5",
        type: "code",
        position: { x: 1080, y: 200 },
        data: { code: 'return { status: "ok", count: $input.count, digest: $input.digest, stories: $input.top };' },
        description: "Your digest",
      },
      {
        id: "n6",
        type: "code",
        position: { x: 1080, y: 420 },
        data: { code: 'return { status: "empty", digest: "Hacker News returned no front-page stories." };' },
        description: "Nothing today",
      },
    ],
    edges: branchEdges,
  },
  {
    id: "local-businesses",
    name: "Find businesses near you",
    tagline: "Search OpenStreetMap for cafés in a city; keep the ones with a phone or website.",
    chain: ["HTTP", "Code", "Condition", "List"],
    nextStep: "Change the city or category in the URL, then append the list to a Google Sheet.",
    nodes: [
      TRIGGER,
      {
        id: "n2",
        type: "http_request",
        position: { x: 380, y: 300 },
        data: {
          method: "GET",
          url:
            "https://nominatim.openstreetmap.org/search?q=%5Bamenity%3Dcafe%5D%20San%20Francisco&format=json&extratags=1&addressdetails=1&limit=40",
          headers: { "User-Agent": "BlinkboxStarter/1.0" },
        },
        description: "Search OpenStreetMap",
      },
      {
        id: "n3",
        type: "code",
        position: { x: 600, y: 300 },
        data: {
          code:
            'const places = Array.isArray($input.data) ? $input.data : [];\n' +
            'const seen = {};\n' +
            'const leads = [];\n' +
            'for (const p of places) {\n' +
            '  const x = p.extratags || {}, a = p.address || {};\n' +
            '  const name = p.name || "";\n' +
            '  const website = String(x.website || x["contact:website"] || "");\n' +
            '  const phone = String(x.phone || x["contact:phone"] || "").replace(/^tel:/i, "");\n' +
            '  if (!name || seen[name] || (!website && !phone)) continue;\n' +
            '  seen[name] = true;\n' +
            '  leads.push({ name, phone, website, address: [a.house_number, a.road, a.city].filter(Boolean).join(" ") });\n' +
            '}\n' +
            'return { found: leads.length, hasLeads: leads.length > 0 ? "yes" : "no", leads };',
        },
        description: "Keep contactable ones",
      },
      {
        id: "n4",
        type: "condition",
        position: { x: 820, y: 300 },
        data: { conditions: [{ operator: "equals", left: "{{$json.hasLeads}}", right: "yes" }], mode: "and" },
        description: "Found any?",
      },
      {
        id: "n5",
        type: "code",
        position: { x: 1080, y: 200 },
        data: { code: 'return { status: "ok", found: $input.found, leads: $input.leads };' },
        description: "Your list",
      },
      {
        id: "n6",
        type: "code",
        position: { x: 1080, y: 420 },
        data: { code: 'return { status: "empty", message: "No businesses with contact details — try another city or category." };' },
        description: "Nothing found",
      },
    ],
    edges: branchEdges,
  },
  {
    id: "site-up",
    name: "Is my website up?",
    tagline: "Request a URL, check the status code, branch on the result.",
    chain: ["HTTP", "Code", "Condition", "Alert"],
    nextStep: "Put your own URL in, add a Slack or email node on the \"Down\" branch, and schedule it every 5 minutes.",
    nodes: [
      TRIGGER,
      {
        id: "n2",
        type: "http_request",
        position: { x: 380, y: 300 },
        data: { method: "GET", url: "https://example.com", headers: { "User-Agent": "BlinkboxStarter/1.0" } },
        description: "Request the site",
      },
      {
        id: "n3",
        type: "code",
        position: { x: 600, y: 300 },
        data: {
          code:
            'const status = Number($input.status || 0);\n' +
            'return { status, checkedAt: new Date().toISOString(), up: status >= 200 && status < 400 ? "yes" : "no" };',
        },
        description: "Read the status",
      },
      {
        id: "n4",
        type: "condition",
        position: { x: 820, y: 300 },
        data: { conditions: [{ operator: "equals", left: "{{$json.up}}", right: "yes" }], mode: "and" },
        description: "Is it up?",
      },
      {
        id: "n5",
        type: "code",
        position: { x: 1080, y: 200 },
        data: { code: 'return { result: "UP", status: $input.status, checkedAt: $input.checkedAt };' },
        description: "Up",
      },
      {
        id: "n6",
        type: "code",
        position: { x: 1080, y: 420 },
        data: { code: 'return { result: "DOWN", status: $input.status, checkedAt: $input.checkedAt, todo: "Add a Slack or email node here" };' },
        description: "Down — alert here",
      },
    ],
    edges: branchEdges,
  },
];

// The body POST /api/automation expects. Trigger metadata mirrors what the
// canvas itself saves so activation and the node inspector behave identically.
export function templatePayload(template) {
  return {
    name: template.name,
    description: template.tagline,
    trigger: "manual",
    nodes: template.nodes,
    edges: template.edges,
    entryNodeId: "n1",
    triggerNodes: [{ nodeId: "n1", type: "manual" }],
    settings: { maxParallel: 10 },
  };
}
