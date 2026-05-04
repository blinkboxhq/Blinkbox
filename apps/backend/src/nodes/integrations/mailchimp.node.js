import axios from "axios";
import { resolveCredential } from "../../utils/resolveCredential.js";
import { decrypt } from "../../utils/crypto.js";

export default {
  async run(config, input, context = {}) {
    const operation = config.operation || "listCampaigns";
    let apiKey;
    if (config.credentialId) {
      const cred = await resolveCredential(config.credentialId, context.workspaceId, "Mailchimp");
      apiKey = decrypt(cred.encryptedData, cred.iv, cred.authTag);
    }
    if (!apiKey) return { success: false, error: "Mailchimp: API key required.", skipped: true };

    // Mailchimp datacenter is in the API key after the dash
    const dc = apiKey.split("-").pop();
    const BASE = `https://${dc}.api.mailchimp.com/3.0`;
    const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };

    switch (operation) {
      case "listCampaigns": {
        const { data } = await axios.get(`${BASE}/campaigns?count=${config.limit || 25}&offset=${config.offset || 0}&status=${config.status || ""}`, { headers, timeout: 15000 });
        return { campaigns: data.campaigns, total: data.total_items };
      }
      case "getCampaign": {
        const id = config.campaignId || input.campaignId;
        if (!id) return { success: false, error: "Mailchimp getCampaign: 'campaignId' required.", skipped: true };
        const { data } = await axios.get(`${BASE}/campaigns/${id}`, { headers, timeout: 10000 });
        return data;
      }
      case "sendCampaign": {
        const id = config.campaignId || input.campaignId;
        if (!id) return { success: false, error: "Mailchimp sendCampaign: 'campaignId' required.", skipped: true };
        await axios.post(`${BASE}/campaigns/${id}/actions/send`, {}, { headers, timeout: 10000 });
        return { success: true, campaignId: id, sent: true };
      }
      case "listSubscribers": {
        const listId = config.listId || input.listId;
        if (!listId) return { success: false, error: "Mailchimp listSubscribers: 'listId' required.", skipped: true };
        const { data } = await axios.get(`${BASE}/lists/${listId}/members?count=${config.limit || 50}&status=${config.status || "subscribed"}`, { headers, timeout: 15000 });
        return { members: data.members, total: data.total_items };
      }
      case "addSubscriber": {
        const listId = config.listId || input.listId;
        const email = config.email || input.email;
        if (!listId || !email) return { success: false, error: "Mailchimp addSubscriber: 'listId' and 'email' required.", skipped: true };
        const body = { email_address: email, status: config.status || "subscribed", merge_fields: {} };
        if (config.firstName) body.merge_fields.FNAME = config.firstName;
        if (config.lastName) body.merge_fields.LNAME = config.lastName;
        const { data } = await axios.post(`${BASE}/lists/${listId}/members`, body, { headers, timeout: 10000 });
        return { id: data.id, email: data.email_address, status: data.status };
      }
      case "updateSubscriber": {
        const listId = config.listId || input.listId;
        const email = config.email || input.email;
        if (!listId || !email) return { success: false, error: "Mailchimp updateSubscriber: 'listId' and 'email' required.", skipped: true };
        const hash = email.toLowerCase().replace(/\s/g, "");
        const md5 = (await import("crypto")).createHash("md5").update(hash).digest("hex");
        const body = {};
        if (config.status) body.status = config.status;
        const merge = {};
        if (config.firstName) merge.FNAME = config.firstName;
        if (config.lastName) merge.LNAME = config.lastName;
        if (Object.keys(merge).length) body.merge_fields = merge;
        const { data } = await axios.patch(`${BASE}/lists/${listId}/members/${md5}`, body, { headers, timeout: 10000 });
        return { id: data.id, email: data.email_address, status: data.status };
      }
      case "listAudiences": {
        const { data } = await axios.get(`${BASE}/lists?count=${config.limit || 25}`, { headers, timeout: 10000 });
        return { lists: data.lists, total: data.total_items };
      }
      default:
        return { success: false, error: `Mailchimp: Unknown operation "${operation}".`, skipped: true };
    }
  },
};
