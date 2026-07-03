/**
 * LinkedIn — Profile & People resource. The authenticated member's profile
 * (getProfile & getConnections preserved verbatim), the OpenID userinfo view,
 * and the member's primary email address. Handlers receive the raw bearer
 * token: (config, token).
 */
import axios from "axios";
import { BASE, headers, boundCount, localized } from "../GenericFunctions.js";

async function opGetProfile(config, token) {
  const { data } = await axios.get(
    `${BASE}/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams),vanityName)`,
    { headers: headers(token), timeout: 10000 },
  );
  const firstName = data.firstName?.localized?.en_US || Object.values(data.firstName?.localized || {})[0] || "";
  const lastName = data.lastName?.localized?.en_US || Object.values(data.lastName?.localized || {})[0] || "";
  return {
    id: data.id,
    name: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    vanityName: data.vanityName || null,
  };
}

/** OpenID Connect userinfo — works with the modern 'openid profile' scopes. */
async function opGetUserInfo(config, token) {
  const { data } = await axios.get(`${BASE}/userinfo`, { headers: headers(token), timeout: 10000 });
  return {
    sub: data.sub,
    name: data.name,
    givenName: data.given_name,
    familyName: data.family_name,
    picture: data.picture || null,
    email: data.email || null,
    emailVerified: data.email_verified ?? null,
    locale: data.locale || null,
  };
}

async function opGetEmail(config, token) {
  const { data } = await axios.get(
    `${BASE}/emailAddress?q=members&projection=(elements*(handle~))`,
    { headers: headers(token), timeout: 10000 },
  );
  const email = data.elements?.[0]?.["handle~"]?.emailAddress || null;
  if (!email) return { success: false, error: "LinkedIn getEmail: no email returned — check the r_emailaddress scope.", skipped: true };
  return { email };
}

async function opGetConnections(config, token) {
  const count = boundCount(config.limit, 50, 500);
  const { data } = await axios.get(
    `${BASE}/connections?q=viewer&start=0&count=${count}&projection=(elements*(id,firstName,lastName,headline))`,
    { headers: headers(token), timeout: 15000 },
  );
  const connections = (data.elements || []).map((el) => ({
    id: el.id,
    firstName: el.firstName?.localized?.en_US || Object.values(el.firstName?.localized || {})[0] || "",
    lastName: el.lastName?.localized?.en_US || Object.values(el.lastName?.localized || {})[0] || "",
    headline: el.headline?.localized?.en_US || Object.values(el.headline?.localized || {})[0] || "",
  }));
  return { connections, total: data.paging?.total ?? connections.length };
}

export const profileOperations = {
  getProfile: opGetProfile,
  getUserInfo: opGetUserInfo,
  getEmail: opGetEmail,
  getConnections: opGetConnections,
};
