import imgShopify from './logo.svg';
import {
  Package, Boxes, Tag, Layers, Warehouse, MapPin, ShoppingCart, Truck,
  RefreshCcw, Receipt, Users, User, FileText, Percent, Ticket, Hash,
  Webhook, Store, Search, Plus, Pencil, Trash2, List,
} from 'lucide-react';
import SmartVariableInput from '@/components/ui/SmartVariableInput';
import CredentialPicker from '@/components/ui/CredentialPicker';
import {
  ConfigSection, ConfigLabel, ConfigHeader, ConfigSelect, ConfigPills, ConfigToggleRow, ConfigBanner,
} from '@/components/ui/ConfigKit';

const ACCENT = '#4d7cff';

const OPERATIONS = [
  { value: 'listProducts', label: 'List Products', icon: List },
  { value: 'getProduct', label: 'Get Product', icon: Package },
  { value: 'createProduct', label: 'Create Product', icon: Plus },
  { value: 'updateProduct', label: 'Update Product', icon: Pencil },
  { value: 'deleteProduct', label: 'Delete Product', icon: Trash2 },
  { value: 'countProducts', label: 'Count Products', icon: Hash },
  { value: 'listVariants', label: 'List Variants', icon: Boxes },
  { value: 'createVariant', label: 'Create Variant', icon: Plus },
  { value: 'updateVariant', label: 'Update Variant', icon: Pencil },
  { value: 'deleteVariant', label: 'Delete Variant', icon: Trash2 },
  { value: 'listCustomCollections', label: 'Custom Collections', icon: Layers },
  { value: 'listSmartCollections', label: 'Smart Collections', icon: Layers },
  { value: 'createCollection', label: 'Create Collection', icon: Plus },
  { value: 'addProductToCollection', label: 'Add To Collection', icon: Tag },
  { value: 'getInventoryLevels', label: 'Inventory Levels', icon: Warehouse },
  { value: 'setInventoryLevel', label: 'Set Inventory', icon: Warehouse },
  { value: 'adjustInventoryLevel', label: 'Adjust Inventory', icon: Warehouse },
  { value: 'listLocations', label: 'List Locations', icon: MapPin },
  { value: 'listOrders', label: 'List Orders', icon: List },
  { value: 'getOrder', label: 'Get Order', icon: ShoppingCart },
  { value: 'createOrder', label: 'Create Order', icon: Plus },
  { value: 'updateOrder', label: 'Update Order', icon: Pencil },
  { value: 'cancelOrder', label: 'Cancel Order', icon: Trash2 },
  { value: 'closeOrder', label: 'Close Order', icon: Receipt },
  { value: 'countOrders', label: 'Count Orders', icon: Hash },
  { value: 'listFulfillments', label: 'List Fulfillments', icon: Truck },
  { value: 'createFulfillment', label: 'Create Fulfillment', icon: Truck },
  { value: 'listTransactions', label: 'List Transactions', icon: Receipt },
  { value: 'createRefund', label: 'Create Refund', icon: RefreshCcw },
  { value: 'listCustomers', label: 'List Customers', icon: Users },
  { value: 'getCustomer', label: 'Get Customer', icon: User },
  { value: 'createCustomer', label: 'Create Customer', icon: Plus },
  { value: 'updateCustomer', label: 'Update Customer', icon: Pencil },
  { value: 'deleteCustomer', label: 'Delete Customer', icon: Trash2 },
  { value: 'searchCustomers', label: 'Search Customers', icon: Search },
  { value: 'listDraftOrders', label: 'List Draft Orders', icon: FileText },
  { value: 'createDraftOrder', label: 'Create Draft Order', icon: Plus },
  { value: 'completeDraftOrder', label: 'Complete Draft', icon: Receipt },
  { value: 'listPriceRules', label: 'List Price Rules', icon: Percent },
  { value: 'createPriceRule', label: 'Create Price Rule', icon: Percent },
  { value: 'createDiscountCode', label: 'Create Discount', icon: Ticket },
  { value: 'listMetafields', label: 'List Metafields', icon: Hash },
  { value: 'createMetafield', label: 'Create Metafield', icon: Plus },
  { value: 'listWebhooks', label: 'List Webhooks', icon: Webhook },
  { value: 'createWebhook', label: 'Create Webhook', icon: Webhook },
  { value: 'deleteWebhook', label: 'Delete Webhook', icon: Trash2 },
  { value: 'getShop', label: 'Get Shop Info', icon: Store },
];

const LIST_OPS = [
  'listProducts', 'listVariants', 'listCustomCollections', 'listSmartCollections',
  'listOrders', 'listCustomers', 'listDraftOrders', 'listPriceRules', 'listMetafields',
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
      {hint && <p className="text-[10px] text-neutral-600 mt-1.5">{hint}</p>}
    </div>
  );
}

export default function ShopifyNode({ config = {}, updateConfig }) {
  const op = config.operation || 'listOrders';
  const currentOp = OPERATIONS.find((o) => o.value === op);
  const set = (k) => (v) => updateConfig(k, v);
  const show = (...ops) => ops.includes(op);

  const text = (label, key, opts = {}) => (
    <Field label={label} optional={opts.optional} hint={opts.hint}>
      <SmartVariableInput
        value={config[key] ?? opts.def ?? ''}
        onChange={set(key)}
        placeholder={opts.placeholder || ''}
        multiline={opts.multiline}
      />
    </Field>
  );

  return (
    <ConfigSection className="gap-5">
      <ConfigHeader logoUrl={imgShopify} title="Shopify" subtitle={currentOp?.label || 'Products, orders, inventory, customers & more'} />

      {text('Shop Domain', 'shop', { placeholder: 'mystore.myshopify.com', hint: "Your store's myshopify.com domain" })}

      <ConfigSelect
        label="Operation"
        value={op}
        onChange={set('operation')}
        options={OPERATIONS}
        accentColor={ACCENT}
      />

      {show('getProduct', 'updateProduct', 'deleteProduct', 'listVariants', 'createVariant', 'addProductToCollection', 'listMetafields', 'createMetafield') &&
        text('Product ID', 'productId', { placeholder: '{{n1.id}}' })}

      {show('createProduct', 'updateProduct') && (
        <>
          {text('Title', 'title', { placeholder: 'Premium Widget' })}
          {text('Description (HTML)', 'description', { placeholder: '<p>Best widget ever</p>', multiline: true })}
          <div className="grid grid-cols-2 gap-2">
            {text('Vendor', 'vendor', { placeholder: 'Acme' })}
            {text('Product Type', 'productType', { placeholder: 'Widgets' })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {text('Price', 'price', { placeholder: '29.99' })}
            {text('Tags (comma-sep)', 'tags', { placeholder: 'sale, featured' })}
          </div>
          <ConfigPills
            label="Status"
            value={config.status ?? 'draft'}
            onChange={set('status')}
            options={[{ value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }, { value: 'archived', label: 'Archived' }]}
            accentColor={ACCENT}
          />
        </>
      )}

      {show('updateVariant', 'deleteVariant') && text('Variant ID', 'variantId', { placeholder: '{{n1.variantId}}' })}

      {show('createVariant', 'updateVariant') && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {text('Option / Title', 'option', { placeholder: 'Large / Blue' })}
            {text('Price', 'price', { placeholder: '29.99' })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {text('SKU', 'sku', { placeholder: 'WIDGET-L-BLU' })}
            {text('Barcode', 'barcode', { placeholder: '0123456789012' })}
          </div>
        </>
      )}

      {show('createCollection') && text('Collection Title', 'title', { placeholder: 'Summer Sale' })}
      {show('addProductToCollection') && text('Collection ID', 'collectionId', { placeholder: '{{n1.collectionId}}' })}

      {show('getInventoryLevels', 'setInventoryLevel', 'adjustInventoryLevel') && (
        <>
          {show('getInventoryLevels') && text('Inventory Item IDs (comma-sep)', 'inventoryItemIds', { placeholder: '123, 456' })}
          {show('setInventoryLevel', 'adjustInventoryLevel') && text('Inventory Item ID', 'inventoryItemId', { placeholder: '{{n1.inventory_item_id}}' })}
          {text('Location ID', 'locationId', { placeholder: '{{n1.location_id}}' })}
          {show('setInventoryLevel') && text('Available Quantity', 'available', { placeholder: '100' })}
          {show('adjustInventoryLevel') && text('Adjustment (+/-)', 'adjustment', { placeholder: '-5' })}
        </>
      )}

      {show('getOrder', 'updateOrder', 'cancelOrder', 'closeOrder', 'listFulfillments', 'createFulfillment', 'listTransactions', 'createRefund') &&
        text('Order ID', 'orderId', { placeholder: '{{n1.id}}' })}

      {show('listOrders') && (
        <>
          <ConfigPills
            label="Status Filter"
            value={config.status ?? 'any'}
            onChange={set('status')}
            options={[{ value: 'any', label: 'Any' }, { value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]}
            accentColor={ACCENT}
          />
          <div className="grid grid-cols-2 gap-2">
            {text('Financial Status', 'financialStatus', { placeholder: 'paid' })}
            {text('Fulfillment Status', 'fulfillmentStatus', { placeholder: 'unfulfilled' })}
          </div>
        </>
      )}

      {show('createOrder', 'createDraftOrder') && (
        <>
          {text('Line Items (JSON array)', 'lineItems', { placeholder: '[{"variant_id":123,"quantity":1}]', multiline: true, hint: '[{"variant_id":123,"quantity":1}]' })}
          {text('Customer Email', 'email', { placeholder: '{{n1.email}}' })}
          {text('Note', 'note', { placeholder: 'Gift wrap requested' })}
        </>
      )}

      {show('cancelOrder') && (
        <ConfigPills
          label="Cancel Reason"
          value={config.reason ?? 'other'}
          onChange={set('reason')}
          options={['customer', 'inventory', 'fraud', 'declined', 'other']}
          accentColor={ACCENT}
        />
      )}

      {show('createFulfillment') && (
        <>
          {text('Fulfillment Order ID', 'fulfillmentOrderId', { placeholder: '{{n1.fulfillment_order_id}}' })}
          <div className="grid grid-cols-2 gap-2">
            {text('Tracking Number', 'trackingNumber', { placeholder: '1Z999AA1...' })}
            {text('Tracking Company', 'trackingCompany', { placeholder: 'UPS' })}
          </div>
          {text('Tracking URL', 'trackingUrl', { placeholder: 'https://track...' })}
          <ConfigToggleRow label="Notify customer" on={!!config.notifyCustomer} onChange={set('notifyCustomer')} accentColor={ACCENT} />
        </>
      )}

      {show('createRefund') && (
        <>
          {text('Amount', 'amount', { placeholder: '19.99' })}
          <ConfigToggleRow label="Notify customer" on={config.notifyCustomer !== false} onChange={set('notifyCustomer')} accentColor={ACCENT} />
        </>
      )}

      {show('getCustomer', 'updateCustomer', 'deleteCustomer') && text('Customer ID', 'customerId', { placeholder: '{{n1.id}}' })}

      {show('createCustomer', 'updateCustomer') && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {text('First Name', 'firstName', { placeholder: 'Jane' })}
            {text('Last Name', 'lastName', { placeholder: 'Doe' })}
          </div>
          {text('Email', 'email', { placeholder: '{{n1.email}}' })}
          <div className="grid grid-cols-2 gap-2">
            {text('Phone', 'phone', { placeholder: '+15551234567' })}
            {text('Tags (comma-sep)', 'tags', { placeholder: 'vip, wholesale' })}
          </div>
        </>
      )}

      {show('searchCustomers') && text('Search Query', 'query', { placeholder: 'email:jane@example.com', hint: 'e.g. email:jane@x.com or country:US' })}

      {show('completeDraftOrder') && text('Draft Order ID', 'draftOrderId', { placeholder: '{{n1.id}}' })}

      {show('createPriceRule', 'createDiscountCode') && (
        <>
          {show('createDiscountCode') && text('Price Rule ID', 'priceRuleId', { placeholder: '{{n1.id}}' })}
          {text('Title / Code', 'title', { placeholder: 'SUMMER20' })}
          {show('createDiscountCode') && text('Discount Code', 'code', { placeholder: 'SUMMER20' })}
          {show('createPriceRule') && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <ConfigPills
                  label="Value Type"
                  value={config.valueType ?? 'percentage'}
                  onChange={set('valueType')}
                  options={[{ value: 'percentage', label: 'Percentage' }, { value: 'fixed_amount', label: 'Fixed' }]}
                  accentColor={ACCENT}
                />
                {text('Value', 'value', { placeholder: '-20.0' })}
              </div>
              {text('Starts At (ISO)', 'startsAt', { placeholder: '2026-07-01T00:00:00Z' })}
            </>
          )}
        </>
      )}

      {show('createMetafield', 'listMetafields') && (
        <ConfigPills
          label="Owner Resource"
          value={config.ownerResource ?? 'product'}
          onChange={set('ownerResource')}
          options={['product', 'order', 'customer']}
          accentColor={ACCENT}
        />
      )}

      {show('createMetafield') && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {text('Namespace', 'namespace', { placeholder: 'custom' })}
            {text('Key', 'key', { placeholder: 'warranty' })}
          </div>
          {text('Value', 'value', { placeholder: '2 years' })}
          {text('Type', 'metafieldType', { placeholder: 'single_line_text_field' })}
        </>
      )}

      {show('createWebhook') && (
        <>
          {text('Topic', 'topic', { placeholder: 'orders/create', hint: 'e.g. orders/create, products/update' })}
          {text('Callback URL', 'address', { placeholder: 'https://your-app.com/webhooks/shopify', hint: 'Must be a public https:// endpoint' })}
        </>
      )}

      {show('deleteWebhook') && text('Webhook ID', 'webhookId', { placeholder: '{{n1.id}}' })}

      {LIST_OPS.includes(op) && text('Limit', 'limit', { placeholder: '50', def: '50', hint: 'Max 250 per page' })}

      <CredentialPicker
        provider="shopify"
        value={config.credentialId || ''}
        onChange={set('credentialId')}
        accentColor="zinc"
        label="Shopify Admin API Token"
        placeholder="Select Shopify credential..."
      />

      <ConfigBanner>
        Returns: <span className="text-neutral-300 ml-1">products[ ], orders[ ], customers[ ], id, count</span>
      </ConfigBanner>
    </ConfigSection>
  );
}
