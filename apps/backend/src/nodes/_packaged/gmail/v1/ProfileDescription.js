/**
 * Gmail — account profile. Handlers receive `(config, token)`.
 */
import axios from "axios";
import { BASE, auth } from "../GenericFunctions.js";

async function opGetProfile(config, token) {
  const response = await axios.get(`${BASE}/profile`, { headers: auth(token), timeout: 10000 });
  return {
    emailAddress: response.data.emailAddress,
    messagesTotal: response.data.messagesTotal,
    threadsTotal: response.data.threadsTotal,
    historyId: response.data.historyId,
  };
}

export const profileOperations = {
  getProfile: opGetProfile,
};
