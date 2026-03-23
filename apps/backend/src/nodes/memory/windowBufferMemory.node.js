/**
 * WINDOW BUFFER MEMORY NODE
 *
 * The simplest memory strategy — a sliding window over the message array.
 * Takes the incoming conversation history (or builds one from the current input)
 * and truncates it to the last N messages, preserving recency.
 *
 * No external dependencies. Purely stateless — the "buffer" lives in the
 * execution pipeline. For persistence across runs, chain with Redis or Postgres.
 *
 * Config:
 *   sessionId  — Logical grouping key (passed through, not used for storage)
 *   windowSize — Number of recent messages to keep (default: 20)
 *
 * Input:
 *   Array of { role, content } messages, OR a plain object/string
 *   (which gets wrapped as a single user message).
 *
 * Output:
 *   { messages: [{ role, content }, ...], sessionId, windowSize }
 *   messages array is always ≤ windowSize in length.
 */

export default {
  async run(config, input) {
    const { sessionId = "default", windowSize = 20 } = config;
    const size = Math.max(1, parseInt(windowSize, 10) || 20);

    // ── Normalize input into a message array ────────────────────────────
    let messages = [];

    if (Array.isArray(input)) {
      // Already a message array — validate shape
      messages = input
        .filter((m) => m && typeof m === "object" && m.role && m.content)
        .map((m) => ({ role: String(m.role), content: String(m.content) }));
    } else if (input && typeof input === "object" && input.messages) {
      // Wrapped format: { messages: [...] }
      messages = Array.isArray(input.messages)
        ? input.messages
            .filter((m) => m && m.role && m.content)
            .map((m) => ({ role: String(m.role), content: String(m.content) }))
        : [];
    } else if (typeof input === "string") {
      // Plain string → single user message
      messages = [{ role: "user", content: input }];
    } else if (input && typeof input === "object") {
      // Generic object → serialize as user message
      messages = [{ role: "user", content: JSON.stringify(input) }];
    }

    // ── Slide the window — keep only the last N ─────────────────────────
    const windowed = messages.slice(-size);

    return {
      messages: windowed,
      sessionId,
      windowSize: size,
    };
  },
};
