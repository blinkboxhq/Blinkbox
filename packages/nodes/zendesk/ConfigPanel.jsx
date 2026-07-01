import {
  Ticket, Inbox, Plus, Pencil, Trash2, List, MessageSquare, UserCheck,
  CheckCircle2, Tag, Hash, History, ShieldAlert, GitMerge, Users, User,
  UserPlus, Search, Building2, Users2, Layers, Sliders, Zap, LayoutList,
  Eye, Star, BookOpen, FileText, FolderTree, Folder,
} from "lucide-react";
import SmartVariableInput from "@/components/ui/SmartVariableInput";
import CredentialPicker from "@/components/ui/CredentialPicker";

const ACCENT = "#78A300";

const GROUPS = [
  {
    title: "Tickets",
    ops: [
      { value: "listTickets", label: "List Tickets", icon: Inbox },
      { value: "getTicket", label: "Get Ticket", icon: Ticket },
      { value: "createTicket", label: "Create Ticket", icon: Plus },
      { value: "updateTicket", label: "Update Ticket", icon: Pencil },
      { value: "deleteTicket", label: "Delete Ticket", icon: Trash2 },
      { value: "addComment", label: "Add Comment", icon: MessageSquare },
      { value: "assignTicket", label: "Assign Ticket", icon: UserCheck },
      { value: "closeTicket", label: "Close Ticket", icon: CheckCircle2 },
      { value: "listTicketComments", label: "List Comments", icon: List },
      { value: "addTicketTags", label: "Add Tags", icon: Tag },
      { value: "removeTicketTags", label: "Remove Tags", icon: Tag },
      { value: "countTickets", label: "Count Tickets", icon: Hash },
      { value: "listTicketAudits", label: "List Audits", icon: History },
      { value: "markTicketSpam", label: "Mark As Spam", icon: ShieldAlert },
      { value: "mergeTickets", label: "Merge Tickets", icon: GitMerge },
      { value: "searchTickets", label: "Search Tickets", icon: Search },
    ],
  },
  {
    title: "Users",
    ops: [
      { value: "listUsers", label: "List Users", icon: Users },
      { value: "getUser", label: "Get User", icon: User },
      { value: "createUser", label: "Create User", icon: UserPlus },
      { value: "updateUser", label: "Update User", icon: Pencil },
      { value: "deleteUser", label: "Delete User", icon: Trash2 },
      { value: "createOrUpdateUser", label: "Create/Update User", icon: UserCheck },
      { value: "searchUsers", label: "Search Users", icon: Search },
      { value: "listUserTickets", label: "User's Tickets", icon: Ticket },
      { value: "addUserTags", label: "Add User Tags", icon: Tag },
    ],
  },
  {
    title: "Organizations",
    ops: [
      { value: "listOrganizations", label: "List Orgs", icon: Building2 },
      { value: "getOrganization", label: "Get Org", icon: Building2 },
      { value: "createOrganization", label: "Create Org", icon: Plus },
      { value: "updateOrganization", label: "Update Org", icon: Pencil },
      { value: "deleteOrganization", label: "Delete Org", icon: Trash2 },
      { value: "searchOrganizations", label: "Search Orgs", icon: Search },
      { value: "listOrganizationTickets", label: "Org's Tickets", icon: Ticket },
    ],
  },
  {
    title: "Groups",
    ops: [
      { value: "listGroups", label: "List Groups", icon: Users2 },
      { value: "getGroup", label: "Get Group", icon: Users2 },
      { value: "createGroup", label: "Create Group", icon: Plus },
      { value: "updateGroup", label: "Update Group", icon: Pencil },
      { value: "deleteGroup", label: "Delete Group", icon: Trash2 },
    ],
  },
  {
    title: "Fields, Macros & Views",
    ops: [
      { value: "listTicketFields", label: "List Fields", icon: Layers },
      { value: "createTicketField", label: "Create Field", icon: Sliders },
      { value: "listMacros", label: "List Macros", icon: Zap },
      { value: "applyMacro", label: "Apply Macro", icon: Zap },
      { value: "listViews", label: "List Views", icon: LayoutList },
      { value: "executeView", label: "Execute View", icon: Eye },
      { value: "countView", label: "Count View", icon: Hash },
    ],
  },
  {
    title: "Search & Satisfaction",
    ops: [
      { value: "search", label: "Unified Search", icon: Search },
      { value: "listSatisfactionRatings", label: "Satisfaction", icon: Star },
    ],
  },
  {
    title: "Help Center",
    ops: [
      { value: "listArticles", label: "List Articles", icon: BookOpen },
      { value: "getArticle", label: "Get Article", icon: FileText },
      { value: "createArticle", label: "Create Article", icon: Plus },
      { value: "updateArticle", label: "Update Article", icon: Pencil },
      { value: "deleteArticle", label: "Delete Article", icon: Trash2 },
      { value: "listSections", label: "List Sections", icon: FolderTree },
      { value: "createSection", label: "Create Section", icon: Plus },
      { value: "listCategories", label: "List Categories", icon: Folder },
      { value: "createCategory", label: "Create Category", icon: Plus },
    ],
  },
];

const PRIORITIES = ["low", "normal", "high", "urgent"];
const STATUSES = ["new", "open", "pending", "hold", "solved", "closed"];

const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
const inputCls =
  "w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#78A300]/40";

export default function ZendeskNode({ config = {}, updateConfig }) {
  const op = config.operation || "listTickets";
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

  const colsMap = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };
  const Pills = ({ k, items, def, cols = 4 }) => (
    <div className={`grid ${colsMap[cols] || "grid-cols-4"} gap-1.5`}>
      {items.map((v) => {
        const active = (config[k] ?? def) === v;
        return (
          <button
            key={v}
            onClick={() => updateConfig(k, v)}
            className={`py-1.5 rounded-lg border text-[10px] font-bold capitalize transition-all ${
              active ? "text-[#78A300] border-[#78A300]/40 bg-[#78A300]/10" : "bg-[#0a0a0a] border-[#222] text-zinc-400 hover:border-[#333]"
            }`}
          >
            {v}
          </button>
        );
      })}
    </div>
  );

  const Toggle = ({ k, label, def = true }) => (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-[#222]">
      <span className="text-xs font-semibold text-zinc-300">{label}</span>
      <button
        onClick={() => updateConfig(k, config[k] === undefined ? !def : !config[k])}
        className={`w-10 h-5 rounded-full transition-all relative ${(config[k] ?? def) ? "bg-[#78A300]" : "bg-zinc-700"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${(config[k] ?? def) ? "left-5" : "left-0.5"}`} />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex items-center gap-3 p-4 bg-[#78A300]/5 border border-[#78A300]/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-[#78A300]/10 border border-[#78A300]/25 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill={ACCENT}>
            <path d="M11.5 0C5.149 0 0 5.149 0 11.5S5.149 23 11.5 23 23 17.851 23 11.5 17.851 0 11.5 0zm0 4.65a3.85 3.85 0 110 7.7 3.85 3.85 0 010-7.7zm0 14.35C8.05 19 5 16.986 5 14.2 5 12.327 7.694 11 11.5 11s6.5 1.327 6.5 3.2c0 2.787-3.05 4.8-6.5 4.8z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-[#78A300]">Zendesk</span>
          <span className="text-[10px] text-zinc-500">Tickets, users, orgs, macros & Help Center</span>
        </div>
      </div>

      <Field label="Subdomain" hint="From mycompany.zendesk.com → mycompany">
        <Var k="subdomain" placeholder="mycompany" />
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

      {show("getTicket", "updateTicket", "deleteTicket", "addComment", "assignTicket", "closeTicket", "listTicketComments", "addTicketTags", "removeTicketTags", "listTicketAudits", "markTicketSpam", "mergeTickets", "applyMacro") && (
        <Field label="Ticket ID">
          <Var k="ticketId" placeholder="{{n1.id}}" />
        </Field>
      )}

      {show("createTicket", "updateTicket") && (
        <>
          <Field label="Subject">
            <Var k="subject" placeholder="{{n1.subject}}" />
          </Field>
          <Field label={show("createTicket") ? "Description (body)" : "Body (optional)"}>
            <Var k="description" placeholder="{{n1.message}}" multiline />
          </Field>
          <Field label="Requester Email">
            <Var k="requesterEmail" placeholder="{{n1.email}}" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <Pills k="priority" items={PRIORITIES} def="normal" cols={2} />
            </Field>
            <Field label="Type">
              <Pills k="type" items={["question", "incident", "problem", "task"]} def="incident" cols={2} />
            </Field>
          </div>
          <Field label="Status">
            <Pills k="status" items={STATUSES} def="" cols={3} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assignee ID">
              <Var k="assigneeId" placeholder="123" />
            </Field>
            <Field label="Group ID">
              <Var k="groupId" placeholder="456" />
            </Field>
          </div>
          <Field label="Tags (comma-sep)">
            <Var k="tags" placeholder="urgent, billing" />
          </Field>
        </>
      )}

      {show("addComment") && (
        <>
          <Field label="Comment Body">
            <Var k="body" placeholder="Thanks for reaching out..." multiline />
          </Field>
          <Toggle k="public" label="Public reply" def={true} />
        </>
      )}

      {show("assignTicket") && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assignee ID">
            <Var k="assigneeId" placeholder="123" />
          </Field>
          <Field label="Group ID (optional)">
            <Var k="groupId" placeholder="456" />
          </Field>
        </div>
      )}

      {show("addTicketTags", "removeTicketTags", "addUserTags") && (
        <Field label="Tags (comma-sep)">
          <Var k="tags" placeholder="vip, escalated" />
        </Field>
      )}

      {show("mergeTickets") && (
        <>
          <Field label="Source Ticket IDs (comma-sep)" hint="These merge into the Ticket ID above">
            <Var k="sourceIds" placeholder="201, 202" />
          </Field>
          <Field label="Target Comment">
            <Var k="targetComment" placeholder="Merged duplicate tickets" multiline />
          </Field>
        </>
      )}

      {show("getUser", "updateUser", "deleteUser", "listUserTickets", "addUserTags") && (
        <Field label="User ID">
          <Var k="userId" placeholder="{{n1.id}}" />
        </Field>
      )}

      {show("createUser", "updateUser", "createOrUpdateUser") && (
        <>
          <Field label="Name">
            <Var k="name" placeholder="{{n1.name}}" />
          </Field>
          <Field label="Email">
            <Var k="email" placeholder="{{n1.email}}" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <Pills k="role" items={["end-user", "agent", "admin"]} def="end-user" cols={3} />
            </Field>
            <Field label="Phone">
              <Var k="phone" placeholder="+15551234567" />
            </Field>
          </div>
          <Field label="Organization ID (optional)">
            <Var k="organizationId" placeholder="789" />
          </Field>
        </>
      )}

      {show("listUserTickets") && (
        <Field label="Ticket Role">
          <Pills k="ticketRole" items={["requested", "assigned", "ccd"]} def="requested" cols={3} />
        </Field>
      )}

      {show("getOrganization", "updateOrganization", "deleteOrganization", "listOrganizationTickets") && (
        <Field label="Organization ID">
          <Var k="organizationId" placeholder="{{n1.id}}" />
        </Field>
      )}

      {show("createOrganization", "updateOrganization") && (
        <>
          <Field label="Name">
            <Var k="name" placeholder="Acme Inc" />
          </Field>
          <Field label="Domain Names (comma-sep)">
            <Var k="domainNames" placeholder="acme.com, acme.io" />
          </Field>
          <Field label="Notes">
            <Var k="notes" placeholder="Enterprise account" multiline />
          </Field>
        </>
      )}

      {show("getGroup", "updateGroup", "deleteGroup") && (
        <Field label="Group ID">
          <Var k="groupId" placeholder="{{n1.id}}" />
        </Field>
      )}

      {show("createGroup", "updateGroup") && (
        <>
          <Field label="Name">
            <Var k="name" placeholder="Support Tier 2" />
          </Field>
          <Field label="Description">
            <Var k="description" placeholder="Escalations team" multiline />
          </Field>
        </>
      )}

      {show("createTicketField") && (
        <>
          <Field label="Field Type" hint="e.g. text, textarea, checkbox, dropdown">
            <Var k="fieldType" placeholder="text" />
          </Field>
          <Field label="Title">
            <Var k="title" placeholder="Order Number" />
          </Field>
        </>
      )}

      {show("applyMacro") && (
        <Field label="Macro ID">
          <Var k="macroId" placeholder="{{n1.id}}" />
        </Field>
      )}

      {show("executeView", "countView") && (
        <Field label="View ID">
          <Var k="viewId" placeholder="{{n1.id}}" />
        </Field>
      )}

      {show("search", "searchTickets", "searchUsers", "searchOrganizations") && (
        <Field label="Search Query" hint={op === "searchTickets" ? "e.g. status:open priority:high" : "Zendesk search syntax"}>
          <Var k="query" placeholder={op === "searchOrganizations" ? "Acme" : 'status:open requester:"{{n1.email}}"'} />
        </Field>
      )}

      {show("getArticle", "updateArticle", "deleteArticle") && (
        <Field label="Article ID">
          <Var k="articleId" placeholder="{{n1.id}}" />
        </Field>
      )}

      {show("createArticle") && (
        <Field label="Section ID">
          <Var k="sectionId" placeholder="{{n1.id}}" />
        </Field>
      )}

      {show("createArticle", "updateArticle") && (
        <>
          <Field label="Title">
            <Var k="title" placeholder="How to reset your password" />
          </Field>
          <Field label="Body (HTML)">
            <Var k="body" placeholder="<p>Follow these steps...</p>" multiline />
          </Field>
        </>
      )}

      {show("createSection") && (
        <Field label="Category ID">
          <Var k="categoryId" placeholder="{{n1.id}}" />
        </Field>
      )}

      {show("createSection", "createCategory") && (
        <>
          <Field label="Name">
            <Var k="name" placeholder="Getting Started" />
          </Field>
          <Field label="Description">
            <Var k="description" placeholder="Onboarding guides" multiline />
          </Field>
        </>
      )}

      {show(
        "listTickets", "listTicketComments", "listTicketAudits", "listUsers", "searchUsers",
        "listUserTickets", "listOrganizations", "listOrganizationTickets", "listGroups",
        "listMacros", "listViews", "executeView", "search", "searchTickets",
        "listSatisfactionRatings", "listArticles", "listSections", "listCategories",
      ) && (
        <Field label="Limit" hint="Max 100 per page">
          <Var k="limit" placeholder="25" def="25" />
        </Field>
      )}

      <CredentialPicker
        provider="zendesk"
        value={config.credentialId || ""}
        onChange={set("credentialId")}
        accentColor={ACCENT}
        label="Zendesk API Token"
        placeholder="Select Zendesk credential..."
      />

      <div className="px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#222] text-[11px] text-zinc-500">
        Credential stored as JSON <span className="text-zinc-300">{'{ "email": "agent@x.com", "token": "..." }'}</span>
      </div>
    </div>
  );
}
