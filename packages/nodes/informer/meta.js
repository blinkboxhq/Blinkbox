export default {
  backendType: "informer",
  label: "Web Scraper",
  description: "Fetch and parse web page content via headless browser",
  fields: [
    { name: "source", label: "Source URL", type: "string", smart: true, placeholder: "https://example.com/page" },
    { name: "particularThing", label: "Extraction Goal", type: "string", smart: true, multiline: true, placeholder: "e.g. Find all pricing plans and the features included in the Pro tier..." },
  ],
  outputs: ["content", "title", "url", "extractedData"],
};
