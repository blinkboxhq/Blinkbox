/**
 * HubSpot — Ticket resource. CRUD (preserved verbatim) plus search for parity
 * with the other CRM objects. Handlers receive (config, { api }).
 */
import {
  need, props, createObject, getObject, updateObject, deleteObject, listObjects, searchObjects,
} from "../GenericFunctions.js";

export const TICKET_MAP = {
  subject: "subject", content: "content", pipeline: "hs_pipeline", stage: "hs_pipeline_stage",
  priority: "hs_ticket_priority", ownerId: "hubspot_owner_id",
};

function opCreateTicket(c, { api }) {
  const e = need(c, "subject", "createTicket"); if (e) return e;
  return createObject(api, "tickets", props(c, TICKET_MAP));
}
function opGetTicket(c, { api }) {
  const e = need(c, "ticketId", "getTicket"); if (e) return e;
  return getObject(api, "tickets", c.ticketId);
}
function opUpdateTicket(c, { api }) {
  const e = need(c, "ticketId", "updateTicket"); if (e) return e;
  return updateObject(api, "tickets", c.ticketId, props(c, TICKET_MAP));
}
function opDeleteTicket(c, { api }) {
  const e = need(c, "ticketId", "deleteTicket"); if (e) return e;
  return deleteObject(api, "tickets", c.ticketId);
}
const opListTickets = (c, { api }) => listObjects(api, "tickets", c);
const opSearchTickets = (c, { api }) => searchObjects(api, "tickets", c);

export const ticketOperations = {
  createTicket: opCreateTicket,
  getTicket: opGetTicket,
  updateTicket: opUpdateTicket,
  deleteTicket: opDeleteTicket,
  listTickets: opListTickets,
  searchTickets: opSearchTickets,
};
