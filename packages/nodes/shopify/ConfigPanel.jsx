import {
  Package, Boxes, Tag, Layers, Warehouse, MapPin, ShoppingCart, Truck,
  RefreshCcw, Receipt, Users, User, FileText, Percent, Ticket, Hash,
  Webhook, Store, Search, Plus, Pencil, Trash2, List, ShoppingBag,
} from "lucide-react";
import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";

const ACCENT = "#95BF47";

const GROUPS = [
  {
    title: "Products",
    ops: [
      { value: "listProducts", label: "List Products", icon: List },
      { value: "getProduct", label: "Get Product", icon: Package },
      { value: "createProduct", label: "Create Product", icon: Plus },
      { value: "updateProduct", label: "Update Product", icon: Pencil },
      { value: "deleteProduct", label: "Delete Product", icon: Trash2 },
      { value: "countProducts", label: "Count Products", icon: Hash },
    ],
  },
  {
    title: "Variants",
    ops: [
      { value: "listVariants", label: "List Variants", icon: Boxes },
      { value: "createVariant", label: "Create Variant", icon: Plus },
      { value: "updateVariant", label: "Update Variant", icon: Pencil },
      { value: "deleteVariant", label: "Delete Variant", icon: Trash2 },
    ],
  },
  {
    title: "Collections",
    ops: [
      { value: "listCustomCollections", label: "Custom Collections", icon: Layers },
      { value: "listSmartCollections", label: "Smart Collections", icon: Layers },
      { value: "createCollection", label: "Create Collection", icon: Plus },
      { value: "addProductToCollection", label: "Add To Collection", icon: Tag },
    ],
  },
  {
    title: "Inventory",
    ops: [
      { value: "getInventoryLevels", label: "Inventory Levels", icon: Warehouse },
      { value: "setInventoryLevel", label: "Set Inventory", icon: Warehouse },
      { value: "adjustInventoryLevel", label: "Adjust Inventory", icon: Warehouse },
      { value: "listLocations", label: "List Locations", icon: MapPin },
    ],
  },
  {
    title: "Orders",
    ops: [
      { value: "listOrders", label: "List Orders", icon: List },
      { value: "getOrder", label: "Get Order", icon: ShoppingCart },
      { value: "createOrder", label: "Create Order", icon: Plus },
      { value: "updateOrder", label: "Update Order", icon: Pencil },
      { value: "cancelOrder", label: "Cancel Order", icon: Trash2 },
      { value: "closeOrder", label: "Close Order", icon: Receipt },
      { value: "countOrders", label: "Count Orders", icon: Hash },
    ],
  },
  {
    title: "Fulfillment & Refunds",
    ops: [
      { value: "listFulfillments", label: "List Fulfillments", icon: Truck },
      { value: "createFulfillment", label: "Create Fulfillment", icon: Truck },
      { value: "listTransactions", label: "List Transactions", icon: Receipt },
      { value: "createRefund", label: "Create Refund", icon: RefreshCcw },
    ],
  },
  {
    title: "Customers",
    ops: [
      { value: "listCustomers", label: "List Customers", icon: Users },
      { value: "getCustomer", label: "Get Customer", icon: User },
      { value: "createCustomer", label: "Create Customer", icon: Plus },
      { value: "updateCustomer", label: "Update Customer", icon: Pencil },
      { value: "deleteCustomer", label: "Delete Customer", icon: Trash2 },
      { value: "searchCustomers", label: "Search Customers", icon: Search },
    ],
  },
  {
    title: "Draft Orders",
    ops: [
      { value: "listDraftOrders", label: "List Draft Orders", icon: FileText },
      { value: "createDraftOrder", label: "Create Draft Order", icon: Plus },
      { value: "completeDraftOrder", label: "Complete Draft", icon: Receipt },
    ],
  },
  {
    title: "Discounts",
    ops: [
      { value: "listPriceRules", label: "List Price Rules", icon: Percent },
      { value: "createPriceRule", label: "Create Price Rule", icon: Percent },
      { value: "createDiscountCode", label: "Create Discount", icon: Ticket },
    ],
  },
  {
    title: "Metafields, Webhooks & Shop",
    ops: [
      { value: "listMetafields", label: "List Metafields", icon: Hash },
      { value: "createMetafield", label: "Create Metafield", icon: Plus },
      { value: "listWebhooks", label: "List Webhooks", icon: Webhook },
      { value: "createWebhook", label: "Create Webhook", icon: Webhook },
      { value: "deleteWebhook", label: "Delete Webhook", icon: Trash2 },
      { value: "getShop", label: "Get Shop Info", icon: Store },
    ],
  },
];

const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
const inputCls =
  "w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#95BF47]/40";

export default function ShopifyNode({ config = {}, updateConfig }) {
  const op = config.operation || "listOrders";
  const set = (k) => (v) => updateConfig(k, v);
  const show = (...ops) => ops.includes(op);

  const Field = ({ label, hint, children }) => (
    <div className="flex flex-col gap-2">
      <label className={lbl}>{label}</label>
      {children}
      {hint && <span className="text-[10px] text-zinc-600">{hint}</span>}
    </div>
  );

  const Var = ({ k, placeholder, multiline, def }) => (
    <SmartVariableInput
      value={config[k] ?? def ?? ""}
      onChange={set(k)}
      placeholder={placeholder}
      multiline={multiline}
      className={inputCls}
    />
  );

  const Pills = ({ k, items, def }) => (
    <div className="grid grid-cols-3 gap-1.5">
      {items.map((it) => {
        const v = typeof it === "string" ? it : it.value;
        const label = typeof it === "string" ? it : it.label;
        const active = (config[k] ?? def) === v;
        return (
          <button
            key={v}
            onClick={() => updateConfig(k, v)}
            className={`py-2 rounded-lg border text-[11px] font-bold capitalize transition-all ${
              active
                ? "text-[#95BF47] border-[#95BF47]/40 bg-[#95BF47]/10"
                : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#95BF47]/5 border border-[#95BF47]/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-[#95BF47]/10 border border-[#95BF47]/25 flex items-center justify-center shrink-0">
          <ShoppingBag className="w-4 h-4 text-[#95BF47]" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#95BF47]">Shopify</span>
          <span className="text-[10px] text-zinc-500">Products, orders, inventory, customers & more</span>
        </div>
      </div>

      <Field label="Shop Domain" hint="Your store's myshopify.com domain">
        <input
          value={config.shop || ""}
          onChange={(e) => updateConfig("shop", e.target.value)}
          placeholder="mystore.myshopify.com"
          className={inputCls}
        />
      </Field>

      <div className="flex flex-col gap-3">
        <span className={lbl}>Operation</span>
        {GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{group.title}</span>
            <div className="grid grid-cols-2 gap-2">
              {group.ops.map((o) => {
                const Icon = o.icon;
                const active = op === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => updateConfig("operation", o.value)}
                    style={active ? { backgroundColor: `${ACCENT}1a`, borderColor: `${ACCENT}66`, color: ACCENT } : undefined}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all ${
                      active ? "" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
                    }`}
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

      {show("getProduct", "updateProduct", "deleteProduct", "listVariants", "createVariant", "addProductToCollection", "listMetafields", "createMetafield") && (
        <Field label="Product ID">
          <Var k="productId" placeholder="{{n1.id}}" />
        </Field>
      )}

      {show("createProduct", "updateProduct") && (
        <>
          <Field label="Title">
            <Var k="title" placeholder="Premium Widget" />
          </Field>
          <Field label="Description (HTML)">
            <Var k="description" placeholder="<p>Best widget ever</p>" multiline />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vendor">
              <Var k="vendor" placeholder="Acme" />
            </Field>
            <Field label="Product Type">
              <Var k="productType" placeholder="Widgets" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price">
              <Var k="price" placeholder="29.99" />
            </Field>
            <Field label="Tags (comma-sep)">
              <Var k="tags" placeholder="sale, featured" />
            </Field>
          </div>
          <Field label="Status">
            <Pills k="status" items={["active", "draft", "archived"]} def="draft" />
          </Field>
        </>
      )}

      {show("updateVariant", "deleteVariant") && (
        <Field label="Variant ID">
          <Var k="variantId" placeholder="{{n1.variantId}}" />
        </Field>
      )}

      {show("createVariant", "updateVariant") && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Option / Title">
              <Var k="option" placeholder="Large / Blue" />
            </Field>
            <Field label="Price">
              <Var k="price" placeholder="29.99" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU">
              <Var k="sku" placeholder="WIDGET-L-BLU" />
            </Field>
            <Field label="Barcode">
              <Var k="barcode" placeholder="0123456789012" />
            </Field>
          </div>
        </>
      )}

      {show("createCollection") && (
        <Field label="Collection Title">
          <Var k="title" placeholder="Summer Sale" />
        </Field>
      )}

      {show("addProductToCollection") && (
        <Field label="Collection ID">
          <Var k="collectionId" placeholder="{{n1.collectionId}}" />
        </Field>
      )}

      {show("getInventoryLevels", "setInventoryLevel", "adjustInventoryLevel") && (
        <>
          {show("getInventoryLevels") && (
            <Field label="Inventory Item IDs (comma-sep)">
              <Var k="inventoryItemIds" placeholder="123, 456" />
            </Field>
          )}
          {show("setInventoryLevel", "adjustInventoryLevel") && (
            <Field label="Inventory Item ID">
              <Var k="inventoryItemId" placeholder="{{n1.inventory_item_id}}" />
            </Field>
          )}
          <Field label="Location ID">
            <Var k="locationId" placeholder="{{n1.location_id}}" />
          </Field>
          {show("setInventoryLevel") && (
            <Field label="Available Quantity">
              <Var k="available" placeholder="100" />
            </Field>
          )}
          {show("adjustInventoryLevel") && (
            <Field label="Adjustment (+/-)">
              <Var k="adjustment" placeholder="-5" />
            </Field>
          )}
        </>
      )}

      {show("getOrder", "updateOrder", "cancelOrder", "closeOrder", "listFulfillments", "createFulfillment", "listTransactions", "createRefund") && (
        <Field label="Order ID">
          <Var k="orderId" placeholder="{{n1.id}}" />
        </Field>
      )}

      {show("listOrders") && (
        <>
          <Field label="Status Filter">
            <Pills k="status" items={["any", "open", "closed"]} def="any" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Financial Status">
              <Var k="financialStatus" placeholder="paid" />
            </Field>
            <Field label="Fulfillment Status">
              <Var k="fulfillmentStatus" placeholder="unfulfilled" />
            </Field>
          </div>
        </>
      )}

      {show("createOrder", "createDraftOrder") && (
        <>
          <Field label="Line Items (JSON array)" hint='[{"variant_id":123,"quantity":1}]'>
            <Var k="lineItems" placeholder='[{"variant_id":123,"quantity":1}]' multiline />
          </Field>
          <Field label="Customer Email">
            <Var k="email" placeholder="{{n1.email}}" />
          </Field>
          <Field label="Note">
            <Var k="note" placeholder="Gift wrap requested" />
          </Field>
        </>
      )}

      {show("cancelOrder") && (
        <Field label="Cancel Reason">
          <Pills k="reason" items={["customer", "inventory", "fraud", "declined", "other"]} def="other" />
        </Field>
      )}

      {show("createFulfillment") && (
        <>
          <Field label="Fulfillment Order ID">
            <Var k="fulfillmentOrderId" placeholder="{{n1.fulfillment_order_id}}" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tracking Number">
              <Var k="trackingNumber" placeholder="1Z999AA1..." />
            </Field>
            <Field label="Tracking Company">
              <Var k="trackingCompany" placeholder="UPS" />
            </Field>
          </div>
          <Field label="Tracking URL">
            <Var k="trackingUrl" placeholder="https://track..." />
          </Field>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={!!config.notifyCustomer} onChange={(e) => updateConfig("notifyCustomer", e.target.checked)} />
            Notify customer
          </label>
        </>
      )}

      {show("createRefund") && (
        <>
          <Field label="Amount">
            <Var k="amount" placeholder="19.99" />
          </Field>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={config.notifyCustomer !== false} onChange={(e) => updateConfig("notifyCustomer", e.target.checked)} />
            Notify customer
          </label>
        </>
      )}

      {show("getCustomer", "updateCustomer", "deleteCustomer") && (
        <Field label="Customer ID">
          <Var k="customerId" placeholder="{{n1.id}}" />
        </Field>
      )}

      {show("createCustomer", "updateCustomer") && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name">
              <Var k="firstName" placeholder="Jane" />
            </Field>
            <Field label="Last Name">
              <Var k="lastName" placeholder="Doe" />
            </Field>
          </div>
          <Field label="Email">
            <Var k="email" placeholder="{{n1.email}}" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Var k="phone" placeholder="+15551234567" />
            </Field>
            <Field label="Tags (comma-sep)">
              <Var k="tags" placeholder="vip, wholesale" />
            </Field>
          </div>
        </>
      )}

      {show("searchCustomers") && (
        <Field label="Search Query" hint="e.g. email:jane@x.com or country:US">
          <Var k="query" placeholder="email:jane@example.com" />
        </Field>
      )}

      {show("completeDraftOrder") && (
        <Field label="Draft Order ID">
          <Var k="draftOrderId" placeholder="{{n1.id}}" />
        </Field>
      )}

      {show("createPriceRule", "createDiscountCode") && (
        <>
          {show("createDiscountCode") && (
            <Field label="Price Rule ID">
              <Var k="priceRuleId" placeholder="{{n1.id}}" />
            </Field>
          )}
          <Field label="Title / Code">
            <Var k="title" placeholder="SUMMER20" />
          </Field>
          {show("createDiscountCode") && (
            <Field label="Discount Code">
              <Var k="code" placeholder="SUMMER20" />
            </Field>
          )}
          {show("createPriceRule") && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Value Type">
                  <Pills k="valueType" items={["percentage", "fixed_amount"]} def="percentage" />
                </Field>
                <Field label="Value">
                  <Var k="value" placeholder="-20.0" />
                </Field>
              </div>
              <Field label="Starts At (ISO)">
                <Var k="startsAt" placeholder="2026-07-01T00:00:00Z" />
              </Field>
            </>
          )}
        </>
      )}

      {show("createMetafield", "listMetafields") && (
        <Field label="Owner Resource">
          <Pills k="ownerResource" items={["product", "order", "customer"]} def="product" />
        </Field>
      )}

      {show("createMetafield") && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Namespace">
              <Var k="namespace" placeholder="custom" />
            </Field>
            <Field label="Key">
              <Var k="key" placeholder="warranty" />
            </Field>
          </div>
          <Field label="Value">
            <Var k="value" placeholder="2 years" />
          </Field>
          <Field label="Type">
            <Var k="metafieldType" placeholder="single_line_text_field" />
          </Field>
        </>
      )}

      {show("createWebhook") && (
        <>
          <Field label="Topic" hint="e.g. orders/create, products/update">
            <Var k="topic" placeholder="orders/create" />
          </Field>
          <Field label="Callback URL" hint="Must be a public https:// endpoint">
            <Var k="address" placeholder="https://your-app.com/webhooks/shopify" />
          </Field>
        </>
      )}

      {show("deleteWebhook") && (
        <Field label="Webhook ID">
          <Var k="webhookId" placeholder="{{n1.id}}" />
        </Field>
      )}

      {show(
        "listProducts", "listVariants", "listCustomCollections", "listSmartCollections",
        "listOrders", "listCustomers", "listDraftOrders", "listPriceRules", "listMetafields",
      ) && (
        <Field label="Limit" hint="Max 250 per page">
          <Var k="limit" placeholder="50" def="50" />
        </Field>
      )}

      <CredentialPicker
        provider="shopify"
        value={config.credentialId || ""}
        onChange={set("credentialId")}
        accentColor={ACCENT}
        label="Shopify Admin API Token"
        placeholder="Select Shopify credential..."
      />
    </div>
  );
}
