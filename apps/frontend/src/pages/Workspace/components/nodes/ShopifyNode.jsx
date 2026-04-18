import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "listProducts",   label: "List Products" },
  { value: "getProduct",     label: "Get Product" },
  { value: "createProduct",  label: "Create Product" },
  { value: "updateProduct",  label: "Update Product" },
  { value: "listOrders",     label: "List Orders" },
  { value: "getOrder",       label: "Get Order" },
  { value: "updateOrder",    label: "Update Order" },
  { value: "createCustomer", label: "Create Customer" },
  { value: "getCustomer",    label: "Get Customer" },
  { value: "listCustomers",  label: "List Customers" },
];

export default function ShopifyNode({ config = {}, updateConfig }) {
  const op = config.operation || "listOrders";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#95BF47]/5 border border-[#95BF47]/20 rounded-xl">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#95BF47]">Shopify</span>
          <span className="text-[10px] text-zinc-500">Products, orders, and customers</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Shop Domain</label>
        <input value={config.shop || ""} onChange={(e) => updateConfig("shop", e.target.value)}
          placeholder="mystore.myshopify.com"
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#95BF47]/40" />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-1.5">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${op === o.value ? "bg-[#95BF47]/10 border-[#95BF47]/40 text-[#95BF47]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["getProduct", "updateProduct"].includes(op) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Product ID</label>
          <SmartVariableInput value={config.productId || ""} onChange={(v) => updateConfig("productId", v)} placeholder="{{n1.id}}" />
        </div>
      )}

      {["createProduct", "updateProduct"].includes(op) && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Title</label>
            <SmartVariableInput value={config.title || ""} onChange={(v) => updateConfig("title", v)} placeholder="Premium Widget" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description (HTML)</label>
            <SmartVariableInput value={config.description || ""} onChange={(v) => updateConfig("description", v)} placeholder="<p>Best widget ever</p>" multiline />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Price</label>
              <SmartVariableInput value={config.price || ""} onChange={(v) => updateConfig("price", v)} placeholder="29.99" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</label>
              <select value={config.status || "draft"} onChange={(e) => updateConfig("status", e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#95BF47]/40">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </>
      )}

      {["getOrder", "updateOrder"].includes(op) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Order ID</label>
          <SmartVariableInput value={config.orderId || ""} onChange={(v) => updateConfig("orderId", v)} placeholder="{{n1.id}}" />
        </div>
      )}

      {op === "listOrders" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status Filter</label>
          <div className="grid grid-cols-3 gap-1.5">
            {["any", "open", "closed"].map((s) => (
              <button key={s} onClick={() => updateConfig("status", s)}
                className={`py-2 rounded-lg border text-xs font-bold capitalize transition-all ${(config.status || "any") === s ? "bg-[#95BF47]/10 border-[#95BF47]/40 text-[#95BF47]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {["createCustomer", "getCustomer"].includes(op) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Email</label>
          <SmartVariableInput value={config.email || ""} onChange={(v) => updateConfig("email", v)} placeholder="{{n1.email}}" />
        </div>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="green" label="Shopify Admin API Token" placeholder="Select Shopify credential..." />
    </div>
  );
}
