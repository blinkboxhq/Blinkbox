/**
 * LinkedIn — Organization (Company Page) resource. Company lookup by ID
 * (getCompany preserved verbatim) or vanity name, the pages the authenticated
 * member administers (organizationAcls), and follower/share statistics.
 * Requires organization scopes (r_organization_social, rw_organization_admin).
 * Handlers receive the raw bearer token: (config, token).
 */
import axios from "axios";
import { BASE, headers, localized } from "../GenericFunctions.js";

async function opGetCompany(config, token) {
  const id = config.companyId;
  if (!id) return { success: false, error: "LinkedIn getCompany: 'companyId' is required.", skipped: true };
  const { data } = await axios.get(
    `${BASE}/organizations/${encodeURIComponent(id)}?projection=(id,name,vanityName,description,websiteUrl,logoV2)`,
    { headers: headers(token), timeout: 120000 },
  );
  const name = data.name?.localized?.en_US || Object.values(data.name?.localized || {})[0] || "";
  return {
    id: data.id,
    name,
    vanityName: data.vanityName || null,
    description: data.description?.localized?.en_US || null,
    websiteUrl: data.websiteUrl || null,
  };
}

async function opGetCompanyByName(config, token) {
  const vanity = config.vanityName || config.name;
  if (!vanity) return { success: false, error: "LinkedIn getCompanyByName: 'vanityName' is required.", skipped: true };
  const { data } = await axios.get(
    `${BASE}/organizations?q=vanityName&vanityName=${encodeURIComponent(vanity)}`,
    { headers: headers(token), timeout: 120000 },
  );
  const org = data.elements?.[0];
  if (!org) return { success: false, error: `LinkedIn getCompanyByName: no organization found for "${vanity}".`, skipped: true };
  return {
    id: org.id,
    name: localized(org.name),
    vanityName: org.vanityName || null,
    description: localized(org.description) || null,
    websiteUrl: org.websiteUrl || null,
  };
}

async function opListAdministeredOrgs(config, token) {
  const { data } = await axios.get(
    `${BASE}/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&projection=(elements*(organization~(id,localizedName,vanityName)))`,
    { headers: headers(token), timeout: 120000 },
  );
  const orgs = (data.elements || []).map((el) => {
    const o = el["organization~"] || {};
    return { id: o.id, name: o.localizedName || null, vanityName: o.vanityName || null, urn: el.organization };
  });
  return { organizations: orgs, count: orgs.length };
}

async function opGetFollowerCount(config, token) {
  if (!config.orgId) return { success: false, error: "LinkedIn getFollowerCount: 'orgId' is required.", skipped: true };
  const orgId = String(config.orgId).replace(/^urn:li:organization:/, "");
  const orgUrn = encodeURIComponent(`urn:li:organization:${orgId}`);
  const { data } = await axios.get(
    `${BASE}/networkSizes/${orgUrn}?edgeType=CompanyFollowedByMember`,
    { headers: headers(token), timeout: 120000 },
  );
  return { orgId, followerCount: data.firstDegreeSize ?? null };
}

async function opGetShareStatistics(config, token) {
  if (!config.orgId) return { success: false, error: "LinkedIn getShareStatistics: 'orgId' is required.", skipped: true };
  const orgId = String(config.orgId).replace(/^urn:li:organization:/, "");
  const orgUrn = encodeURIComponent(`urn:li:organization:${orgId}`);
  const { data } = await axios.get(
    `${BASE}/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${orgUrn}`,
    { headers: headers(token), timeout: 120000 },
  );
  const el = data.elements?.[0]?.totalShareStatistics || {};
  return {
    orgId,
    impressionCount: el.impressionCount ?? 0,
    clickCount: el.clickCount ?? 0,
    likeCount: el.likeCount ?? 0,
    commentCount: el.commentCount ?? 0,
    shareCount: el.shareCount ?? 0,
    engagement: el.engagement ?? null,
  };
}

export const organizationOperations = {
  getCompany: opGetCompany,
  getCompanyByName: opGetCompanyByName,
  listAdministeredOrgs: opListAdministeredOrgs,
  getFollowerCount: opGetFollowerCount,
  getShareStatistics: opGetShareStatistics,
};
