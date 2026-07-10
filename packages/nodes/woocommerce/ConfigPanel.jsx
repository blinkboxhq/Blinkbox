import imgWoo from './logo.svg';
import {
  ShoppingCart, List, RefreshCw, Package, Pencil, User, Ticket,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'getOrder',      label: 'Get Order',           icon: ShoppingCart },
  { value: 'listOrders',    label: 'List Orders',         icon: List },
  { value: 'updateOrder',   label: 'Update Order Status', icon: RefreshCw },
  { value: 'createProduct', label: 'Create Product',      icon: Package },
  { value: 'updateProduct', label: 'Update Product',      icon: Pencil },
  { value: 'getProduct',    label: 'Get Product',         icon: Package },
  { value: 'listProducts',  label: 'List Products',       icon: List },
  { value: 'getCustomer',   label: 'Get Customer',        icon: User },
  { value: 'createCoupon',  label: 'Create Coupon',       icon: Ticket },
];

const ORDER_STATUSES = ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed'];

function Field({ label, optional, children }) {
  return (
    <div className="flex flex-col">
      {label && (
        <ConfigLabel>
          {label}{optional && <span className="text-neutral-700 normal-case tracking-normal"> (optional)</span>}
        </ConfigLabel>
      )}
      {children}
    </div>
  );
}

export default function WooCommerceNode({ config = {}, updateConfig, nodeId }) {
  const op = config.operation || 'listOrders';
  const currentOp = OPERATIONS.find((o) => o.value === op);

  const text = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional}>
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
      <ConfigHeader logoUrl={imgWoo} title="WooCommerce" subtitle={currentOp?.label || 'Orders, products, customers, coupons'} />

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={(val) => updateConfig('operation', val)}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {text('Store URL', 'storeUrl', { placeholder: 'https://mystore.com' })}

      {['getOrder', 'updateOrder'].includes(op) && text('Order ID', 'orderId', { placeholder: '{{ $json.id }}' })}

      {op === 'updateOrder' && (
        <ConfigPills
          label="New Status"
          value={config.status}
          onChange={(val) => updateConfig('status', val)}
          options={ORDER_STATUSES}
          accentColor={ACCENT}
        />
      )}

      {op === 'listOrders' && (
        <>
          <ConfigPills
            label="Status Filter"
            value={config.statusFilter || 'any'}
            onChange={(val) => updateConfig('statusFilter', val)}
            options={['any', ...ORDER_STATUSES]}
            accentColor={ACCENT}
          />
          {text('Limit', 'limit', { placeholder: '20', def: '20' })}
        </>
      )}

      {(op === 'createProduct' || op === 'updateProduct') && (
        <>
          {op === 'updateProduct' && text('Product ID', 'productId', { placeholder: '{{ $json.id }}' })}
          {text('Product Name', 'name', { placeholder: '{{ $json.name }}' })}
          {text('Regular Price', 'regularPrice', { placeholder: '49.99' })}
          {text('Description', 'description', { placeholder: 'Product description...', multiline: true })}
          {text('Stock Quantity', 'stockQuantity', { placeholder: '100' })}
        </>
      )}

      {op === 'createCoupon' && (
        <>
          {text('Coupon Code', 'code', { placeholder: 'SUMMER20' })}
          <ConfigPills
            label="Discount Type"
            value={config.discountType || 'percent'}
            onChange={(val) => updateConfig('discountType', val)}
            options={[
              { value: 'percent', label: '%' },
              { value: 'fixed_cart', label: 'Cart $' },
              { value: 'fixed_product', label: 'Product $' },
            ]}
            accentColor={ACCENT}
          />
          {text('Amount', 'amount', { placeholder: '20' })}
          {text('Expiry Date (YYYY-MM-DD)', 'dateExpires', { placeholder: '2024-12-31' })}
        </>
      )}

      <CredentialPicker
        value={config.credentialId || ''}
        onChange={(id) => updateConfig('credentialId', id)}
        accentColor="violet"
        label="WooCommerce API Key + Secret"
        placeholder="Select WooCommerce credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300">id, status, total, line_items, customer</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
