import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";
import imgHubspot from "@/assets/hubspot.svg";
import {
  UserPlus, User, UserCog, UserMinus, List, Search,
  Building2, FileText, Pencil, Trash2, LifeBuoy, Ticket,
  Package, Tag, StickyNote, CheckSquare, Link2, GitBranch,
  Users, UserCheck, Settings2, ListPlus, ListMinus, Plus, DollarSign,
} from "lucide-react";

const ACCENT = "#FF7A59";

const GROUPS = [
  {
    title: "Contacts",
    ops: [
      { value: "createContact", label: "Create Contact", icon: UserPlus },
      { value: "getContact", label: "Get Contact", icon: User },
      { value: "updateContact", label: "Update Contact", icon: UserCog },
      { value: "deleteContact", label: "Delete Contact", icon: UserMinus },
      { value: "listContacts", label: "List Contacts", icon: List },
      { value: "searchContacts", label: "Search Contacts", icon: Search },
    ],
  },
  {
    title: "Companies",
    ops: [
      { value: "createCompany", label: "Create Company", icon: Building2 },
      { value: "getCompany", label: "Get Company", icon: Building2 },
      { value: "updateCompany", label: "Update Company", icon: Pencil },
      { value: "deleteCompany", label: "Delete Company", icon: Trash2 },
      { value: "listCompanies", label: "List Companies", icon: List },
      { value: "searchCompanies", label: "Search Companies", icon: Search },
    ],
  },
  {
    title: "Deals",
    ops: [
      { value: "createDeal", label: "Create Deal", icon: DollarSign },
      { value: "getDeal", label: "Get Deal", icon: FileText },
      { value: "updateDeal", label: "Update Deal", icon: Pencil },
      { value: "deleteDeal", label: "Delete Deal", icon: Trash2 },
      { value: "listDeals", label: "List Deals", icon: List },
      { value: "searchDeals", label: "Search Deals", icon: Search },
    ],
  },
  {
    title: "Tickets",
    ops: [
      { value: "createTicket", label: "Create Ticket", icon: LifeBuoy },
      { value: "getTicket", label: "Get Ticket", icon: Ticket },
      { value: "updateTicket", label: "Update Ticket", icon: Pencil },
      { value: "deleteTicket", label: "Delete Ticket", icon: Trash2 },
      { value: "listTickets", label: "List Tickets", icon: List },
    ],
  },
  {
    title: "Products & Line Items",
    ops: [
      { value: "createProduct", label: "Create Product", icon: Package },
      { value: "getProduct", label: "Get Product", icon: Package },
      { value: "listProducts", label: "List Products", icon: List },
      { value: "createLineItem", label: "Create Line Item", icon: Tag },
    ],
  },
  {
    title: "Engagements",
    ops: [
      { value: "createNote", label: "Create Note", icon: StickyNote },
      { value: "createTask", label: "Create Task", icon: CheckSquare },
    ],
  },
  {
    title: "Associations & Metadata",
    ops: [
      { value: "associateObjects", label: "Associate", icon: Link2 },
      { value: "listAssociations", label: "List Assoc.", icon: List },
      { value: "listPipelines", label: "List Pipelines", icon: GitBranch },
      { value: "listOwners", label: "List Owners", icon: Users },
      { value: "getOwner", label: "Get Owner", icon: UserCheck },
      { value: "listProperties", label: "List Props", icon: Settings2 },
      { value: "addToList", label: "Add to List", icon: ListPlus },
      { value: "removeFromList", label: "Remove from List", icon: ListMinus },
    ],
  },
];

const OBJECT_TYPES = [
  { value: "contacts", label: "Contacts" },
  { value: "companies", label: "Companies" },
  { value: "deals", label: "Deals" },
  { value: "tickets", label: "Tickets" },
];
const TASK_STATUS = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "WAITING", label: "Waiting" },
];

const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
const inputCls =
  "w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#FF7A59]/40";

export default function HubspotNode({ config = {}, updateConfig }) {
  const op = config.operation || "createContact";
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
                active ? "text-white" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
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
      <div className="flex items-center gap-3 p-4 bg-[#FF7A59]/5 border border-[#FF7A59]/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-[#FF7A59]/10 border border-[#FF7A59]/25 flex items-center justify-center shrink-0">
          <img src={imgHubspot} alt="HubSpot" className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#FF7A59]">HubSpot</span>
          <span className="text-[10px] text-zinc-500">CRM — contacts, deals, tickets & 38 actions</span>
        </div>
      </div>

      <CredentialPicker
        provider="hubspot"
        value={config.credentialId || ""}
        onChange={set("credentialId")}
        accentColor={ACCENT}
        label="HubSpot Private App Token"
        placeholder="Connect your HubSpot account"
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
        {show("getContact", "updateContact", "deleteContact") && (
          <Field label="Contact ID" hint={show("getContact") ? "Or use email below" : undefined}>
            <Var k="contactId" placeholder="Numeric contact ID" />
          </Field>
        )}
        {show("createContact", "updateContact", "getContact") && (
          <Field label="Email"><Var k="email" placeholder="jane@example.com" /></Field>
        )}
        {show("createContact", "updateContact") && (
          <>
            <Field label="First Name"><Var k="firstName" placeholder="Jane" /></Field>
            <Field label="Last Name"><Var k="lastName" placeholder="Doe" /></Field>
            <Field label="Phone"><Var k="phone" placeholder="+1 555 555 5555" /></Field>
            <Field label="Company"><Var k="company" placeholder="Acme Inc" /></Field>
            <Field label="Job Title"><Var k="jobTitle" placeholder="VP Sales" /></Field>
          </>
        )}

        {show("getCompany", "updateCompany", "deleteCompany") && (
          <Field label="Company ID"><Var k="companyId" placeholder="Numeric company ID" /></Field>
        )}
        {show("createCompany", "updateCompany") && (
          <>
            <Field label="Company Name"><Var k="companyName" placeholder="Acme Inc" /></Field>
            <Field label="Domain"><Var k="domain" placeholder="acme.com" /></Field>
            <Field label="Industry"><Var k="industry" placeholder="Software" /></Field>
            <Field label="City"><Var k="city" placeholder="San Francisco" /></Field>
            <Field label="Country"><Var k="country" placeholder="United States" /></Field>
          </>
        )}

        {show("getDeal", "updateDeal", "deleteDeal") && (
          <Field label="Deal ID"><Var k="dealId" placeholder="Numeric deal ID" /></Field>
        )}
        {show("createDeal", "updateDeal") && (
          <>
            <Field label="Deal Name"><Var k="dealName" placeholder="New enterprise deal" /></Field>
            <Field label="Amount"><Var k="amount" placeholder="50000" /></Field>
            <Field label="Stage" hint="Internal deal stage ID"><Var k="stage" placeholder="appointmentscheduled" /></Field>
            <Field label="Pipeline (optional)"><Var k="pipeline" placeholder="default" /></Field>
            <Field label="Close Date (optional)"><Var k="closeDate" placeholder="2026-12-31" /></Field>
          </>
        )}

        {show("getTicket", "updateTicket", "deleteTicket") && (
          <Field label="Ticket ID"><Var k="ticketId" placeholder="Numeric ticket ID" /></Field>
        )}
        {show("createTicket", "updateTicket") && (
          <>
            <Field label="Subject"><Var k="subject" placeholder="Login issue" /></Field>
            <Field label="Content"><Var k="content" placeholder="Description of the issue" multiline /></Field>
            <Field label="Priority"><Var k="priority" placeholder="HIGH / MEDIUM / LOW" /></Field>
            <Field label="Stage (optional)"><Var k="stage" placeholder="Pipeline stage ID" /></Field>
          </>
        )}

        {show("getProduct") && <Field label="Product ID"><Var k="productId" placeholder="Numeric product ID" /></Field>}
        {show("createProduct", "createLineItem") && (
          <>
            <Field label="Name"><Var k="name" placeholder="Pro Subscription" /></Field>
            <Field label="Price"><Var k="price" placeholder="99.00" /></Field>
          </>
        )}
        {show("createLineItem") && (
          <>
            <Field label="Quantity"><Var k="quantity" placeholder="1" def="1" /></Field>
            <Field label="Product ID (optional)"><Var k="productId" placeholder="Linked product ID" /></Field>
          </>
        )}

        {show("createNote") && (
          <Field label="Note Body"><Var k="body" placeholder="Note content" multiline /></Field>
        )}
        {show("createTask") && (
          <>
            <Field label="Subject"><Var k="subject" placeholder="Follow up with prospect" /></Field>
            <Field label="Body (optional)"><Var k="body" placeholder="Task details" multiline /></Field>
            <Field label="Status"><Pills k="status" items={TASK_STATUS} def="NOT_STARTED" /></Field>
            <Field label="Owner ID (optional)"><Var k="ownerId" placeholder="HubSpot owner ID" /></Field>
          </>
        )}
        {show("createNote", "createTask") && (
          <Field label="Associate to records (optional)" hint="Provide any record IDs to link this engagement">
            <div className="flex flex-col gap-2">
              <Var k="contactId" placeholder="Contact ID" />
              <Var k="dealId" placeholder="Deal ID" />
              <Var k="companyId" placeholder="Company ID" />
              <Var k="ticketId" placeholder="Ticket ID" />
            </div>
          </Field>
        )}

        {show("associateObjects", "listAssociations") && (
          <>
            <Field label="From Object Type"><Var k="fromType" placeholder="contacts" /></Field>
            <Field label="From ID"><Var k="fromId" placeholder="Source record ID" /></Field>
            <Field label="To Object Type"><Var k="toType" placeholder="deals" /></Field>
          </>
        )}
        {show("associateObjects") && (
          <Field label="To ID"><Var k="toId" placeholder="Target record ID" /></Field>
        )}

        {show("listPipelines", "listProperties") && (
          <Field label="Object Type"><Pills k="objectType" items={OBJECT_TYPES} def="deals" /></Field>
        )}
        {show("getOwner") && <Field label="Owner ID"><Var k="ownerId" placeholder="Numeric owner ID" /></Field>}
        {show("listOwners") && <Field label="Filter by Email (optional)"><Var k="email" placeholder="rep@company.com" /></Field>}

        {show("addToList", "removeFromList") && (
          <>
            <Field label="List ID"><Var k="listId" placeholder="Numeric list ID" /></Field>
            <Field label="Contact ID(s)" hint="Comma-separated for multiple"><Var k="contactId" placeholder="123, 456" /></Field>
          </>
        )}

        {show("searchContacts", "searchCompanies", "searchDeals") && (
          <>
            <Field label="Query (optional)"><Var k="query" placeholder="Free-text search" /></Field>
            <Field label="Filter Groups JSON (optional)" hint='[{"filters":[{"propertyName":"email","operator":"EQ","value":"x"}]}]'>
              <Var k="filterGroups" placeholder='[{"filters":[...]}]' multiline />
            </Field>
            <Field label="Sort Property (optional)"><Var k="sortProperty" placeholder="createdate" /></Field>
          </>
        )}

        {show(
          "createContact", "updateContact", "createCompany", "updateCompany",
          "createDeal", "updateDeal", "createTicket", "updateTicket"
        ) && (
          <Field label="Extra Properties JSON (optional)" hint='{"custom_field":"value"}'>
            <Var k="extraProperties" placeholder='{"custom_field":"value"}' multiline />
          </Field>
        )}

        {show(
          "listContacts", "listCompanies", "listDeals", "listTickets", "listProducts",
          "searchContacts", "searchCompanies", "searchDeals"
        ) && (
          <Field label="Limit" hint="Max 100"><Var k="limit" placeholder="20" def="20" /></Field>
        )}
        {show("listContacts", "listCompanies", "listDeals", "listTickets", "listProducts") && (
          <Field label="After Cursor (optional)"><Var k="after" placeholder="Paging cursor from previous run" /></Field>
        )}
      </div>
    </div>
  );
}
