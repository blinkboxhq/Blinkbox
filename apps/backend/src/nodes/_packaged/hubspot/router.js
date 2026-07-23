/**
 * HubSpot — operation router. Spreads every resource's operations map into a
 * single OPERATIONS registry, then dispatches `run(config, { api })` → handler,
 * funneling errors to handleError. Throws on unknown op internally; the slim
 * entry translates missing-op / missing-credential into skip objects.
 */
import { handleError } from "./GenericFunctions.js";
import { contactOperations } from "./v1/ContactDescription.js";
import { companyOperations } from "./v1/CompanyDescription.js";
import { dealOperations } from "./v1/DealDescription.js";
import { ticketOperations } from "./v1/TicketDescription.js";
import { productOperations } from "./v1/ProductDescription.js";
import { engagementOperations } from "./v1/EngagementDescription.js";
import { metaOperations } from "./v1/MetaDescription.js";

export const OPERATIONS = {
  ...contactOperations,
  ...companyOperations,
  ...dealOperations,
  ...ticketOperations,
  ...productOperations,
  ...engagementOperations,
  ...metaOperations,
};

export const DEFAULT_OPERATION = "createContact";

export const OPERATION_SCHEMA = {
  createContact: { description: "Create a contact", recommended: true },
  getContact: { description: "Read one contact by ID or email" },
  updateContact: { description: "Update a contact's properties" },
  deleteContact: { description: "Delete a contact" },
  listContacts: { description: "List contacts, newest first" },
  searchContacts: { description: "Search contacts by property filters or query", recommended: true },
  batchCreateContacts: { description: "Create many contacts in one call" },
  batchReadContacts: { description: "Read many contacts by ID in one call" },
  createCompany: { description: "Create a company" },
  getCompany: { description: "Read one company by ID" },
  updateCompany: { description: "Update a company's properties" },
  deleteCompany: { description: "Delete a company" },
  listCompanies: { description: "List companies" },
  searchCompanies: { description: "Search companies by property filters" },
  createDeal: { description: "Create a deal in a pipeline", recommended: true },
  getDeal: { description: "Read one deal by ID" },
  updateDeal: { description: "Update a deal's amount, stage or properties", recommended: true },
  deleteDeal: { description: "Delete a deal" },
  listDeals: { description: "List deals" },
  searchDeals: { description: "Search deals by property filters" },
  createTicket: { description: "Create a support ticket" },
  getTicket: { description: "Read one ticket by ID" },
  updateTicket: { description: "Update a ticket's status or properties" },
  deleteTicket: { description: "Delete a ticket" },
  listTickets: { description: "List tickets" },
  searchTickets: { description: "Search tickets by property filters" },
  createProduct: { description: "Create a product" },
  getProduct: { description: "Read one product by ID" },
  updateProduct: { description: "Update a product's properties" },
  deleteProduct: { description: "Delete a product" },
  listProducts: { description: "List products" },
  createLineItem: { description: "Create a line item for a deal" },
  getLineItem: { description: "Read one line item by ID" },
  updateLineItem: { description: "Update a line item" },
  deleteLineItem: { description: "Delete a line item" },
  listLineItems: { description: "List line items" },
  createNote: { description: "Create a note engagement", recommended: true },
  addNote: { description: "Attach a note to a contact, company or deal" },
  getNote: { description: "Read one note by ID" },
  updateNote: { description: "Edit a note's body" },
  deleteNote: { description: "Delete a note" },
  listNotes: { description: "List notes" },
  createTask: { description: "Create a task with a due date", recommended: true },
  getTask: { description: "Read one task by ID" },
  updateTask: { description: "Update a task's status or details" },
  deleteTask: { description: "Delete a task" },
  listTasks: { description: "List tasks" },
  associateObjects: { description: "Link two records (e.g. contact to deal)" },
  disassociateObjects: { description: "Remove a link between two records" },
  listAssociations: { description: "List the records linked to a record" },
  listPipelines: { description: "List pipelines and their stages" },
  listOwners: { description: "List owners (users) in the account" },
  getOwner: { description: "Read one owner by ID" },
  listProperties: { description: "List an object type's property definitions" },
  addToList: { description: "Add contacts to a static list" },
  removeFromList: { description: "Remove contacts from a static list" },
  getList: { description: "Read one list's details" },
};

export async function run(config, deps) {
  const operation = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[operation];
  if (!handler) throw new Error(`HubSpot: Unknown operation "${operation}".`);
  try {
    return await handler(config, deps);
  } catch (err) {
    handleError(err);
  }
}
