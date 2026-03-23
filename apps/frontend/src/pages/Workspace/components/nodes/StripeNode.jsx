import SmartVariableInput from "../../../../components/ui/SmartVariableInput";
import CredentialPicker from "../../../../components/ui/CredentialPicker";

function StripeIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
    </svg>
  );
}

const ACTIONS = [
  { value: "create_customer", label: "Create Customer" },
  { value: "create_charge", label: "Create Charge" },
  { value: "list_customers", label: "List Customers" },
  { value: "create_invoice", label: "Create Invoice" },
];

export default function StripeNode({ config = {}, updateConfig }) {
  const action = config.action || "create_customer";

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-[#635BFF]/10 border border-[#635BFF]/30 rounded-xl">
        <div className="p-2 bg-[#635BFF]/20 rounded-lg text-[#635BFF] shrink-0">
          <StripeIcon className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#635BFF]">Stripe</span>
          <span className="text-[10px] text-zinc-400 leading-relaxed">
            Manage customers, charges, and invoices via the Stripe API.
          </span>
        </div>
      </div>

      {/* Credential Picker */}
      <CredentialPicker
        value={config.credentialId || ""}
        onChange={(id) => updateConfig("credentialId", id)}
        accentColor="purple"
        label="Secret API Key"
        placeholder="Select Stripe secret key..."
      />

      {/* Action Selector */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          Action
        </label>
        <select
          value={action}
          onChange={(e) => updateConfig("action", e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#635BFF]/50 transition-colors cursor-pointer appearance-none"
        >
          {ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {/* Dynamic Fields */}
      {action === "create_customer" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Customer Email</label>
            <SmartVariableInput
              value={config.email || ""}
              onChange={(val) => updateConfig("email", val)}
              placeholder="{{trigger.data.email}}"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Customer Name</label>
            <SmartVariableInput
              value={config.customerName || ""}
              onChange={(val) => updateConfig("customerName", val)}
              placeholder="{{trigger.data.name}}"
            />
          </div>
        </div>
      )}

      {action === "create_charge" && (
        <div className="flex gap-3">
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Amount (cents)</label>
            <SmartVariableInput
              value={config.amount || ""}
              onChange={(val) => updateConfig("amount", val)}
              placeholder="2000"
            />
          </div>
          <div className="flex flex-col gap-2 w-24">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Currency</label>
            <select
              value={config.currency || "usd"}
              onChange={(e) => updateConfig("currency", e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-[#635BFF]/50 transition-colors cursor-pointer appearance-none"
            >
              <option value="usd">USD</option>
              <option value="eur">EUR</option>
              <option value="gbp">GBP</option>
              <option value="cad">CAD</option>
            </select>
          </div>
        </div>
      )}

      {action === "list_customers" && (
        <div className="p-3 bg-zinc-800/40 border border-zinc-700/30 rounded-lg">
          <p className="text-[10px] text-zinc-500">
            No additional configuration needed. Returns the latest 10 customers.
          </p>
        </div>
      )}

      {action === "create_invoice" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Customer ID</label>
          <SmartVariableInput
            value={config.customerId || ""}
            onChange={(val) => updateConfig("customerId", val)}
            placeholder="cus_..."
          />
        </div>
      )}
    </div>
  );
}
