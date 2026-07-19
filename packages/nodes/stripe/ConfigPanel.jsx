import { useEffect } from 'react';
import imgStripe from './logo.svg';
import {
  Users, User, UserCog, UserMinus, List, Search,
  CreditCard, FileText, Pencil, CheckCircle2, Camera, XCircle,
  Receipt, RefreshCw, Undo2, FileCheck, Send, Ban, Plus,
  Package, Tag, Trash2, DollarSign, Repeat,
  ShoppingCart, Link2, Ticket, Percent, Banknote, Scale,
  Wallet, ArrowLeftRight, Zap, ShieldAlert,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'createCustomer', label: 'Create Customer', icon: Users, group: 'Customers' },
  { value: 'getCustomer', label: 'Get Customer', icon: User, group: 'Customers' },
  { value: 'updateCustomer', label: 'Update Customer', icon: UserCog, group: 'Customers' },
  { value: 'deleteCustomer', label: 'Delete Customer', icon: UserMinus, group: 'Customers' },
  { value: 'listCustomers', label: 'List Customers', icon: List, group: 'Customers' },
  { value: 'searchCustomers', label: 'Search Customers', icon: Search, group: 'Customers' },

  { value: 'createPaymentIntent', label: 'Create Intent', icon: CreditCard, group: 'Payment Intents' },
  { value: 'getPaymentIntent', label: 'Get Intent', icon: FileText, group: 'Payment Intents' },
  { value: 'updatePaymentIntent', label: 'Update Intent', icon: Pencil, group: 'Payment Intents' },
  { value: 'confirmPaymentIntent', label: 'Confirm Intent', icon: CheckCircle2, group: 'Payment Intents' },
  { value: 'capturePaymentIntent', label: 'Capture Intent', icon: Camera, group: 'Payment Intents' },
  { value: 'cancelPaymentIntent', label: 'Cancel Intent', icon: XCircle, group: 'Payment Intents' },
  { value: 'listPaymentIntents', label: 'List Intents', icon: List, group: 'Payment Intents' },

  { value: 'getCharge', label: 'Get Charge', icon: Receipt, group: 'Charges & Refunds' },
  { value: 'listCharges', label: 'List Charges', icon: List, group: 'Charges & Refunds' },
  { value: 'captureCharge', label: 'Capture Charge', icon: Camera, group: 'Charges & Refunds' },
  { value: 'createRefund', label: 'Create Refund', icon: Undo2, group: 'Charges & Refunds' },
  { value: 'getRefund', label: 'Get Refund', icon: FileText, group: 'Charges & Refunds' },
  { value: 'listRefunds', label: 'List Refunds', icon: RefreshCw, group: 'Charges & Refunds' },

  { value: 'createInvoice', label: 'Create Invoice', icon: FileText, group: 'Invoices' },
  { value: 'getInvoice', label: 'Get Invoice', icon: FileText, group: 'Invoices' },
  { value: 'finalizeInvoice', label: 'Finalize', icon: FileCheck, group: 'Invoices' },
  { value: 'payInvoice', label: 'Pay Invoice', icon: CheckCircle2, group: 'Invoices' },
  { value: 'sendInvoice', label: 'Send Invoice', icon: Send, group: 'Invoices' },
  { value: 'voidInvoice', label: 'Void Invoice', icon: Ban, group: 'Invoices' },
  { value: 'listInvoices', label: 'List Invoices', icon: List, group: 'Invoices' },
  { value: 'createInvoiceItem', label: 'Add Line Item', icon: Plus, group: 'Invoices' },

  { value: 'createProduct', label: 'Create Product', icon: Package, group: 'Products & Prices' },
  { value: 'getProduct', label: 'Get Product', icon: Package, group: 'Products & Prices' },
  { value: 'updateProduct', label: 'Update Product', icon: Pencil, group: 'Products & Prices' },
  { value: 'deleteProduct', label: 'Delete Product', icon: Trash2, group: 'Products & Prices' },
  { value: 'listProducts', label: 'List Products', icon: List, group: 'Products & Prices' },
  { value: 'createPrice', label: 'Create Price', icon: Tag, group: 'Products & Prices' },
  { value: 'getPrice', label: 'Get Price', icon: DollarSign, group: 'Products & Prices' },
  { value: 'updatePrice', label: 'Update Price', icon: Pencil, group: 'Products & Prices' },
  { value: 'listPrices', label: 'List Prices', icon: List, group: 'Products & Prices' },

  { value: 'createSubscription', label: 'Create Sub', icon: Repeat, group: 'Subscriptions' },
  { value: 'getSubscription', label: 'Get Sub', icon: FileText, group: 'Subscriptions' },
  { value: 'updateSubscription', label: 'Update Sub', icon: Pencil, group: 'Subscriptions' },
  { value: 'cancelSubscription', label: 'Cancel Sub', icon: XCircle, group: 'Subscriptions' },
  { value: 'listSubscriptions', label: 'List Subs', icon: List, group: 'Subscriptions' },

  { value: 'createCheckoutSession', label: 'Create Checkout', icon: ShoppingCart, group: 'Checkout & Links' },
  { value: 'getCheckoutSession', label: 'Get Checkout', icon: FileText, group: 'Checkout & Links' },
  { value: 'listCheckoutSessions', label: 'List Checkouts', icon: List, group: 'Checkout & Links' },
  { value: 'expireCheckoutSession', label: 'Expire Checkout', icon: XCircle, group: 'Checkout & Links' },
  { value: 'createPaymentLink', label: 'Create Link', icon: Link2, group: 'Checkout & Links' },
  { value: 'listPaymentLinks', label: 'List Links', icon: List, group: 'Checkout & Links' },

  { value: 'createCoupon', label: 'Create Coupon', icon: Ticket, group: 'Coupons & Promos' },
  { value: 'listCoupons', label: 'List Coupons', icon: List, group: 'Coupons & Promos' },
  { value: 'deleteCoupon', label: 'Delete Coupon', icon: Trash2, group: 'Coupons & Promos' },
  { value: 'createPromoCode', label: 'Create Promo', icon: Percent, group: 'Coupons & Promos' },
  { value: 'listPromoCodes', label: 'List Promos', icon: List, group: 'Coupons & Promos' },

  { value: 'createPayout', label: 'Create Payout', icon: Banknote, group: 'Payouts & Balance' },
  { value: 'listPayouts', label: 'List Payouts', icon: List, group: 'Payouts & Balance' },
  { value: 'getBalance', label: 'Get Balance', icon: Wallet, group: 'Payouts & Balance' },
  { value: 'listBalanceTransactions', label: 'Balance Txns', icon: List, group: 'Payouts & Balance' },
  { value: 'createTransfer', label: 'Create Transfer', icon: ArrowLeftRight, group: 'Payouts & Balance' },
  { value: 'listTransfers', label: 'List Transfers', icon: List, group: 'Payouts & Balance' },

  { value: 'listDisputes', label: 'List Disputes', icon: Scale, group: 'Disputes, Methods & Events' },
  { value: 'getDispute', label: 'Get Dispute', icon: ShieldAlert, group: 'Disputes, Methods & Events' },
  { value: 'closeDispute', label: 'Close Dispute', icon: Ban, group: 'Disputes, Methods & Events' },
  { value: 'attachPaymentMethod', label: 'Attach Method', icon: CreditCard, group: 'Disputes, Methods & Events' },
  { value: 'detachPaymentMethod', label: 'Detach Method', icon: CreditCard, group: 'Disputes, Methods & Events' },
  { value: 'listPaymentMethods', label: 'List Methods', icon: List, group: 'Disputes, Methods & Events' },
  { value: 'createSetupIntent', label: 'Setup Intent', icon: Zap, group: 'Disputes, Methods & Events' },
  { value: 'listEvents', label: 'List Events', icon: List, group: 'Disputes, Methods & Events' },
  { value: 'getEvent', label: 'Get Event', icon: FileText, group: 'Disputes, Methods & Events' },
];

const DURATIONS = [
  { value: 'once', label: 'Once' },
  { value: 'repeating', label: 'Repeating' },
  { value: 'forever', label: 'Forever' },
];
const INTERVALS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];
const MODES = [
  { value: 'payment', label: 'Payment' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'setup', label: 'Setup' },
];

function Field({ label, optional, hint, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <ConfigLabel>
          {label}{optional && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}
        </ConfigLabel>
      )}
      {children}
      {hint && <p className="text-[9px] text-neutral-600 mt-1.5 font-mono tracking-wide leading-relaxed">{hint}</p>}
    </div>
  );
}

export default function StripeNode({ config = {}, updateConfig, nodeId }) {
  const LABEL_TO_OP = Object.fromEntries(OPERATIONS.map((o) => [o.label, o.value]));
  const op = LABEL_TO_OP[config.selectedAction] || config.operation || 'createCustomer';

  useEffect(() => {
    if (op && op !== config.operation) updateConfig('operation', op);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op]);
  const currentOp = OPERATIONS.find((o) => o.value === op);
  const show = (...ops) => ops.includes(op);

  const text = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional} hint={opts.hint}>
      <SmartVariableInput
        value={config[key] ?? opts.def ?? ''}
        onChange={(val) => updateConfig(key, val)}
        placeholder={opts.placeholder || ''}
        multiline={opts.multiline}
        nodeId={nodeId}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">

      <CredentialPicker
        provider="stripe"
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor={ACCENT}
        label="Stripe Secret Key"
        placeholder="Connect your Stripe account"
      />


      {show('getCustomer', 'updateCustomer', 'deleteCustomer') && text('Customer ID', 'customerId', { placeholder: 'cus_...' })}
      {show('createCustomer', 'updateCustomer') && (
        <>
          {text('Email', 'email', { placeholder: 'customer@example.com' })}
          {text('Name', 'name', { placeholder: 'Jane Doe' })}
          {text('Phone', 'phone', { placeholder: '+1 555 555 5555' })}
        </>
      )}
      {show('searchCustomers') && text('Search Query', 'query', { placeholder: "email:'jane@example.com'", hint: "e.g. email:'jane@example.com' AND metadata['plan']:'pro'" })}

      {show('getPaymentIntent', 'updatePaymentIntent', 'confirmPaymentIntent', 'capturePaymentIntent', 'cancelPaymentIntent') && text('Payment Intent ID', 'paymentIntentId', { placeholder: 'pi_...' })}
      {show('createPaymentIntent') && (
        <>
          {text('Amount (in cents)', 'amount', { placeholder: '1999', hint: 'e.g. 1999 = $19.99' })}
          {text('Currency', 'currency', { placeholder: 'usd', def: 'usd' })}
          {text('Customer ID', 'customerId', { optional: true, placeholder: 'cus_...' })}
          {text('Payment Method', 'paymentMethodId', { optional: true, placeholder: 'pm_...' })}
        </>
      )}
      {show('cancelPaymentIntent') && text('Cancellation Reason', 'reason', { optional: true, placeholder: 'requested_by_customer' })}

      {show('getCharge', 'captureCharge') && text('Charge ID', 'chargeId', { placeholder: 'ch_...' })}
      {show('createRefund') && (
        <>
          {text('Charge ID', 'chargeId', { placeholder: 'ch_... (or use intent below)' })}
          {text('Payment Intent ID', 'paymentIntentId', { placeholder: 'pi_...' })}
          {text('Amount in cents', 'amount', { optional: true, placeholder: '500', hint: 'Leave blank for full refund' })}
          {text('Reason', 'reason', { optional: true, placeholder: 'requested_by_customer' })}
        </>
      )}
      {show('getRefund') && text('Refund ID', 'refundId', { placeholder: 're_...' })}

      {show('getInvoice', 'finalizeInvoice', 'payInvoice', 'sendInvoice', 'voidInvoice') && text('Invoice ID', 'invoiceId', { placeholder: 'in_...' })}
      {show('createInvoice', 'createInvoiceItem') && text('Customer ID', 'customerId', { placeholder: 'cus_...' })}
      {show('createInvoiceItem') && (
        <>
          {text('Amount (in cents)', 'amount', { placeholder: '2500' })}
          {text('Currency', 'currency', { placeholder: 'usd', def: 'usd' })}
          {text('Invoice ID', 'invoiceId', { optional: true, placeholder: 'in_...' })}
        </>
      )}
      {show('listInvoices') && text('Status', 'status', { optional: true, placeholder: 'open, paid, draft, void' })}

      {show('getProduct', 'updateProduct', 'deleteProduct', 'createPrice', 'listPrices') && text('Product ID', 'productId', { placeholder: 'prod_...' })}
      {show('createProduct', 'updateProduct') && text('Product Name', 'name', { placeholder: 'Premium Plan' })}
      {show('getPrice', 'updatePrice') && text('Price ID', 'priceId', { placeholder: 'price_...' })}
      {show('createPrice') && (
        <>
          {text('Unit Amount (in cents)', 'unitAmount', { placeholder: '1999' })}
          {text('Currency', 'currency', { placeholder: 'usd', def: 'usd' })}
          <Field label="Recurring Interval" optional hint="Leave blank for one-time price">
            <ConfigPills value={config.interval} onChange={(val) => updateConfig('interval', val)} options={INTERVALS} accentColor={ACCENT} />
          </Field>
        </>
      )}

      {show('getSubscription', 'updateSubscription', 'cancelSubscription') && text('Subscription ID', 'subscriptionId', { placeholder: 'sub_...' })}
      {show('createSubscription') && (
        <>
          {text('Customer ID', 'customerId', { placeholder: 'cus_...' })}
          {text('Price ID', 'priceId', { placeholder: 'price_...' })}
          {text('Quantity', 'quantity', { placeholder: '1', def: '1' })}
          {text('Trial Days', 'trialDays', { optional: true, placeholder: '14' })}
        </>
      )}

      {show('getCheckoutSession', 'expireCheckoutSession') && text('Session ID', 'sessionId', { placeholder: 'cs_...' })}
      {show('createCheckoutSession') && (
        <>
          <Field label="Mode">
            <ConfigPills value={config.mode ?? 'payment'} onChange={(val) => updateConfig('mode', val)} options={MODES} accentColor={ACCENT} />
          </Field>
          {text('Price ID', 'priceId', { placeholder: 'price_...' })}
          {text('Quantity', 'quantity', { placeholder: '1', def: '1' })}
          {text('Success URL', 'successUrl', { placeholder: 'https://yoursite.com/success' })}
          {text('Cancel URL', 'cancelUrl', { placeholder: 'https://yoursite.com/cancel' })}
          {text('Customer Email', 'email', { optional: true, placeholder: 'customer@example.com' })}
        </>
      )}
      {show('createPaymentLink') && (
        <>
          {text('Price ID', 'priceId', { placeholder: 'price_...' })}
          {text('Quantity', 'quantity', { placeholder: '1', def: '1' })}
        </>
      )}

      {show('createCoupon') && (
        <>
          {text('Percent Off', 'percentOff', { optional: true, placeholder: '25', hint: 'e.g. 25 for 25%' })}
          {text('Amount Off in cents', 'amountOff', { optional: true, placeholder: '500' })}
          {text('Currency (if amount off)', 'currency', { placeholder: 'usd' })}
          <Field label="Duration">
            <ConfigPills value={config.duration ?? 'once'} onChange={(val) => updateConfig('duration', val)} options={DURATIONS} accentColor={ACCENT} />
          </Field>
          {text('Custom Coupon ID', 'couponId', { optional: true, placeholder: 'SUMMER25' })}
        </>
      )}
      {show('deleteCoupon', 'createPromoCode', 'listPromoCodes') && text('Coupon ID', 'couponId', { placeholder: 'SUMMER25' })}
      {show('createPromoCode') && (
        <>
          {text('Code', 'code', { optional: true, placeholder: 'SAVE20', hint: 'Auto-generated if blank' })}
          {text('Max Redemptions', 'maxRedemptions', { optional: true, placeholder: '100' })}
        </>
      )}

      {show('createPayout', 'createTransfer') && (
        <>
          {text('Amount (in cents)', 'amount', { placeholder: '10000' })}
          {text('Currency', 'currency', { placeholder: 'usd', def: 'usd' })}
        </>
      )}
      {show('createTransfer') && text('Destination Account', 'destination', { placeholder: 'acct_...' })}
      {show('listPayouts') && text('Status', 'status', { optional: true, placeholder: 'paid, pending, failed' })}
      {show('listBalanceTransactions') && text('Type', 'type', { optional: true, placeholder: 'charge, refund, payout' })}

      {show('getDispute', 'closeDispute') && text('Dispute ID', 'disputeId', { placeholder: 'dp_...' })}
      {show('listDisputes') && text('Charge ID', 'chargeId', { optional: true, placeholder: 'ch_...' })}

      {show('attachPaymentMethod', 'detachPaymentMethod') && text('Payment Method ID', 'paymentMethodId', { placeholder: 'pm_...' })}
      {show('attachPaymentMethod', 'listPaymentMethods') && text('Customer ID', 'customerId', { placeholder: 'cus_...' })}
      {show('createSetupIntent', 'listPaymentMethods') && text('Method Type', 'type', { placeholder: 'card', def: 'card' })}
      {show('createSetupIntent') && text('Customer ID', 'customerId', { optional: true, placeholder: 'cus_...' })}

      {show('getEvent') && text('Event ID', 'eventId', { placeholder: 'evt_...' })}
      {show('listEvents') && text('Event Type', 'type', { optional: true, placeholder: 'charge.succeeded' })}
      {show('listTransfers') && text('Destination', 'destination', { optional: true, placeholder: 'acct_...' })}

      {show(
        'createCustomer', 'updateCustomer', 'createPaymentIntent', 'updatePaymentIntent',
        'createRefund', 'createInvoice', 'createProduct', 'updateProduct',
        'createPrice', 'updatePrice', 'createSubscription', 'updateSubscription',
        'createCheckoutSession', 'createPaymentLink'
      ) && text('Description', 'description', { optional: true, placeholder: 'Notes about this object' })}

      {show(
        'listCustomers', 'listPaymentIntents', 'listCharges', 'listRefunds', 'listInvoices',
        'listProducts', 'listPrices', 'listSubscriptions', 'listCheckoutSessions',
        'listPaymentLinks', 'listCoupons', 'listPromoCodes', 'listPayouts',
        'listBalanceTransactions', 'listDisputes', 'listPaymentMethods',
        'listTransfers', 'listEvents', 'searchCustomers'
      ) && text('Limit', 'limit', { placeholder: '10', def: '10', hint: 'Max 100' })}

      {show(
        'listCustomers', 'listPaymentIntents', 'listCharges', 'listSubscriptions',
        'listInvoices', 'listCheckoutSessions', 'listPaymentMethods'
      ) && config.operation !== 'listPaymentMethods' &&
        text('Filter by Customer ID', 'customerId', { optional: true, placeholder: 'cus_...' })}
    </ConfigSection>
  );
}
