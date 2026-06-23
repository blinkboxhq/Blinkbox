---
description: Scaffolds a new integration or logic node for the Blinkbox backend.
---

You are tasked with scaffolding a new node for the Blinkbox platform.

Ask the user for:

1. The Node Name (e.g., "Shopify", "DataFilter").
2. The Node Type ("trigger", "action", or "logic").
3. A brief description of what it does.

Once provided, create a new Javascript file in `apps/backend/src/nodes/` named according to the input (e.g., `[name].node.js` or `[name]TriggerNode.jsx` if it requires UI components).

Populate the file with the standard Blinkbox node boilerplate, including mock input/output schemas and an empty async handler function ready for the specific API logic. Ensure it is ready to be registered in `agentTools.registry.js` or `nodeRegistry.js`.
