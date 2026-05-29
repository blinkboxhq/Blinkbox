export default {
  backendType: "rss_feed",
  label: "RSS Feed Generator",
  description: "Create and manage your own RSS / Atom feed",
  fields: [
    { name: "mode", label: "Action", type: "options", cols: 3, default: "add_item", options: [
      { value: "add_item",  label: "Add Item" },
      { value: "generate",  label: "Generate XML" },
      { value: "read",      label: "Read Feed" },
    ]},
    { name: "storageKey", label: "Feed ID (storage key)", type: "string", smart: false, mono: true, default: "my_rss_feed", placeholder: "my_blog_feed" },
    { name: "feedTitle", label: "Feed Title", type: "string", smart: true, placeholder: "My Awesome Blog", show: { mode: ["add_item","generate"] } },
    { name: "feedDesc", label: "Feed Description", type: "string", smart: true, placeholder: "Latest articles from my blog", show: { mode: ["add_item","generate"] } },
    { name: "feedUrl", label: "Feed Website URL", type: "string", smart: true, placeholder: "https://myblog.com", show: { mode: ["add_item","generate"] } },
    { name: "itemTitle", label: "Item Title", type: "string", smart: true, placeholder: "{{ $json.title }}", show: { mode: "add_item" } },
    { name: "itemUrl", label: "Item URL", type: "string", smart: true, placeholder: "{{ $json.url }}", show: { mode: "add_item" } },
    { name: "itemAuthor", label: "Item Author", type: "string", smart: true, placeholder: "{{ $json.author }}", show: { mode: "add_item" } },
    { name: "itemDate", label: "Item Date", type: "string", smart: true, placeholder: "{{ $json.publishedAt }}", show: { mode: "add_item" } },
    { name: "itemDesc", label: "Item Description / Summary", type: "string", smart: true, multiline: true, placeholder: "{{ $json.excerpt }}", show: { mode: "add_item" } },
    { name: "itemImage", label: "Item Image URL (optional)", type: "string", smart: true, placeholder: "{{ $json.thumbnailUrl }}", show: { mode: "add_item" } },
    { name: "maxItems", label: "Max Items to Keep", type: "number", default: 50, min: 5, max: 500, show: { mode: "add_item" } },
  ],
};
