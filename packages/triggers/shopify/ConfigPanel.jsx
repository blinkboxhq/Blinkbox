import { useState } from 'react';
import { Copy, Check, Info } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../../../../lib/api';
import CredentialPicker from '@/components/ui/CredentialPicker';

const SHOPIFY_TOPICS = [
  { group: 'Orders',
    events: [
      { value: 'orders/create',  label: 'Order Created' },
      { value: 'orders/paid',    label: 'Order Paid' },
      { value: 'orders/updated', label: 'Order Updated' },
      { value: 'orders/cancelled', label: 'Order Cancelled' },
      { value: 'orders/fulfilled', label: 'Order Fulfilled' },
      { value: 'refunds/create', label: 'Refund Created' },
    ],
  },
  { group: 'Customers',
    events: [
      { value: 'customers/create', label: 'Customer Created' },
      { value: 'customers/update', label: 'Customer Updated' },
    ],
  },
  { group: 'Products',
    events: [
      { value: 'products/create', label: 'Product Created' },
      { value: 'products/update', label: 'Product Updated' },
      { value: 'inventory_levels/update', label: 'Inventory Updated' },
    ],
  },
  { group: 'Checkout',
    events: [
      { value: 'checkouts/create', label: 'Checkout Started' },
      { value: 'checkouts/update', label: 'Checkout Updated' },
    ],
  },
];

export default function ShopifyTriggerNode({ config = {}, updateConfig, nodeId }) {
  const { id: automationId } = useParams();
  const [activeTab, setActiveTab] = useState('setup');
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${API_URL}/webhook/${automationId}`;
  const selectedTopics = config.topics || ['orders/create'];

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const toggleTopic = (val) => {
    const updated = selectedTopics.includes(val)
      ? selectedTopics.filter((t) => t !== val)
      : [...selectedTopics, val];
    updateConfig?.('topics', updated.length ? updated : ['orders/create']);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2A] bg-[#111111] rounded-t-xl">
        <div className="p-1 bg-[#222] rounded-md border border-[#333]">
          <span className="text-[10px] font-black text-[#95BF47]">S</span>
        </div>
        <span className="text-[11px] font-semibold text-zinc-200 tracking-wide">Shopify</span>
        <span className="ml-auto text-[9px] font-bold text-[#95BF47] bg-[#95BF47]/10 border border-[#95BF47]/20 px-1.5 py-0.5 rounded">TRIGGER</span>
      </div>

      <div className="flex bg-[#0a0a0a] px-3 pt-2 gap-3 border-b border-[#1a1a1a]">
        {['setup', 'events', 'payload'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-2 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-[#95BF47] text-[#95BF47]' : 'border-transparent text-zinc-600 hover:text-zinc-400'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-3 flex flex-col gap-3">
        {activeTab === 'setup' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Webhook URL</label>
              <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded-lg px-2.5 py-2">
                <span className="flex-1 text-[10px] text-zinc-400 font-mono truncate select-all">{webhookUrl}</span>
                <button onClick={() => copy(webhookUrl)} className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0">
                  {copied ? <Check className="w-3 h-3 text-[#95BF47]" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <p className="text-[9px] text-zinc-600">Paste into Shopify Admin → Settings → Notifications → Webhooks.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Shop Domain</label>
              <input value={config.shop || ''}
                onChange={(e) => updateConfig?.('shop', e.target.value)}
                placeholder="mystore.myshopify.com"
                className="w-full bg-[#111] border border-[#222] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-[#95BF47]/50 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <CredentialPicker
                label="Webhook Secret"
                value={config.shopifyWebhookSecret || ''}
                onChange={(v) => updateConfig?.('shopifyWebhookSecret', v)}
                placeholder="Select webhook secret credential…"
              />
              <p className="text-[9px] text-zinc-600">BlinkBox verifies <span className="font-mono text-zinc-500">X-Shopify-Hmac-Sha256</span> (base64 SHA-256 HMAC).</p>
            </div>
          </>
        )}

        {activeTab === 'events' && (
          <div className="flex flex-col gap-3">
            {SHOPIFY_TOPICS.map(({ group, events }) => (
              <div key={group} className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{group}</span>
                {events.map(({ value, label }) => {
                  const on = selectedTopics.includes(value);
                  return (
                    <button key={value} onClick={() => toggleTopic(value)}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border text-left transition-all ${on ? 'bg-[#95BF47]/10 border-[#95BF47]/30' : 'bg-[#0d0d0d] border-[#1a1a1a] hover:border-[#2a2a2a]'}`}>
                      <div className={`w-3 h-3 rounded border shrink-0 flex items-center justify-center transition-all ${on ? 'bg-[#95BF47] border-[#95BF47]' : 'border-zinc-600'}`}>
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
                ['$trigger.body.id', 'Order/customer/product ID'],
                ['$trigger.body.email', 'Customer email address'],
                ['$trigger.body.total_price', 'Order total (string, e.g. "49.99")'],
                ['$trigger.body.financial_status', 'Payment status (paid, pending, etc.)'],
                ['$trigger.body.line_items', 'Array of ordered items'],
                ['$trigger.body.customer.id', 'Shopify customer ID'],
                ['$trigger.body.shipping_address', 'Shipping address object'],
                ['$trigger.headers[\'x-shopify-topic\']', 'Webhook topic (e.g. orders/create)'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-baseline gap-2">
                  <span className="text-[10px] font-mono text-[#95BF47] shrink-0">{key}</span>
                  <span className="text-[9px] text-zinc-600">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
