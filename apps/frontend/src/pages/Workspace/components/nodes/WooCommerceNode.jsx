import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

const OPERATIONS = [
  { value: "getOrder",       label: "Get Order" },
  { value: "listOrders",     label: "List Orders" },
  { value: "updateOrder",    label: "Update Order Status" },
  { value: "createProduct",  label: "Create Product" },
  { value: "updateProduct",  label: "Update Product" },
  { value: "getProduct",     label: "Get Product" },
  { value: "listProducts",   label: "List Products" },
  { value: "getCustomer",    label: "Get Customer" },
  { value: "createCoupon",   label: "Create Coupon" },
];

const ORDER_STATUSES = ["pending","processing","on-hold","completed","cancelled","refunded","failed"];

export default function WooCommerceNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "listOrders";

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#7F54B3]/10 border border-[#7F54B3]/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#7F54B3">
            <path d="M2.205 0C.986 0 0 .986 0 2.205v12.987c0 1.218.986 2.205 2.205 2.205h7.2l-1.065 2.84-3.12-.935-.624 2.078 5.34 1.597L12 21.225l2.064 1.752 5.34-1.597-.624-2.078-3.12.935L14.595 17.4h7.2c1.218 0 2.205-.987 2.205-2.205V2.205C24 .986 23.014 0 21.795 0zm1.11 4.425h15.37c.42 0 .75.33.75.75s-.33.75-.75.75H3.315c-.42 0-.75-.33-.75-.75s.33-.75.75-.75zm0 3h15.37c.42 0 .75.33.75.75s-.33.75-.75.75H3.315c-.42 0-.75-.33-.75-.75s.33-.75.75-.75zm0 3h9.37c.42 0 .75.33.75.75s-.33.75-.75.75H3.315c-.42 0-.75-.33-.75-.75s.33-.75.75-.75z"/>
          </svg>
        </div>
        <div>
          <div className="text-[13px] font-bold text-zinc-100">WooCommerce</div>
          <div className="text-[11px] text-zinc-500">Orders, products, customers, coupons</div>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Operation</label>
        <div className="grid grid-cols-2 gap-1">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all text-left ${op === o.value ? "bg-[#7F54B3]/10 border-[#7F54B3]/40 text-[#7F54B3]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Store URL</label>
        <SmartVariableInput nodeId={nodeId} value={config.storeUrl || ""} onChange={(v) => updateConfig("storeUrl", v)} placeholder="https://mystore.com" />
      </div>

      {["getOrder","updateOrder"].includes(op) && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Order ID</label>
          <SmartVariableInput nodeId={nodeId} value={config.orderId || ""} onChange={(v) => updateConfig("orderId", v)} placeholder="{{ $json.id }}" />
        </div>
      )}

      {op === "updateOrder" && (
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">New Status</label>
          <div className="flex gap-1 flex-wrap">
            {ORDER_STATUSES.map((s) => (
              <button key={s} onClick={() => updateConfig("status", s)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${config.status === s ? "bg-[#7F54B3]/10 border-[#7F54B3]/40 text-[#7F54B3]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {op === "listOrders" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Status Filter</label>
            <div className="flex gap-1 flex-wrap">
              {["any",...ORDER_STATUSES].map((s) => (
                <button key={s} onClick={() => updateConfig("statusFilter", s)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${(config.statusFilter||"any") === s ? "bg-[#7F54B3]/10 border-[#7F54B3]/40 text-[#7F54B3]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Limit</label>
            <SmartVariableInput nodeId={nodeId} value={config.limit || "20"} onChange={(v) => updateConfig("limit", v)} placeholder="20" />
          </div>
        </>
      )}

      {(op === "createProduct" || op === "updateProduct") && (
        <>
          {op === "updateProduct" && (
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Product ID</label>
              <SmartVariableInput nodeId={nodeId} value={config.productId || ""} onChange={(v) => updateConfig("productId", v)} placeholder="{{ $json.id }}" />
            </div>
          )}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Product Name</label>
            <SmartVariableInput nodeId={nodeId} value={config.name || ""} onChange={(v) => updateConfig("name", v)} placeholder="{{ $json.name }}" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Regular Price</label>
            <SmartVariableInput nodeId={nodeId} value={config.regularPrice || ""} onChange={(v) => updateConfig("regularPrice", v)} placeholder="49.99" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Description</label>
            <SmartVariableInput nodeId={nodeId} value={config.description || ""} onChange={(v) => updateConfig("description", v)} placeholder="Product description..." multiline />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Stock Quantity</label>
            <SmartVariableInput nodeId={nodeId} value={config.stockQuantity || ""} onChange={(v) => updateConfig("stockQuantity", v)} placeholder="100" />
          </div>
        </>
      )}

      {op === "createCoupon" && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Coupon Code</label>
            <SmartVariableInput nodeId={nodeId} value={config.code || ""} onChange={(v) => updateConfig("code", v)} placeholder="SUMMER20" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Discount Type</label>
            <div className="flex gap-1.5">
              {["percent","fixed_cart","fixed_product"].map((t) => (
                <button key={t} onClick={() => updateConfig("discountType", t)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${(config.discountType||"percent") === t ? "bg-[#7F54B3]/10 border-[#7F54B3]/40 text-[#7F54B3]" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}>
                  {t === "percent" ? "%" : t === "fixed_cart" ? "Cart $" : "Product $"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Amount</label>
            <SmartVariableInput nodeId={nodeId} value={config.amount || ""} onChange={(v) => updateConfig("amount", v)} placeholder="20" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Expiry Date (YYYY-MM-DD)</label>
            <SmartVariableInput nodeId={nodeId} value={config.dateExpires || ""} onChange={(v) => updateConfig("dateExpires", v)} placeholder="2024-12-31" />
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="blue" label="WooCommerce API Key + Secret" placeholder="Select WooCommerce credential..." />

      <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500">
        Returns: <span className="text-zinc-300">id, status, total, line_items, customer</span>
      </div>
    </div>
  );
}
