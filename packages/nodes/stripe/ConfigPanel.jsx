import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";
import imgStripe from "@/assets/stripe.svg";
import {
  Users, User, UserCog, UserMinus, List, Search,
  CreditCard, FileText, Pencil, CheckCircle2, Camera, XCircle,
  Receipt, RefreshCw, Undo2, FileCheck, Send, Ban, Plus,
  Package, Tag, Trash2, DollarSign, Repeat, PlayCircle,
  ShoppingCart, Link2, Ticket, Percent, Banknote, Scale,
  Wallet, ArrowLeftRight, Zap, ShieldAlert,
} from "lucide-react";

const ACCENT = "#635BFF";

const GROUPS = [
  {
    title: "Customers",
    ops: [
      { value: "createCustomer", label: "Create Customer", icon: Users },
      { value: "getCustomer", label: "Get Customer", icon: User },
      { value: "updateCustomer", label: "Update Customer", icon: UserCog },
      { value: "deleteCustomer", label: "Delete Customer", icon: UserMinus },
      { value: "listCustomers", label: "List Customers", icon: List },
      { value: "searchCustomers", label: "Search Customers", icon: Search },
    ],
  },
  {
    title: "Payment Intents",
    ops: [
      { value: "createPaymentIntent", label: "Create Intent", icon: CreditCard },
      { value: "getPaymentIntent", label: "Get Intent", icon: FileText },
      { value: "updatePaymentIntent", label: "Update Intent", icon: Pencil },
      { value: "confirmPaymentIntent", label: "Confirm Intent", icon: CheckCircle2 },
      { value: "capturePaymentIntent", label: "Capture Intent", icon: Camera },
      { value: "cancelPaymentIntent", label: "Cancel Intent", icon: XCircle },
      { value: "listPaymentIntents", label: "List Intents", icon: List },
    ],
  },
  {
    title: "Charges & Refunds",
    ops: [
      { value: "getCharge", label: "Get Charge", icon: Receipt },
      { value: "listCharges", label: "List Charges", icon: List },
      { value: "captureCharge", label: "Capture Charge", icon: Camera },
      { value: "createRefund", label: "Create Refund", icon: Undo2 },
      { value: "getRefund", label: "Get Refund", icon: FileText },
      { value: "listRefunds", label: "List Refunds", icon: RefreshCw },
    ],
  },
  {
    title: "Invoices",
    ops: [
      { value: "createInvoice", label: "Create Invoice", icon: FileText },
      { value: "getInvoice", label: "Get Invoice", icon: FileText },
      { value: "finalizeInvoice", label: "Finalize", icon: FileCheck },
      { value: "payInvoice", label: "Pay Invoice", icon: CheckCircle2 },
      { value: "sendInvoice", label: "Send Invoice", icon: Send },
      { value: "voidInvoice", label: "Void Invoice", icon: Ban },
      { value: "listInvoices", label: "List Invoices", icon: List },
      { value: "createInvoiceItem", label: "Add Line Item", icon: Plus },
    ],
  },
  {
    title: "Products & Prices",
    ops: [
      { value: "createProduct", label: "Create Product", icon: Package },
      { value: "getProduct", label: "Get Product", icon: Package },
      { value: "updateProduct", label: "Update Product", icon: Pencil },
      { value: "deleteProduct", label: "Delete Product", icon: Trash2 },
      { value: "listProducts", label: "List Products", icon: List },
      { value: "createPrice", label: "Create Price", icon: Tag },
      { value: "getPrice", label: "Get Price", icon: DollarSign },
      { value: "updatePrice", label: "Update Price", icon: Pencil },
      { value: "listPrices", label: "List Prices", icon: List },
    ],
  },
  {
    title: "Subscriptions",
    ops: [
      { value: "createSubscription", label: "Create Sub", icon: Repeat },
      { value: "getSubscription", label: "Get Sub", icon: FileText },
      { value: "updateSubscription", label: "Update Sub", icon: Pencil },
      { value: "cancelSubscription", label: "Cancel Sub", icon: XCircle },
      { value: "listSubscriptions", label: "List Subs", icon: List },
    ],
  },
  {
    title: "Checkout & Links",
    ops: [
      { value: "createCheckoutSession", label: "Create Checkout", icon: ShoppingCart },
      { value: "getCheckoutSession", label: "Get Checkout", icon: FileText },
      { value: "listCheckoutSessions", label: "List Checkouts", icon: List },
      { value: "expireCheckoutSession", label: "Expire Checkout", icon: XCircle },
      { value: "createPaymentLink", label: "Create Link", icon: Link2 },
      { value: "listPaymentLinks", label: "List Links", icon: List },
    ],
  },
  {
    title: "Coupons & Promos",
    ops: [
      { value: "createCoupon", label: "Create Coupon", icon: Ticket },
      { value: "listCoupons", label: "List Coupons", icon: List },
      { value: "deleteCoupon", label: "Delete Coupon", icon: Trash2 },
      { value: "createPromoCode", label: "Create Promo", icon: Percent },
      { value: "listPromoCodes", label: "List Promos", icon: List },
    ],
  },
  {
    title: "Payouts & Balance",
    ops: [
      { value: "createPayout", label: "Create Payout", icon: Banknote },
      { value: "listPayouts", label: "List Payouts", icon: List },
      { value: "getBalance", label: "Get Balance", icon: Wallet },
      { value: "listBalanceTransactions", label: "Balance Txns", icon: List },
      { value: "createTransfer", label: "Create Transfer", icon: ArrowLeftRight },
      { value: "listTransfers", label: "List Transfers", icon: List },
    ],
  },
  {
    title: "Disputes, Methods & Events",
    ops: [
      { value: "listDisputes", label: "List Disputes", icon: Scale },
      { value: "getDispute", label: "Get Dispute", icon: ShieldAlert },
      { value: "closeDispute", label: "Close Dispute", icon: Ban },
      { value: "attachPaymentMethod", label: "Attach Method", icon: CreditCard },
      { value: "detachPaymentMethod", label: "Detach Method", icon: CreditCard },
      { value: "listPaymentMethods", label: "List Methods", icon: List },
      { value: "createSetupIntent", label: "Setup Intent", icon: Zap },
      { value: "listEvents", label: "List Events", icon: List },
      { value: "getEvent", label: "Get Event", icon: FileText },
    ],
  },
];

const DURATIONS = [
  { value: "once", label: "Once" },
  { value: "repeating", label: "Repeating" },
  { value: "forever", label: "Forever" },
];
const INTERVALS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];
const MODES = [
  { value: "payment", label: "Payment" },
  { value: "subscription", label: "Subscription" },
  { value: "setup", label: "Setup" },
];

const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
const inputCls =
  "w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#635BFF]/40";

export default function StripeNode({ config = {}, updateConfig }) {
  const op = config.operation || "createCustomer";
  const set = (k) => (v) => updateConfig(k, v);
  const show = (...ops) => ops.includes(op);

  function Field({ label, hint, children }) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className={lbl}>{label}</span>
        {children}
        {hint && <span className="text-[10px] text-zinc-600">{hint}</span>}
      </div>
    );
  }

  function Var({ k, placeholder, multiline, def }) {
    return (
      <SmartVariableInput
        value={config[k] ?? def ?? ""}
        onChange={set(k)}
        placeholder={placeholder}
        multiline={multiline}
        className={inputCls}
      />
    );
  }

  function Pills({ k, items, def }) {
    const cur = config[k] ?? def;
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((it) => {
          const active = cur === it.value;
          return (
            <button
              key={it.value}
              type="button"
              onClick={() => set(k)(it.value)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 border ${
                active
                  ? "text-white"
                  : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
              }`}
              style={active ? { backgroundColor: `${ACCENT}1a`, borderColor: `${ACCENT}66`, color: ACCENT } : {}}
            >
              {it.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#635BFF]/5 border border-[#635BFF]/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-[#635BFF]/10 border border-[#635BFF]/25 flex items-center justify-center shrink-0">
          <img src={imgStripe} alt="Stripe" className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#635BFF]">Stripe</span>
          <span className="text-[10px] text-zinc-500">Payments, subscriptions, invoices & 70 actions</span>
        </div>
      </div>

      <CredentialPicker
        provider="stripe"
        value={config.credentialId || ""}
        onChange={set("credentialId")}
        accentColor={ACCENT}
        label="Stripe Secret Key"
        placeholder="Connect your Stripe account"
      />

      <div className="flex flex-col gap-3">
        <span className={lbl}>Operation</span>
        {GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{group.title}</span>
            <div className="grid grid-cols-2 gap-2">
              {group.ops.map((o) => {
                const Icon = o.icon;
                const active = op === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => set("operation")(o.value)}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all duration-150 ${
                      active ? "text-white" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
                    }`}
                    style={active ? { backgroundColor: `${ACCENT}1a`, borderColor: `${ACCENT}66`, color: ACCENT } : {}}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] font-semibold truncate">{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {show("getCustomer", "updateCustomer", "deleteCustomer") && (
          <Field label="Customer ID"><Var k="customerId" placeholder="cus_..." /></Field>
        )}
        {show("createCustomer", "updateCustomer") && (
          <>
            <Field label="Email"><Var k="email" placeholder="customer@example.com" /></Field>
            <Field label="Name"><Var k="name" placeholder="Jane Doe" /></Field>
            <Field label="Phone"><Var k="phone" placeholder="+1 555 555 5555" /></Field>
          </>
        )}
        {show("searchCustomers") && (
          <Field label="Search Query" hint="e.g. email:'jane@example.com' AND metadata['plan']:'pro'">
            <Var k="query" placeholder="email:'jane@example.com'" />
          </Field>
        )}

        {show("getPaymentIntent", "updatePaymentIntent", "confirmPaymentIntent", "capturePaymentIntent", "cancelPaymentIntent") && (
          <Field label="Payment Intent ID"><Var k="paymentIntentId" placeholder="pi_..." /></Field>
        )}
        {show("createPaymentIntent") && (
          <>
            <Field label="Amount (in cents)" hint="e.g. 1999 = $19.99"><Var k="amount" placeholder="1999" /></Field>
            <Field label="Currency"><Var k="currency" placeholder="usd" def="usd" /></Field>
            <Field label="Customer ID (optional)"><Var k="customerId" placeholder="cus_..." /></Field>
            <Field label="Payment Method (optional)"><Var k="paymentMethodId" placeholder="pm_..." /></Field>
          </>
        )}
        {show("cancelPaymentIntent") && (
          <Field label="Cancellation Reason (optional)"><Var k="reason" placeholder="requested_by_customer" /></Field>
        )}

        {show("getCharge", "captureCharge") && (
          <Field label="Charge ID"><Var k="chargeId" placeholder="ch_..." /></Field>
        )}
        {show("createRefund") && (
          <>
            <Field label="Charge ID"><Var k="chargeId" placeholder="ch_... (or use intent below)" /></Field>
            <Field label="Payment Intent ID"><Var k="paymentIntentId" placeholder="pi_..." /></Field>
            <Field label="Amount in cents (optional)" hint="Leave blank for full refund"><Var k="amount" placeholder="500" /></Field>
            <Field label="Reason (optional)"><Var k="reason" placeholder="requested_by_customer" /></Field>
          </>
        )}
        {show("getRefund") && <Field label="Refund ID"><Var k="refundId" placeholder="re_..." /></Field>}

        {show("getInvoice", "finalizeInvoice", "payInvoice", "sendInvoice", "voidInvoice") && (
          <Field label="Invoice ID"><Var k="invoiceId" placeholder="in_..." /></Field>
        )}
        {show("createInvoice", "createInvoiceItem") && (
          <Field label="Customer ID"><Var k="customerId" placeholder="cus_..." /></Field>
        )}
        {show("createInvoiceItem") && (
          <>
            <Field label="Amount (in cents)"><Var k="amount" placeholder="2500" /></Field>
            <Field label="Currency"><Var k="currency" placeholder="usd" def="usd" /></Field>
            <Field label="Invoice ID (optional)"><Var k="invoiceId" placeholder="in_..." /></Field>
          </>
        )}
        {show("listInvoices") && (
          <Field label="Status (optional)"><Var k="status" placeholder="open, paid, draft, void" /></Field>
        )}

        {show("getProduct", "updateProduct", "deleteProduct", "createPrice", "listPrices") && (
          <Field label="Product ID"><Var k="productId" placeholder="prod_..." /></Field>
        )}
        {show("createProduct", "updateProduct") && (
          <Field label="Product Name"><Var k="name" placeholder="Premium Plan" /></Field>
        )}
        {show("getPrice", "updatePrice") && <Field label="Price ID"><Var k="priceId" placeholder="price_..." /></Field>}
        {show("createPrice") && (
          <>
            <Field label="Unit Amount (in cents)"><Var k="unitAmount" placeholder="1999" /></Field>
            <Field label="Currency"><Var k="currency" placeholder="usd" def="usd" /></Field>
            <Field label="Recurring Interval (optional)" hint="Leave blank for one-time price">
              <Pills k="interval" items={INTERVALS} />
            </Field>
          </>
        )}

        {show("getSubscription", "updateSubscription", "cancelSubscription") && (
          <Field label="Subscription ID"><Var k="subscriptionId" placeholder="sub_..." /></Field>
        )}
        {show("createSubscription") && (
          <>
            <Field label="Customer ID"><Var k="customerId" placeholder="cus_..." /></Field>
            <Field label="Price ID"><Var k="priceId" placeholder="price_..." /></Field>
            <Field label="Quantity"><Var k="quantity" placeholder="1" def="1" /></Field>
            <Field label="Trial Days (optional)"><Var k="trialDays" placeholder="14" /></Field>
          </>
        )}

        {show("getCheckoutSession", "expireCheckoutSession") && (
          <Field label="Session ID"><Var k="sessionId" placeholder="cs_..." /></Field>
        )}
        {show("createCheckoutSession") && (
          <>
            <Field label="Mode"><Pills k="mode" items={MODES} def="payment" /></Field>
            <Field label="Price ID"><Var k="priceId" placeholder="price_..." /></Field>
            <Field label="Quantity"><Var k="quantity" placeholder="1" def="1" /></Field>
            <Field label="Success URL"><Var k="successUrl" placeholder="https://yoursite.com/success" /></Field>
            <Field label="Cancel URL"><Var k="cancelUrl" placeholder="https://yoursite.com/cancel" /></Field>
            <Field label="Customer Email (optional)"><Var k="email" placeholder="customer@example.com" /></Field>
          </>
        )}
        {show("createPaymentLink") && (
          <>
            <Field label="Price ID"><Var k="priceId" placeholder="price_..." /></Field>
            <Field label="Quantity"><Var k="quantity" placeholder="1" def="1" /></Field>
          </>
        )}

        {show("createCoupon") && (
          <>
            <Field label="Percent Off (optional)" hint="e.g. 25 for 25%"><Var k="percentOff" placeholder="25" /></Field>
            <Field label="Amount Off in cents (optional)"><Var k="amountOff" placeholder="500" /></Field>
            <Field label="Currency (if amount off)"><Var k="currency" placeholder="usd" /></Field>
            <Field label="Duration"><Pills k="duration" items={DURATIONS} def="once" /></Field>
            <Field label="Custom Coupon ID (optional)"><Var k="couponId" placeholder="SUMMER25" /></Field>
          </>
        )}
        {show("deleteCoupon", "createPromoCode", "listPromoCodes") && (
          <Field label="Coupon ID"><Var k="couponId" placeholder="SUMMER25" /></Field>
        )}
        {show("createPromoCode") && (
          <>
            <Field label="Code (optional)" hint="Auto-generated if blank"><Var k="code" placeholder="SAVE20" /></Field>
            <Field label="Max Redemptions (optional)"><Var k="maxRedemptions" placeholder="100" /></Field>
          </>
        )}

        {show("createPayout", "createTransfer") && (
          <>
            <Field label="Amount (in cents)"><Var k="amount" placeholder="10000" /></Field>
            <Field label="Currency"><Var k="currency" placeholder="usd" def="usd" /></Field>
          </>
        )}
        {show("createTransfer") && (
          <Field label="Destination Account"><Var k="destination" placeholder="acct_..." /></Field>
        )}
        {show("listPayouts") && <Field label="Status (optional)"><Var k="status" placeholder="paid, pending, failed" /></Field>}
        {show("listBalanceTransactions") && <Field label="Type (optional)"><Var k="type" placeholder="charge, refund, payout" /></Field>}

        {show("getDispute", "closeDispute") && <Field label="Dispute ID"><Var k="disputeId" placeholder="dp_..." /></Field>}
        {show("listDisputes") && <Field label="Charge ID (optional)"><Var k="chargeId" placeholder="ch_..." /></Field>}

        {show("attachPaymentMethod", "detachPaymentMethod") && (
          <Field label="Payment Method ID"><Var k="paymentMethodId" placeholder="pm_..." /></Field>
        )}
        {show("attachPaymentMethod", "listPaymentMethods") && (
          <Field label="Customer ID"><Var k="customerId" placeholder="cus_..." /></Field>
        )}
        {show("createSetupIntent", "listPaymentMethods") && (
          <Field label="Method Type"><Var k="type" placeholder="card" def="card" /></Field>
        )}
        {show("createSetupIntent") && (
          <Field label="Customer ID (optional)"><Var k="customerId" placeholder="cus_..." /></Field>
        )}

        {show("getEvent") && <Field label="Event ID"><Var k="eventId" placeholder="evt_..." /></Field>}
        {show("listEvents") && (
          <Field label="Event Type (optional)"><Var k="type" placeholder="charge.succeeded" /></Field>
        )}
        {show("listTransfers") && (
          <Field label="Destination (optional)"><Var k="destination" placeholder="acct_..." /></Field>
        )}

        {show(
          "createCustomer", "updateCustomer", "createPaymentIntent", "updatePaymentIntent",
          "createRefund", "createInvoice", "createProduct", "updateProduct",
          "createPrice", "updatePrice", "createSubscription", "updateSubscription",
          "createCheckoutSession", "createPaymentLink"
        ) && (
          <Field label="Description (optional)"><Var k="description" placeholder="Notes about this object" /></Field>
        )}

        {(show("listCustomers", "listPaymentIntents", "listCharges", "listRefunds", "listInvoices",
          "listProducts", "listPrices", "listSubscriptions", "listCheckoutSessions",
          "listPaymentLinks", "listCoupons", "listPromoCodes", "listPayouts",
          "listBalanceTransactions", "listDisputes", "listPaymentMethods",
          "listTransfers", "listEvents", "searchCustomers")) && (
          <Field label="Limit" hint="Max 100"><Var k="limit" placeholder="10" def="10" /></Field>
        )}

        {(show("listCustomers", "listPaymentIntents", "listCharges", "listSubscriptions",
          "listInvoices", "listCheckoutSessions", "listPaymentMethods")) && config.operation !== "listPaymentMethods" && (
          <Field label="Filter by Customer ID (optional)"><Var k="customerId" placeholder="cus_..." /></Field>
        )}
      </div>
    </div>
  );
}
