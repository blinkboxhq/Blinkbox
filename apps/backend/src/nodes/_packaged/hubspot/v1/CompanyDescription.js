/**
 * HubSpot — Company resource. CRUD + search, preserved verbatim. Handlers
 * receive (config, { api }).
 */
import {
  need, props, createObject, getObject, updateObject, deleteObject, listObjects, searchObjects,
} from "../GenericFunctions.js";

export const COMPANY_MAP = {
  companyName: "name", domain: "domain", phone: "phone", city: "city", country: "country",
  industry: "industry", website: "website", numEmployees: "numberofemployees", ownerId: "hubspot_owner_id",
};

function opCreateCompany(c, { api }) {
  const e = need(c, "companyName", "createCompany"); if (e) return e;
  return createObject(api, "companies", props(c, COMPANY_MAP));
}
function opGetCompany(c, { api }) {
  const e = need(c, "companyId", "getCompany"); if (e) return e;
  return getObject(api, "companies", c.companyId);
}
function opUpdateCompany(c, { api }) {
  const e = need(c, "companyId", "updateCompany"); if (e) return e;
  return updateObject(api, "companies", c.companyId, props(c, COMPANY_MAP));
}
function opDeleteCompany(c, { api }) {
  const e = need(c, "companyId", "deleteCompany"); if (e) return e;
  return deleteObject(api, "companies", c.companyId);
}
const opListCompanies = (c, { api }) => listObjects(api, "companies", c);
const opSearchCompanies = (c, { api }) => searchObjects(api, "companies", c);

export const companyOperations = {
  createCompany: opCreateCompany,
  getCompany: opGetCompany,
  updateCompany: opUpdateCompany,
  deleteCompany: opDeleteCompany,
  listCompanies: opListCompanies,
  searchCompanies: opSearchCompanies,
};
