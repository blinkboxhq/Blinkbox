/**
 * Calendly — Users, Organization, Memberships & Invitations.
 */
import { need, me, pageParams, uuidOf } from "../GenericFunctions.js";

async function opGetUser(config, { api }) {
  if (config.userUri) {
    const { data } = await api.get(`/users/${uuidOf(config.userUri)}`);
    return { success: true, ...data.resource };
  }
  return { success: true, ...(await me(api)) };
}

async function opGetCurrentOrganization(config, { api }) {
  const u = await me(api);
  return { success: true, organization: u.current_organization, user: u.uri };
}

async function opListOrganizationMemberships(config, { api }) {
  const u = await me(api);
  const params = { organization: config.organizationUri || u.current_organization, ...pageParams(config) };
  if (config.email) params.email = config.email;
  const { data } = await api.get("/organization_memberships", { params });
  return { success: true, memberships: data.collection, pagination: data.pagination };
}

async function opGetOrganizationMembership(config, { api }) {
  const g = need(config, "membershipUri", "getOrganizationMembership"); if (g) return g;
  const { data } = await api.get(`/organization_memberships/${uuidOf(config.membershipUri)}`);
  return { success: true, ...data.resource };
}

async function opRemoveOrganizationMembership(config, { api }) {
  const g = need(config, "membershipUri", "removeOrganizationMembership"); if (g) return g;
  await api.delete(`/organization_memberships/${uuidOf(config.membershipUri)}`);
  return { success: true, removed: config.membershipUri };
}

async function opListOrganizationInvitations(config, { api }) {
  const u = await me(api);
  const org = config.organizationUri || u.current_organization;
  const params = pageParams(config);
  if (config.status) params.status = config.status;
  const { data } = await api.get(`/organizations/${uuidOf(org)}/invitations`, { params });
  return { success: true, invitations: data.collection, pagination: data.pagination };
}

async function opInviteUser(config, { api }) {
  const g = need(config, "email", "inviteUser"); if (g) return g;
  const u = await me(api);
  const org = config.organizationUri || u.current_organization;
  const { data } = await api.post(`/organizations/${uuidOf(org)}/invitations`, { email: config.email });
  return { success: true, ...data.resource };
}

async function opRevokeInvitation(config, { api }) {
  const g = need(config, "invitationUri", "revokeInvitation"); if (g) return g;
  const org = config.organizationUri || (await me(api)).current_organization;
  await api.delete(`/organizations/${uuidOf(org)}/invitations/${uuidOf(config.invitationUri)}`);
  return { success: true, revoked: config.invitationUri };
}

export const userOperations = {
  getUser: opGetUser,
  getCurrentOrganization: opGetCurrentOrganization,
  listOrganizationMemberships: opListOrganizationMemberships,
  getOrganizationMembership: opGetOrganizationMembership,
  removeOrganizationMembership: opRemoveOrganizationMembership,
  listOrganizationInvitations: opListOrganizationInvitations,
  inviteUser: opInviteUser,
  revokeInvitation: opRevokeInvitation,
};
