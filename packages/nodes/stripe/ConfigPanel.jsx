import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";
import imgStripe from "@/assets/stripe.svg";

const OPERATIONS = [
  { value: "createCustomer",      label: "Create Customer" },
  { value: "getCustomer",         label: "Get Customer" },
  { value: "listCustomers",       label: "List Customers" },
  { value: "createPaymentIntent", label: "Create Payment Intent" },
  { value: "getPaymentIntent",    label: "Get Payment Intent" },
  { value: "listCharges",         label: "List Charges" },
  { value: "createRefund",        label: "Refund Charge" },
  { value: "listInvoices",        label: "List Invoices" },
  { value: "createProduct",       label: "Create Product" },
  { value: "createPrice",         label: "Create Price" },
];

export default function StripeNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || "createCustomer";

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#635BFF]/5 border border-[#635BFF]/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-[#635BFF]/10 border border-[#635BFF]/20 flex items-center justify-center shrink-0">
          <img src={imgStripe} alt="Stripe" className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#635BFF]">Stripe</span>
          <span className="text-[10px] text-zinc-500">Customers, payments, refunds, invoices</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Operation</label>
        <div className="grid grid-cols-2 gap-1.5">
          {OPERATIONS.map((o) => (
            <button key={o.value} onClick={() => updateConfig("operation", o.value)}
              className={`py-2 rounded-lg border text-xs font-bold transition-all ${op === o.value ? "bg-[#635BFF]/10 border-[#635BFF]/40 text-[#635BFF]" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {["createCustomer", "listCustomers", "getCustomer"].includes(op) && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Email</label>
          <SmartVariableInput nodeId={nodeId} value={config.email || ""} onChange={(v) => updateConfig("email", v)} placeholder="{{n1.email}}" />
        </div>
      )}

      {op === "createCustomer" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Name</label>
          <SmartVariableInput nodeId={nodeId} value={config.name || ""} onChange={(v) => updateConfig("name", v)} placeholder="{{n1.name}}" />
        </div>
      )}

      {op === "getCustomer" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Customer ID</label>
          <SmartVariableInput nodeId={nodeId} value={config.customerId || ""} onChange={(v) => updateConfig("customerId", v)} placeholder="cus_..." />
        </div>
      )}

      {op === "createPaymentIntent" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Amount (cents)</label>
              <SmartVariableInput nodeId={nodeId} value={config.amount || ""} onChange={(v) => updateConfig("amount", v)} placeholder="2000" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Currency</label>
              <SmartVariableInput nodeId={nodeId} value={config.currency || "usd"} onChange={(v) => updateConfig("currency", v)} placeholder="usd" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Customer ID (optional)</label>
            <SmartVariableInput nodeId={nodeId} value={config.customerId || ""} onChange={(v) => updateConfig("customerId", v)} placeholder="cus_..." />
          </div>
        </>
      )}

      {op === "getPaymentIntent" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Payment Intent ID</label>
          <SmartVariableInput nodeId={nodeId} value={config.paymentIntentId || ""} onChange={(v) => updateConfig("paymentIntentId", v)} placeholder="pi_..." />
        </div>
      )}

      {op === "createRefund" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Charge ID (or Payment Intent ID)</label>
            <SmartVariableInput nodeId={nodeId} value={config.chargeId || ""} onChange={(v) => updateConfig("chargeId", v)} placeholder="ch_..." />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Amount (cents, blank = full refund)</label>
            <SmartVariableInput nodeId={nodeId} value={config.amount || ""} onChange={(v) => updateConfig("amount", v)} placeholder="1000" />
          </div>
        </>
      )}

      {op === "createProduct" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Product Name</label>
          <SmartVariableInput nodeId={nodeId} value={config.name || ""} onChange={(v) => updateConfig("name", v)} placeholder="Premium Plan" />
        </div>
      )}

      {op === "createPrice" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Product ID</label>
            <SmartVariableInput nodeId={nodeId} value={config.productId || ""} onChange={(v) => updateConfig("productId", v)} placeholder="prod_..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Unit Amount (cents)</label>
              <SmartVariableInput nodeId={nodeId} value={config.unitAmount || ""} onChange={(v) => updateConfig("unitAmount", v)} placeholder="999" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Currency</label>
              <SmartVariableInput nodeId={nodeId} value={config.currency || "usd"} onChange={(v) => updateConfig("currency", v)} placeholder="usd" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recurring Interval (optional)</label>
            <select value={config.interval || ""} onChange={(e) => updateConfig("interval", e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#635BFF]/40">
              <option value="">One-time</option>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
        </>
      )}

      <CredentialPicker value={config.credentialId || ""} onChange={(id) => updateConfig("credentialId", id)}
        accentColor="violet" label="Stripe Secret Key" placeholder="Select Stripe credential..." />
    </div>
  );
}
