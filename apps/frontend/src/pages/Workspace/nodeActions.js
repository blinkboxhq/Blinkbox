// Per-node action list — shown in AddNodeSidebar two-step picker
// Each entry: { name, description, icon?, value? }
//
// App, database, data and infra nodes are NOT listed by hand: their actions are
// derived from the same operation list their config panel renders, so the picker
// can never offer an action the panel doesn't know how to run.

import { opsFromMeta } from "@nodes/metaOps.js";
import meta_github from "@nodes/github/meta.js";
import meta_sentry from "@nodes/sentry/meta.js";
import meta_vercel from "@nodes/vercel/meta.js";
import meta_netlify from "@nodes/netlify/meta.js";
import meta_pagerduty from "@nodes/pagerduty/meta.js";
import meta_datadog from "@nodes/datadog/meta.js";
import meta_ssh from "@nodes/ssh/meta.js";
import meta_sftp from "@nodes/sftp/meta.js";
import meta_s3 from "@nodes/s3/meta.js";
import meta_email_parser from "@nodes/email_parser/meta.js";
import meta_elevenlabs from "@nodes/elevenlabs/meta.js";

import { OPERATIONS as ops_gitlab } from "@nodes/gitlab/ConfigPanel.jsx";
import { OPERATIONS as ops_azure_devops } from "@nodes/azure_devops/ConfigPanel.jsx";

import { OPERATIONS as ops_telegram } from "@nodes/telegram/ConfigPanel.jsx";
import { OPERATIONS as ops_whatsapp } from "@nodes/whatsapp/ConfigPanel.jsx";
import { OPERATIONS as ops_slack } from "@nodes/slack/ConfigPanel.jsx";
import { OPERATIONS as ops_discord } from "@nodes/discord/ConfigPanel.jsx";
import { OPERATIONS as ops_gmail } from "@nodes/gmail/ConfigPanel.jsx";
import { OPERATIONS as ops_twilio } from "@nodes/twilio/ConfigPanel.jsx";
import { OPERATIONS as ops_sendgrid } from "@nodes/sendgrid/ConfigPanel.jsx";
import { OPERATIONS as ops_airtable } from "@nodes/airtable/ConfigPanel.jsx";
import { OPERATIONS as ops_google_sheets } from "@nodes/google_sheets/ConfigPanel.jsx";
import { OPERATIONS as ops_notion } from "@nodes/notion/ConfigPanel.jsx";
import { OPERATIONS as ops_google_calendar } from "@nodes/google_calendar/ConfigPanel.jsx";
import { OPERATIONS as ops_google_drive } from "@nodes/google_drive/ConfigPanel.jsx";
import { OPERATIONS as ops_jira } from "@nodes/jira/ConfigPanel.jsx";
import { OPERATIONS as ops_linear } from "@nodes/linear/ConfigPanel.jsx";
import { OPERATIONS as ops_stripe } from "@nodes/stripe/ConfigPanel.jsx";
import { OPERATIONS as ops_hubspot } from "@nodes/hubspot/ConfigPanel.jsx";
import { OPERATIONS as ops_shopify } from "@nodes/shopify/ConfigPanel.jsx";
import { OPERATIONS as ops_resend } from "@nodes/resend/ConfigPanel.jsx";
import { OPERATIONS as ops_trello } from "@nodes/trello/ConfigPanel.jsx";
import { OPERATIONS as ops_asana } from "@nodes/asana/ConfigPanel.jsx";
import { OPERATIONS as ops_clickup } from "@nodes/clickup/ConfigPanel.jsx";
import { OPERATIONS as ops_monday } from "@nodes/monday/ConfigPanel.jsx";
import { OPERATIONS as ops_pipedrive } from "@nodes/pipedrive/ConfigPanel.jsx";
import { OPERATIONS as ops_intercom } from "@nodes/intercom/ConfigPanel.jsx";
import { OPERATIONS as ops_woocommerce } from "@nodes/woocommerce/ConfigPanel.jsx";
import { OPERATIONS as ops_typeform } from "@nodes/typeform/ConfigPanel.jsx";
import { OPERATIONS as ops_outlook } from "@nodes/outlook/ConfigPanel.jsx";
import { OPERATIONS as ops_teams } from "@nodes/teams/ConfigPanel.jsx";
import { OPERATIONS as ops_onedrive } from "@nodes/onedrive/ConfigPanel.jsx";
import { OPERATIONS as ops_sharepoint } from "@nodes/sharepoint/ConfigPanel.jsx";
import { OPERATIONS as ops_google_docs } from "@nodes/google_docs/ConfigPanel.jsx";
import { OPERATIONS as ops_google_forms } from "@nodes/google_forms/ConfigPanel.jsx";
import { OPERATIONS as ops_zendesk } from "@nodes/zendesk/ConfigPanel.jsx";
import { OPERATIONS as ops_calendly } from "@nodes/calendly/ConfigPanel.jsx";
import { OPERATIONS as ops_mailchimp } from "@nodes/mailchimp/ConfigPanel.jsx";
import { OPERATIONS as ops_figma } from "@nodes/figma/ConfigPanel.jsx";
import { OPERATIONS as ops_reddit } from "@nodes/reddit/ConfigPanel.jsx";
import { OPERATIONS as ops_instagram } from "@nodes/instagram/ConfigPanel.jsx";
import { OPERATIONS as ops_tiktok } from "@nodes/tiktok/ConfigPanel.jsx";
import { OPERATIONS as ops_linkedin } from "@nodes/linkedin/ConfigPanel.jsx";
import { OPERATIONS as ops_zoom } from "@nodes/zoom/ConfigPanel.jsx";

import { OPERATIONS as ops_postgres } from "@nodes/postgres/ConfigPanel.jsx";
import { OPERATIONS as ops_supabase } from "@nodes/supabase/ConfigPanel.jsx";
import { OPERATIONS as ops_mongodb } from "@nodes/mongodb/ConfigPanel.jsx";
import { OPERATIONS as ops_redis } from "@nodes/redis/ConfigPanel.jsx";
import { OPERATIONS as ops_firebase } from "@nodes/firebase/ConfigPanel.jsx";
import { OPERATIONS as ops_pinecone } from "@nodes/pinecone/ConfigPanel.jsx";

import { OPERATIONS as ops_csv_parser } from "@nodes/csv_parser/ConfigPanel.jsx";
import { OPERATIONS as ops_date_time } from "@nodes/date_time/ConfigPanel.jsx";
import { OPERATIONS as ops_crypto_utils } from "@nodes/crypto_utils/ConfigPanel.jsx";
import { OPERATIONS as ops_text_format } from "@nodes/text_format/ConfigPanel.jsx";
import { OPERATIONS as ops_regex_match } from "@nodes/regex_match/ConfigPanel.jsx";
import { OPERATIONS as ops_json_transform } from "@nodes/json_transform/ConfigPanel.jsx";
import { OPERATIONS as ops_variable_set_get } from "@nodes/variable_set_get/ConfigPanel.jsx";
import { OPERATIONS as ops_data_mapper } from "@nodes/data_mapper/ConfigPanel.jsx";

import { OPERATIONS as ops_openai } from "@nodes/openai/ConfigPanel.jsx";
import { OPERATIONS as ops_anthropic } from "@nodes/anthropic/ConfigPanel.jsx";
import { OPERATIONS as ops_gemini } from "@nodes/gemini/ConfigPanel.jsx";
import { OPERATIONS as ops_perplexity } from "@nodes/perplexity/ConfigPanel.jsx";
import { OPERATIONS as ops_xai } from "@nodes/xai/ConfigPanel.jsx";
import { OPERATIONS as ops_deepseek } from "@nodes/deepseek/ConfigPanel.jsx";
import { OPERATIONS as ops_nvidia_nim } from "@nodes/nvidia_nim/ConfigPanel.jsx";
import { OPERATIONS as ops_moonshot } from "@nodes/moonshot/ConfigPanel.jsx";
import { OPERATIONS as ops_openrouter } from "@nodes/openrouter/ConfigPanel.jsx";
import { OPERATIONS as ops_zai } from "@nodes/zai/ConfigPanel.jsx";
import { OPERATIONS as ops_minimax } from "@nodes/minimax/ConfigPanel.jsx";
import { OPERATIONS as ops_sakana } from "@nodes/sakana/ConfigPanel.jsx";

const AI_OPERATIONS = {
  openai: ops_openai,
  anthropic: ops_anthropic,
  gemini: ops_gemini,
  perplexity: ops_perplexity,
  xai: ops_xai,
  deepseek: ops_deepseek,
  nvidia_nim: ops_nvidia_nim,
  moonshot: ops_moonshot,
  openrouter: ops_openrouter,
  zai: ops_zai,
  minimax: ops_minimax,
  sakana: ops_sakana,
};

const APP_OPERATIONS = {
  telegram: ops_telegram,
  whatsapp: ops_whatsapp,
  slack: ops_slack,
  discord: ops_discord,
  gmail: ops_gmail,
  twilio: ops_twilio,
  sendgrid: ops_sendgrid,
  airtable: ops_airtable,
  google_sheets: ops_google_sheets,
  notion: ops_notion,
  google_calendar: ops_google_calendar,
  google_drive: ops_google_drive,
  jira: ops_jira,
  linear: ops_linear,
  stripe: ops_stripe,
  hubspot: ops_hubspot,
  shopify: ops_shopify,
  resend: ops_resend,
  trello: ops_trello,
  asana: ops_asana,
  clickup: ops_clickup,
  monday: ops_monday,
  pipedrive: ops_pipedrive,
  intercom: ops_intercom,
  woocommerce: ops_woocommerce,
  typeform: ops_typeform,
  outlook: ops_outlook,
  teams: ops_teams,
  onedrive: ops_onedrive,
  sharepoint: ops_sharepoint,
  google_docs: ops_google_docs,
  google_forms: ops_google_forms,
  zendesk: ops_zendesk,
  calendly: ops_calendly,
  mailchimp: ops_mailchimp,
  figma: ops_figma,
  reddit: ops_reddit,
  instagram: ops_instagram,
  tiktok: ops_tiktok,
  linkedin: ops_linkedin,
  zoom: ops_zoom,

};

const DB_OPERATIONS = {
  postgres: ops_postgres,
  supabase: ops_supabase,
  mongodb: ops_mongodb,
  redis_node: ops_redis,
  firebase: ops_firebase,
  pinecone: ops_pinecone,
};

const DATA_OPERATIONS = {
  csv_parser: ops_csv_parser,
  date_time: ops_date_time,
  crypto_utils: ops_crypto_utils,
  text_format: ops_text_format,
  regex_match: ops_regex_match,
  json_transform: ops_json_transform,
  variable_set_get: ops_variable_set_get,
  data_mapper: ops_data_mapper,
};

// Infra nodes read their action list from the same meta their SchemaForm panel
// renders, so the picker can never offer an operation the panel has no fields for.
const INFRA_OPERATIONS = {
  github: opsFromMeta(meta_github),
  sentry: opsFromMeta(meta_sentry),
  vercel: opsFromMeta(meta_vercel),
  netlify: opsFromMeta(meta_netlify),
  pagerduty: opsFromMeta(meta_pagerduty),
  datadog: opsFromMeta(meta_datadog),
  ssh: opsFromMeta(meta_ssh),
  sftp: opsFromMeta(meta_sftp),
  s3: opsFromMeta(meta_s3),
  email_parser: opsFromMeta(meta_email_parser),
  elevenlabs: opsFromMeta(meta_elevenlabs),
  gitlab: ops_gitlab,
  azure_devops: ops_azure_devops,
};

const derive = (source) =>
  Object.fromEntries(
    Object.entries(source).map(([key, ops]) => [
      key,
      ops.map((o) => ({ name: o.label, value: o.value, description: o.desc || o.group || "", icon: o.icon })),
    ]),
  );

const AI_ACTIONS = derive(AI_OPERATIONS);
const APP_ACTIONS = derive(APP_OPERATIONS);
const DB_ACTIONS = derive(DB_OPERATIONS);
const DATA_ACTIONS = derive(DATA_OPERATIONS);
const INFRA_ACTIONS = derive(INFRA_OPERATIONS);

// Categories whose nodes pick an action inside the config panel dropdown.
// Anything else with a NODE_ACTIONS entry uses the sidebar's two-step picker.
export const ACTION_PICKER_CATEGORIES = ["ai_models", "apps", "databases", "data", "infra"];

// Categories where a node is one node, one job — never an action picker,
// in the sidebar or the panel.
export const NO_ACTION_CATEGORIES = ["logic"];

export const nodeHasActions = (category, key) =>
  !NO_ACTION_CATEGORIES.includes(category) && (NODE_ACTIONS[key]?.length ?? 0) > 0;

// Every action here is derived from a real ConfigPanel OPERATIONS list or node
// meta, so the picker can never offer an action the panel can't actually run.
export const NODE_ACTIONS = { ...AI_ACTIONS, ...APP_ACTIONS, ...DB_ACTIONS, ...DATA_ACTIONS, ...INFRA_ACTIONS };
