# Credentials

The most common reason a Blinkbox workflow fails is a missing or mis-slotted
credential. Handle this **before** building, not after the first failed run.

---

## Two kinds

### 1. API key / token — you can create these

```
create_credential { name: "Stripe live key", secret: "sk_live_…", node: "stripe" }
→ ✅ Saved … id: 66f… — set config.credentialId to that id
```

- Stored **encrypted**; never readable back. `list_credentials` returns names, types
  and ids only.
- **Leave `type` empty.** It defaults to the type the node's own config panel looks
  for — that's what makes the credential appear in the right dropdown. Overriding it
  is how a credential ends up saved but invisible to the node.
- Always pass `node` so the type is derived from the real panel.
- Get the key from the app's own dashboard. Tell the user which one, and where.

### 2. OAuth — you cannot create these

**`google`, `slack`, `microsoft`, `github`, `airtable`, `notion`, `meta`**

These mint tokens through a browser consent screen. There is no chat path.
`create_credential` on one returns the Credentials-page instruction instead of
saving — that is the correct outcome.

What to do:
1. Tell the user to open the Blinkbox **Credentials** page and click **Connect** on
   that app.
2. Wait. Then re-run `list_credentials` (or `get_node`) to pick up the new id.

**Never ask a user to paste an OAuth access token or refresh token.** If they offer
one, decline and point them at the page — a pasted token is short-lived, unscoped and
unsafe, and it will break silently in days.

This covers more apps than the seven names suggest: Gmail, Google Sheets, Drive,
Calendar, Docs and Forms are all `google`; Outlook, Teams, OneDrive and SharePoint are
`microsoft`; WhatsApp and Instagram are `meta`.

---

## Where the id goes

Most nodes read `config.credentialId`. Some panels name their own key — `figma_trigger`
stores it under `token`.

Never assume. Both tools tell you:

- `get_node <key>` → *"Already connected: Stripe live key (id: 66f…) — set
  `config.credentialId` to one of these ids"*
- `list_credentials { node: "<key>" }` → same, filtered to that node

`get_node` reports credential status as part of its normal output, so a separate
`list_credentials` call for a node you just fetched is a wasted round trip.

---

## Matching

A credential is offered to a node when any of these line up: the node's OAuth
provider, the node's key, its integration name, or a type its panel declares. That's
why the default `type` matters — a Stripe key saved as `type: "api_key"` won't
surface on the Stripe node.

One credential serves many nodes. Users often already have what you need — check
`list_credentials` **first**, before asking for a key they'd have to go find.

---

## Standard flow

```
1. get_node <node>
2. Reports a connected credential?
   → use that id, keep building.
3. Reports none, and it's OAuth?
   → stop. Send the user to the Credentials page. Resume when they confirm.
4. Reports none, and it's an API key?
   → tell the user exactly which key and where in the app's dashboard to find it,
     then create_credential with node set.
```

Never fabricate a credential id to "keep going". A workflow wired to an id that
doesn't exist fails on activation with a message that looks like a platform bug.

---

## Related

- `/credentials` (GET) via `blinkbox_api_get` — full metadata for all of them.
- Live model lists for AI providers need a credential:
  `/automation/models/<provider>?credentialId=<id>` (rate-limited, 20/min).
- The `oauth` and `keys` API areas are blocked to the connector. Token exchange and
  API-key management happen in the app, by the user.
