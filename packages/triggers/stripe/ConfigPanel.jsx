import { useState } from 'react';
import { CreditCard, Info, CheckCircle, Circle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '@/lib/api';

const STRIPE_EVENTS = [
  {
    group: 'Payments',
    events: [
      { value: 'payment_intent.succeeded',       label: 'Payment succeeded' },
      { value: 'payment_intent.payment_failed',  label: 'Payment failed' },
      { value: 'payment_intent.created',         label: 'Payment intent created' },
      { value: 'charge.refunded',                label: 'Charge refunded' },
      { value: 'charge.dispute.created',         label: 'Dispute opened' },
    ],
  },
  {
    group: 'Subscriptions',
    events: [
      { value: 'customer.subscription.created',  label: 'Subscription created' },
      { value: 'customer.subscription.updated',  label: 'Subscription updated' },
      { value: 'customer.subscription.deleted',  label: 'Subscription cancelled' },
      { value: 'invoice.paid',                   label: 'Invoice paid' },
      { value: 'invoice.payment_failed',         label: 'Invoice payment failed' },
      { value: 'invoice.upcoming',               label: 'Upcoming invoice' },
    ],
  },
  {
    group: 'Customers',
    events: [
      { value: 'customer.created',               label: 'Customer created' },
      { value: 'customer.updated',               label: 'Customer updated' },
      { value: 'customer.deleted',               label: 'Customer deleted' },
    ],
  },
  {
    group: 'Checkout',
    events: [
      { value: 'checkout.session.completed',     label: 'Checkout completed' },
      { value: 'checkout.session.expired',       label: 'Checkout expired' },
    ],
  },
];

export default function StripeTriggerNode({ config = {}, updateConfig, nodeId }) {
  const { id: automationId } = useParams();
  const [activeTab, setActiveTab] = useState('setup');

  const selectedEvents = config.events || ['payment_intent.succeeded'];
  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const isRegistered = config.webhookRegistered ?? false;

  const toggleEvent = (val) => {
    const updated = selectedEvents.includes(val)
      ? selectedEvents.filter((e) => e !== val)
      : [...selectedEvents, val];
    updateConfig?.('events', updated);
  };

  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <CreditCard className="w-3 h-3 text-indigo-400" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Stripe</span>
        {isRegistered && (
          <span className="ml-auto flex items-center gap-1 text-[9px] text-emerald-400 font-semibold">
            <CheckCircle className="w-3 h-3" /> Connected
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'events', 'payload'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">

        {activeTab === 'setup' && (
          <>
            {/* API key */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Stripe Secret Key</label>
              <input
                value={config.stripeKeyCredential || ''}
                onChange={(e) => updateConfig?.('stripeKeyCredential', e.target.value)}
                placeholder="sk_live_… or credential key"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">Store your secret key in Credentials. Never paste live keys here.</p>
            </div>

            {/* Webhook signing secret */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Webhook Signing Secret</label>
              <input
                value={config.stripeWebhookSecret || ''}
                onChange={(e) => updateConfig?.('stripeWebhookSecret', e.target.value)}
                placeholder="whsec_… (auto-filled after activation)"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
              <p className="text-[9px] text-zinc-600">BlinkBox retrieves this automatically after registering the webhook.</p>
            </div>

            {/* Registration status */}
            <div className={`p-2.5 rounded-lg border ${isRegistered ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#0d0d0d] border-[#1a1a1a]'}`}>
              <div className="flex items-center gap-2">
                {isRegistered
                  ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  : <Circle className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                }
                <div>
                  <span className={`text-[10px] font-bold block ${isRegistered ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {isRegistered ? 'Webhook registered on Stripe' : 'Webhook registered on activation'}
                  </span>
                  <span className="text-[9px] text-zinc-600 mt-0.5 block">
                    BlinkBox calls the Stripe API to register the webhook — no manual Stripe Dashboard setup.
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'events' && (
          <div className="flex flex-col gap-3">
            {STRIPE_EVENTS.map(({ group, events }) => (
              <div key={group} className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{group}</span>
                {events.map(({ value, label }) => {
                  const on = selectedEvents.includes(value);
                  return (
                    <button
                      key={value}
                      onClick={() => toggleEvent(value)}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border text-left transition-all ${on ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-[#0d0d0d] border-[#1a1a1a] hover:border-[#2a2a2a]'}`}
                    >
                      <div className={`w-3 h-3 rounded border shrink-0 flex items-center justify-center transition-all ${on ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600'}`}>
                        {on && <div className="w-1.5 h-1 bg-white rounded-sm" />}
                      </div>
                      <span className={`text-[10px] font-medium ${on ? 'text-zinc-200' : 'text-zinc-500'}`}>{label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'payload' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Info className="w-3 h-3 text-zinc-600" />
              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Available in workflow as</span>
            </div>
            <div className="flex flex-col gap-1 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
              {[
                ['$trigger.body.type', 'Stripe event type (e.g. "payment_intent.succeeded")'],
                ['$trigger.body.data.object', 'The Stripe object that triggered the event'],
                ['$trigger.body.data.object.id', 'Object ID (payment intent, invoice, etc.)'],
                ['$trigger.body.data.object.amount', 'Amount in cents (payment events)'],
                ['$trigger.body.data.object.currency', 'Currency code'],
                ['$trigger.body.data.object.customer', 'Customer ID'],
                ['$trigger.body.data.object.metadata', 'Your custom metadata on the object'],
                ['$trigger.body.livemode', 'true for live, false for test mode'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono text-indigo-400 shrink-0">{key}</span>
                  <span className="text-[9px] text-zinc-600">{desc}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-zinc-600 leading-relaxed mt-1">
              Stripe sends the full event object. All fields under <span className="font-mono text-zinc-500">data.object</span> vary by event type — check the Stripe docs.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
