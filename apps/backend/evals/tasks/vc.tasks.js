const ok = (cond, detail) => { if (!cond) throw new Error(detail); };
const must = (r, what) => {
  if (!r || r.success !== true) throw new Error(`${what} failed: ${r?.error || "no result"}`);
  return r;
};

export const vcTasks = [
  {
    id: "open-url",
    name: "open_url loads page and reports title",
    run: async ({ base, vc }) => {
      const r = must(await vc.do("open_url", { url: `${base}/index.html` }), "open_url");
      ok(r.title === "Blinkbox Eval Landing", `title was "${r.title}"`);
      ok(String(r.url).includes("index.html"), `url was "${r.url}"`);
    },
  },
  {
    id: "screenshot",
    name: "screenshot returns a jpeg data URI",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/index.html` }), "open_url");
      const r = must(await vc.do("screenshot", {}), "screenshot");
      ok(typeof r.screenshot === "string" && r.screenshot.startsWith("data:image/jpeg;base64,"),
        "screenshot is not a jpeg data URI");
      ok(r.screenshot.length > 1000, `screenshot suspiciously small (${r.screenshot.length} chars)`);
    },
  },
  {
    id: "read-page",
    name: "read_page indexes interactive elements",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/index.html` }), "open_url");
      const r = must(await vc.do("read_page", {}), "read_page");
      ok(r.data?.count >= 4, `expected >=4 elements, got ${r.data?.count}`);
      ok(String(r.data?.listing).includes("Sign in"), "listing missing 'Sign in' button");
      const link = r.data.elements.find((e) => (e.text || "").includes("Form playground"));
      ok(link && link.tag === "a" && String(link.href).includes("form.html"),
        "Form playground link not indexed with href");
    },
  },
  {
    id: "click-index",
    name: "click_index navigates via indexed element",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/index.html` }), "open_url");
      const r = must(await vc.do("read_page", {}), "read_page");
      const i = r.data.elements.findIndex((e) => (e.text || "").includes("Form playground"));
      ok(i >= 0, "Form playground not in index");
      must(await vc.do("click_index", { index: i }), "click_index");
      await vc.do("wait", { ms: 800 });
      const href = must(await vc.do("evaluate", { code: "location.href" }), "evaluate");
      ok(String(href.data).includes("form.html"), `landed on ${href.data}`);
    },
  },
  {
    id: "click-text",
    name: "click_text finds element by visible text",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/index.html` }), "open_url");
      must(await vc.do("click_text", { text: "Pricing table" }), "click_text");
      await vc.do("wait", { ms: 800 });
      const href = must(await vc.do("evaluate", { code: "location.href" }), "evaluate");
      ok(String(href.data).includes("table.html"), `landed on ${href.data}`);
    },
  },
  {
    id: "fill-field-label",
    name: "fill_field resolves input by label text",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/form.html` }), "open_url");
      must(await vc.do("fill_field", { query: "Full name", value: "Ada Lovelace" }), "fill_field");
      const v = must(await vc.do("evaluate", { code: "document.getElementById('name').value" }), "evaluate");
      ok(v.data === "Ada Lovelace", `field value was "${v.data}"`);
    },
  },
  {
    id: "type-selector",
    name: "type writes into a selector-targeted input",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/form.html` }), "open_url");
      must(await vc.do("type", { selector: "#email", text: "ada@blinkbox.dev" }), "type");
      const v = must(await vc.do("evaluate", { code: "document.getElementById('email').value" }), "evaluate");
      ok(v.data === "ada@blinkbox.dev", `field value was "${v.data}"`);
    },
  },
  {
    id: "select-dropdown",
    name: "select_dropdown picks an option by value",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/form.html` }), "open_url");
      must(await vc.do("select_dropdown", { selector: "#country", value: "in" }), "select_dropdown");
      const v = must(await vc.do("evaluate", { code: "document.getElementById('country').value" }), "evaluate");
      ok(v.data === "in", `select value was "${v.data}"`);
    },
  },
  {
    id: "form-submit-flow",
    name: "multi-step form fill and submit",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/form.html` }), "open_url");
      must(await vc.do("fill_field", { query: "Full name", value: "Ada Lovelace" }), "fill_field name");
      must(await vc.do("fill_field", { query: "Email address", value: "ada@blinkbox.dev" }), "fill_field email");
      must(await vc.do("select_dropdown", { selector: "#country", value: "in" }), "select_dropdown");
      must(await vc.do("click", { selector: "#submit" }), "click submit");
      const t = must(await vc.do("get_text", { selector: "#result" }), "get_text");
      ok(t.data === "Submitted: Ada Lovelace <ada@blinkbox.dev> from in", `result was "${t.data}"`);
    },
  },
  {
    id: "press-key-combo",
    name: "press_key delivers ctrl+shift+k combo",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/keys.html` }), "open_url");
      must(await vc.do("click", { selector: "#capture" }), "focus input");
      must(await vc.do("press_key", { key: "ctrl+shift+k" }), "press_key");
      const t = must(await vc.do("get_text", { selector: "#log" }), "get_text");
      ok(String(t.data).includes("Control+Shift+K"), `log was "${t.data}"`);
    },
  },
  {
    id: "press-key-alias",
    name: "press_key normalizes xdotool-style 'Return'",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/keys.html` }), "open_url");
      must(await vc.do("click", { selector: "#capture" }), "focus input");
      must(await vc.do("press_key", { key: "Return" }), "press_key");
      const t = must(await vc.do("get_text", { selector: "#log" }), "get_text");
      ok(String(t.data).includes("Enter"), `log was "${t.data}"`);
    },
  },
  {
    id: "dialog-capture",
    name: "confirm() dialog is auto-accepted and surfaced in meta",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/dialog.html` }), "open_url");
      const r = must(await vc.do("click", { selector: "#danger" }), "click");
      ok(r.dialog?.message === "Delete item?", `dialog meta was ${JSON.stringify(r.dialog)}`);
      const t = must(await vc.do("get_text", { selector: "#outcome" }), "get_text");
      ok(t.data === "accepted", `outcome was "${t.data}"`);
    },
  },
  {
    id: "popup-follow",
    name: "target=_blank popup becomes the active page",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/index.html` }), "open_url");
      must(await vc.do("click_text", { text: "Open docs" }), "click_text");
      await vc.do("wait", { ms: 1200 });
      const t = must(await vc.do("get_text", { selector: "#popup-h1" }), "get_text");
      ok(t.data === "Popup Reached", `popup text was "${t.data}"`);
    },
  },
  {
    id: "pagination",
    name: "click_text drives table pagination",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/table.html` }), "open_url");
      const p1 = must(await vc.do("get_text", {}), "get_text page1");
      ok(String(p1.data).includes("Widget Alpha"), "page 1 missing Widget Alpha");
      must(await vc.do("click_text", { text: "Next" }), "click_text Next");
      await vc.do("wait", { ms: 400 });
      const p2 = must(await vc.do("get_text", {}), "get_text page2");
      ok(String(p2.data).includes("Widget Zeta"), "page 2 missing Widget Zeta");
      ok(!String(p2.data).includes("Widget Alpha"), "page 1 rows still visible after Next");
    },
  },
  {
    id: "scroll-action",
    name: "scroll moves the viewport",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/scroll.html` }), "open_url");
      must(await vc.do("scroll", { direction: "down", amount: 5 }), "scroll");
      const y = must(await vc.do("evaluate", { code: "window.scrollY" }), "evaluate");
      ok(Number(y.data) > 0, `scrollY was ${y.data}`);
    },
  },
  {
    id: "below-fold-click",
    name: "click auto-scrolls to an off-screen element",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/scroll.html` }), "open_url");
      must(await vc.do("click", { selector: "#deep" }), "click");
      const t = must(await vc.do("get_text", { selector: "#deep-result" }), "get_text");
      ok(t.data === "clicked", `deep-result was "${t.data}"`);
    },
  },
  {
    id: "get-html",
    name: "get_html returns scoped markup",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/form.html` }), "open_url");
      const r = must(await vc.do("get_html", { selector: "#order" }), "get_html");
      ok(typeof r.data === "string" && r.data.includes('id="email"'), "markup missing #email input");
    },
  },
  {
    id: "evaluate-js",
    name: "evaluate runs JS and returns the value",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/index.html` }), "open_url");
      const r = must(await vc.do("evaluate", { code: "2 + 40" }), "evaluate");
      ok(r.data === 42, `evaluate returned ${JSON.stringify(r.data)}`);
    },
  },
  {
    id: "wait-for-delayed",
    name: "wait_for_selector catches late-rendered content",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/delayed.html` }), "open_url");
      must(await vc.do("wait_for_selector", { selector: "#late", timeout: 5000 }), "wait_for_selector");
      const t = must(await vc.do("get_text", { selector: "#late" }), "get_text");
      ok(t.data === "Late content", `late text was "${t.data}"`);
    },
  },
  {
    id: "history-nav",
    name: "back/forward traverse session history",
    run: async ({ base, vc }) => {
      must(await vc.do("open_url", { url: `${base}/index.html` }), "open_url");
      must(await vc.do("open_url", { url: `${base}/form.html` }), "open_url");
      must(await vc.do("back", {}), "back");
      await vc.do("wait", { ms: 500 });
      const b = must(await vc.do("evaluate", { code: "location.href" }), "evaluate after back");
      ok(String(b.data).includes("index.html"), `back landed on ${b.data}`);
      must(await vc.do("forward", {}), "forward");
      await vc.do("wait", { ms: 500 });
      const f = must(await vc.do("evaluate", { code: "location.href" }), "evaluate after forward");
      ok(String(f.data).includes("form.html"), `forward landed on ${f.data}`);
    },
  },
];
