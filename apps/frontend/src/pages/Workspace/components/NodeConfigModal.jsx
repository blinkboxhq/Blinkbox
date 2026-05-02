import { useEffect, useCallback, useRef, useState } from "react";
import { X, ChevronDown, Settings2, Play, CheckCircle, XCircle, Loader, Hash, Box, ToggleLeft, ListOrdered, Type, HelpCircle, Braces } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry } from "../nodeRegistry";
import { TRIGGER_VARIANTS } from "../triggerVariants";
import { DEFAULT_SCHEMAS } from "../../../store/schemaEngine";
import { NODE_DOCS } from "../../../lib/nodeDocumentation";
import api from "../../../lib/api";

// ── Per-trigger output variable schemas ──────────────────────────────────────
const TRIGGER_OUTPUT_SCHEMA = {
  manual: [
    { path: "$trigger.body",              type: "object",  note: "Full payload POSTed to the run endpoint" },
    { path: "$trigger.body.<field>",      type: "any",     note: "Any top-level field from the payload" },
    { path: "$trigger.triggeredAt",       type: "string",  note: "ISO timestamp when the run was initiated" },
    { path: "$trigger.source",            type: "string",  note: "'manual' | 'api' | 'sdk'" },
    { path: "$trigger.executionId",       type: "string",  note: "Unique ID for this execution run" },
    { path: "$trigger.automationId",      type: "string",  note: "ID of the automation being run" },
    { path: "$trigger.userId",            type: "string",  note: "ID of the user who triggered the run" },
    { path: "$trigger.workspaceId",       type: "string",  note: "Workspace the automation belongs to" },
    { path: "$trigger.testMode",          type: "boolean", note: "true when triggered from the Test button" },
    { path: "$trigger.ip",                type: "string",  note: "IP address of the request origin" },
    { path: "$trigger.userAgent",         type: "string",  note: "User-agent string of the caller" },
    { path: "$trigger.idempotencyKey",    type: "string",  note: "Idempotency key from request header" },
  ],

  webhook: [
    { path: "$trigger.body",              type: "object",  note: "Raw request body (JSON or form-encoded)" },
    { path: "$trigger.body.<field>",      type: "any",     note: "Any field from the JSON body" },
    { path: "$trigger.query",             type: "object",  note: "URL query string parameters" },
    { path: "$trigger.query.<param>",     type: "string",  note: "Any individual query param" },
    { path: "$trigger.headers",           type: "object",  note: "All incoming HTTP headers" },
    { path: "$trigger.headers.authorization", type: "string", note: "Authorization header value" },
    { path: "$trigger.headers.content-type", type: "string", note: "Content-Type of the request" },
    { path: "$trigger.method",            type: "string",  note: "HTTP verb: GET / POST / PUT / DELETE" },
    { path: "$trigger.path",              type: "string",  note: "URL path that was hit" },
    { path: "$trigger.ip",                type: "string",  note: "Client IP address" },
    { path: "$trigger.receivedAt",        type: "string",  note: "ISO timestamp of request arrival" },
    { path: "$trigger.webhookId",         type: "string",  note: "Internal webhook endpoint ID" },
    { path: "$trigger.rawBody",           type: "string",  note: "Raw unparsed request body string" },
    { path: "$trigger.params",            type: "object",  note: "URL path params if route has :variables" },
  ],

  chat: [
    { path: "$trigger.body.message",      type: "string",  note: "User's chat message text" },
    { path: "$trigger.body.sessionId",    type: "string",  note: "Conversation session / thread ID" },
    { path: "$trigger.body.userId",       type: "string",  note: "ID of the user sending the message" },
    { path: "$trigger.body.userName",     type: "string",  note: "Display name of the user" },
    { path: "$trigger.body.channel",      type: "string",  note: "Channel or interface name (web, slack…)" },
    { path: "$trigger.body.locale",       type: "string",  note: "BCP-47 locale of the user e.g. en-US" },
    { path: "$trigger.body.metadata",     type: "object",  note: "Custom metadata passed by the client" },
    { path: "$trigger.body.attachments",  type: "array",   note: "Files or images attached to the message" },
    { path: "$trigger.systemPrompt",      type: "string",  note: "System prompt configured in the trigger" },
    { path: "$trigger.history",           type: "array",   note: "Prior messages in this session" },
    { path: "$trigger.receivedAt",        type: "string",  note: "ISO timestamp of message receipt" },
    { path: "$trigger.body",              type: "object",  note: "Full raw chat payload" },
    { path: "$trigger.webhookId",         type: "string",  note: "Chat endpoint ID" },
  ],

  cron: [
    { path: "$trigger.firedAt",           type: "string",  note: "ISO timestamp when the job fired" },
    { path: "$trigger.schedule",          type: "string",  note: "Cron expression that triggered this run" },
    { path: "$trigger.timezone",          type: "string",  note: "Timezone the schedule runs in" },
    { path: "$trigger.runCount",          type: "number",  note: "Total times this schedule has fired" },
    { path: "$trigger.nextRunAt",         type: "string",  note: "ISO timestamp of the next scheduled run" },
    { path: "$trigger.prevRunAt",         type: "string",  note: "ISO timestamp of the previous run" },
    { path: "$trigger.executionId",       type: "string",  note: "Unique execution ID for this run" },
    { path: "$trigger.automationId",      type: "string",  note: "ID of the automation" },
    { path: "$trigger.automationName",    type: "string",  note: "Human name of the automation" },
    { path: "$trigger.day",               type: "number",  note: "Day of month (1–31)" },
    { path: "$trigger.month",             type: "number",  note: "Month number (1–12)" },
    { path: "$trigger.year",              type: "number",  note: "Full year e.g. 2025" },
    { path: "$trigger.hour",              type: "number",  note: "Hour (0–23) in configured timezone" },
    { path: "$trigger.minute",            type: "number",  note: "Minute (0–59)" },
    { path: "$trigger.weekday",           type: "string",  note: "Day name e.g. Monday" },
  ],

  email: [
    { path: "$trigger.body.from",         type: "string",  note: "Sender email address" },
    { path: "$trigger.body.fromName",     type: "string",  note: "Sender display name" },
    { path: "$trigger.body.to",           type: "string",  note: "Recipient address(es)" },
    { path: "$trigger.body.cc",           type: "string",  note: "CC address(es)" },
    { path: "$trigger.body.bcc",          type: "string",  note: "BCC address(es)" },
    { path: "$trigger.body.subject",      type: "string",  note: "Email subject line" },
    { path: "$trigger.body.text",         type: "string",  note: "Plain-text body" },
    { path: "$trigger.body.html",         type: "string",  note: "HTML body" },
    { path: "$trigger.body.messageId",    type: "string",  note: "SMTP Message-ID header" },
    { path: "$trigger.body.date",         type: "string",  note: "Date the email was sent (ISO)" },
    { path: "$trigger.body.attachments",  type: "array",   note: "List of attachment objects" },
    { path: "$trigger.body.replyTo",      type: "string",  note: "Reply-To header address" },
    { path: "$trigger.body.inReplyTo",    type: "string",  note: "Message-ID this is a reply to" },
    { path: "$trigger.body.headers",      type: "object",  note: "All raw email headers" },
    { path: "$trigger.body",              type: "object",  note: "Full parsed email payload" },
    { path: "$trigger.receivedAt",        type: "string",  note: "Server-side receipt timestamp" },
  ],

  imap: [
    { path: "$trigger.email.from",        type: "string",  note: "Sender address" },
    { path: "$trigger.email.fromName",    type: "string",  note: "Sender display name" },
    { path: "$trigger.email.to",          type: "string",  note: "Recipient address" },
    { path: "$trigger.email.cc",          type: "string",  note: "CC recipients" },
    { path: "$trigger.email.subject",     type: "string",  note: "Email subject" },
    { path: "$trigger.email.text",        type: "string",  note: "Plain-text body" },
    { path: "$trigger.email.html",        type: "string",  note: "HTML body" },
    { path: "$trigger.email.date",        type: "string",  note: "ISO date received" },
    { path: "$trigger.email.messageId",   type: "string",  note: "Unique SMTP message ID" },
    { path: "$trigger.email.uid",         type: "number",  note: "IMAP UID of the message" },
    { path: "$trigger.email.flags",       type: "array",   note: "IMAP flags e.g. \\Seen, \\Flagged" },
    { path: "$trigger.email.folder",      type: "string",  note: "Mailbox folder (INBOX, Sent…)" },
    { path: "$trigger.email.attachments", type: "array",   note: "List of attachment objects" },
    { path: "$trigger.email.labels",      type: "array",   note: "Labels applied to the message" },
    { path: "$trigger.email.size",        type: "number",  note: "Message size in bytes" },
    { path: "$trigger.email",             type: "object",  note: "Full email object" },
  ],

  rss: [
    { path: "$trigger.item.title",        type: "string",  note: "Article or entry title" },
    { path: "$trigger.item.link",         type: "string",  note: "URL to the full article" },
    { path: "$trigger.item.description",  type: "string",  note: "Excerpt or summary HTML" },
    { path: "$trigger.item.content",      type: "string",  note: "Full content:encoded body" },
    { path: "$trigger.item.pubDate",      type: "string",  note: "Publication date (ISO)" },
    { path: "$trigger.item.guid",         type: "string",  note: "Unique item identifier" },
    { path: "$trigger.item.author",       type: "string",  note: "Author name or email" },
    { path: "$trigger.item.categories",   type: "array",   note: "List of category tags" },
    { path: "$trigger.item.comments",     type: "string",  note: "URL to comments section" },
    { path: "$trigger.item.enclosure",    type: "object",  note: "Media enclosure (podcast audio etc.)" },
    { path: "$trigger.feed.title",        type: "string",  note: "Feed name / blog title" },
    { path: "$trigger.feed.url",          type: "string",  note: "Source RSS/Atom feed URL" },
    { path: "$trigger.feed.language",     type: "string",  note: "Feed language code e.g. en-US" },
    { path: "$trigger.item",              type: "object",  note: "Full feed item object" },
    { path: "$trigger.feed",              type: "object",  note: "Full feed metadata object" },
  ],

  database: [
    { path: "$trigger.row",               type: "object",  note: "Full new or updated row" },
    { path: "$trigger.row.<column>",      type: "any",     note: "Any column value by name" },
    { path: "$trigger.oldRow",            type: "object",  note: "Row state before the update" },
    { path: "$trigger.oldRow.<column>",   type: "any",     note: "Previous column value" },
    { path: "$trigger.operation",         type: "string",  note: "'INSERT' | 'UPDATE' | 'DELETE'" },
    { path: "$trigger.table",             type: "string",  note: "Table name that was watched" },
    { path: "$trigger.schema",            type: "string",  note: "Database schema name (e.g. public)" },
    { path: "$trigger.database",          type: "string",  note: "Database name or connection alias" },
    { path: "$trigger.primaryKey",        type: "any",     note: "Primary key value of the affected row" },
    { path: "$trigger.changedColumns",    type: "array",   note: "List of column names that changed" },
    { path: "$trigger.polledAt",          type: "string",  note: "ISO timestamp of the poll run" },
    { path: "$trigger.rowCount",          type: "number",  note: "Total rows returned by this poll" },
    { path: "$trigger.queryDurationMs",   type: "number",  note: "Time the poll query took in ms" },
  ],

  github: [
    { path: "$trigger.event",             type: "string",  note: "X-GitHub-Event header (push, pull_request…)" },
    { path: "$trigger.body.action",       type: "string",  note: "Event sub-action e.g. opened, closed" },
    { path: "$trigger.body.repository.full_name", type: "string", note: "owner/repo format" },
    { path: "$trigger.body.repository.html_url",  type: "string", note: "Web URL of the repository" },
    { path: "$trigger.body.repository.private",   type: "boolean", note: "true if private repo" },
    { path: "$trigger.body.sender.login", type: "string",  note: "GitHub username of the actor" },
    { path: "$trigger.body.sender.id",    type: "number",  note: "GitHub user ID of the actor" },
    { path: "$trigger.body.sender.avatar_url", type: "string", note: "Avatar image URL of the actor" },
    { path: "$trigger.body.ref",          type: "string",  note: "Git ref e.g. refs/heads/main (push events)" },
    { path: "$trigger.body.head_commit.message", type: "string", note: "Latest commit message (push)" },
    { path: "$trigger.body.head_commit.id",      type: "string", note: "Latest commit SHA (push)" },
    { path: "$trigger.body.pull_request.title",  type: "string", note: "PR title" },
    { path: "$trigger.body.pull_request.number", type: "number", note: "PR number" },
    { path: "$trigger.body.pull_request.html_url", type: "string", note: "PR web URL" },
    { path: "$trigger.body.pull_request.merged",   type: "boolean", note: "Whether the PR was merged" },
    { path: "$trigger.body.installation.id",   type: "number", note: "GitHub App installation ID" },
    { path: "$trigger.deliveryId",        type: "string",  note: "X-GitHub-Delivery header" },
    { path: "$trigger.body",              type: "object",  note: "Full raw GitHub event payload" },
  ],

  stripe: [
    { path: "$trigger.body.id",                       type: "string",  note: "Stripe event ID e.g. evt_123" },
    { path: "$trigger.body.type",                     type: "string",  note: "Event type e.g. payment_intent.succeeded" },
    { path: "$trigger.body.livemode",                 type: "boolean", note: "true = production, false = test" },
    { path: "$trigger.body.created",                  type: "number",  note: "Unix timestamp of event creation" },
    { path: "$trigger.body.data.object",              type: "object",  note: "The Stripe resource that changed" },
    { path: "$trigger.body.data.object.id",           type: "string",  note: "Resource ID (charge, invoice etc.)" },
    { path: "$trigger.body.data.object.amount",       type: "number",  note: "Amount in smallest currency unit (cents)" },
    { path: "$trigger.body.data.object.currency",     type: "string",  note: "ISO currency code e.g. usd" },
    { path: "$trigger.body.data.object.customer",     type: "string",  note: "Stripe customer ID" },
    { path: "$trigger.body.data.object.status",       type: "string",  note: "Resource status e.g. succeeded" },
    { path: "$trigger.body.data.object.receipt_email",type: "string",  note: "Customer email for receipt" },
    { path: "$trigger.body.data.object.metadata",     type: "object",  note: "Custom metadata on the resource" },
    { path: "$trigger.body.data.previous_attributes", type: "object",  note: "Fields that changed (update events)" },
    { path: "$trigger.body.account",                  type: "string",  note: "Connected account ID (if applicable)" },
    { path: "$trigger.body.api_version",              type: "string",  note: "Stripe API version used" },
    { path: "$trigger.body",                          type: "object",  note: "Full Stripe event object" },
  ],

  error: [
    { path: "$trigger.error.message",      type: "string",  note: "Error message from the failed node" },
    { path: "$trigger.error.nodeId",       type: "string",  note: "ID of the node that failed" },
    { path: "$trigger.error.nodeType",     type: "string",  note: "Type/backendType of the failed node" },
    { path: "$trigger.error.nodeLabel",    type: "string",  note: "Human label of the failed node" },
    { path: "$trigger.error.automationId", type: "string",  note: "Automation that failed" },
    { path: "$trigger.error.automationName",type: "string", note: "Human name of the automation" },
    { path: "$trigger.error.executionId",  type: "string",  note: "Execution run ID" },
    { path: "$trigger.error.failedAt",     type: "string",  note: "ISO timestamp of failure" },
    { path: "$trigger.error.attempt",      type: "number",  note: "Retry attempt number (1-based)" },
    { path: "$trigger.error.stack",        type: "string",  note: "Stack trace string" },
    { path: "$trigger.error.input",        type: "object",  note: "Input the node received before failing" },
    { path: "$trigger.error.previousOutput",type: "object", note: "Output of the node before the failed one" },
    { path: "$trigger.error",              type: "object",  note: "Full error context object" },
  ],

  telegram: [
    { path: "$trigger.message.text",              type: "string",  note: "Message text content" },
    { path: "$trigger.message.message_id",        type: "number",  note: "Unique message ID" },
    { path: "$trigger.message.date",              type: "number",  note: "Unix timestamp of the message" },
    { path: "$trigger.message.chat.id",           type: "number",  note: "Chat ID (positive=user, negative=group)" },
    { path: "$trigger.message.chat.type",         type: "string",  note: "'private' | 'group' | 'supergroup' | 'channel'" },
    { path: "$trigger.message.chat.title",        type: "string",  note: "Group/channel title (if applicable)" },
    { path: "$trigger.message.from.id",           type: "number",  note: "Sender's Telegram user ID" },
    { path: "$trigger.message.from.username",     type: "string",  note: "Sender's @username" },
    { path: "$trigger.message.from.first_name",   type: "string",  note: "Sender's first name" },
    { path: "$trigger.message.from.last_name",    type: "string",  note: "Sender's last name" },
    { path: "$trigger.message.from.is_bot",       type: "boolean", note: "true if sender is a bot" },
    { path: "$trigger.message.photo",             type: "array",   note: "Array of photo sizes if image sent" },
    { path: "$trigger.message.document",          type: "object",  note: "Document/file info if file sent" },
    { path: "$trigger.message.voice",             type: "object",  note: "Voice message info" },
    { path: "$trigger.message.location",          type: "object",  note: "lat/long if location shared" },
    { path: "$trigger.updateType",                type: "string",  note: "'message' | 'callback_query' | 'inline_query'" },
    { path: "$trigger.message",                   type: "object",  note: "Full message object" },
  ],

  slack: [
    { path: "$trigger.event.type",                type: "string",  note: "Event type e.g. message, app_mention" },
    { path: "$trigger.event.text",                type: "string",  note: "Message text (may contain mrkdwn)" },
    { path: "$trigger.event.user",                type: "string",  note: "Slack user ID of the sender" },
    { path: "$trigger.event.channel",             type: "string",  note: "Channel ID where it happened" },
    { path: "$trigger.event.channel_type",        type: "string",  note: "'channel' | 'im' | 'mpim' | 'group'" },
    { path: "$trigger.event.ts",                  type: "string",  note: "Message timestamp (also its ID)" },
    { path: "$trigger.event.thread_ts",           type: "string",  note: "Parent thread timestamp if a reply" },
    { path: "$trigger.event.files",               type: "array",   note: "Uploaded files in the message" },
    { path: "$trigger.event.blocks",              type: "array",   note: "Block Kit blocks in the message" },
    { path: "$trigger.team_id",                   type: "string",  note: "Slack workspace/team ID" },
    { path: "$trigger.api_app_id",                type: "string",  note: "Your Slack app's ID" },
    { path: "$trigger.event_id",                  type: "string",  note: "Unique delivery ID for this event" },
    { path: "$trigger.event_time",                type: "number",  note: "Unix timestamp of event" },
    { path: "$trigger.authorizations",            type: "array",   note: "Workspaces that installed the app" },
    { path: "$trigger.event",                     type: "object",  note: "Full Slack event object" },
  ],

  discord: [
    { path: "$trigger.content",                   type: "string",  note: "Message text content" },
    { path: "$trigger.id",                        type: "string",  note: "Discord message snowflake ID" },
    { path: "$trigger.channel_id",                type: "string",  note: "Channel snowflake ID" },
    { path: "$trigger.guild_id",                  type: "string",  note: "Server (guild) snowflake ID" },
    { path: "$trigger.author.id",                 type: "string",  note: "Author's Discord user ID" },
    { path: "$trigger.author.username",           type: "string",  note: "Author's username" },
    { path: "$trigger.author.discriminator",      type: "string",  note: "Author's 4-digit tag" },
    { path: "$trigger.author.bot",                type: "boolean", note: "true if sender is a bot" },
    { path: "$trigger.author.avatar",             type: "string",  note: "Author's avatar hash" },
    { path: "$trigger.mentions",                  type: "array",   note: "Users mentioned in the message" },
    { path: "$trigger.attachments",               type: "array",   note: "Uploaded files/images" },
    { path: "$trigger.embeds",                    type: "array",   note: "Rich embed objects" },
    { path: "$trigger.reactions",                 type: "array",   note: "Reactions on the message" },
    { path: "$trigger.timestamp",                 type: "string",  note: "ISO timestamp of the message" },
    { path: "$trigger.edited_timestamp",          type: "string",  note: "ISO timestamp of last edit (or null)" },
    { path: "$trigger.type",                      type: "number",  note: "Discord message type constant" },
    { path: "$trigger.message",                   type: "object",  note: "Full Discord message object" },
  ],

  whatsapp: [
    { path: "$trigger.from",                      type: "string",  note: "Sender's phone number (E.164)" },
    { path: "$trigger.to",                        type: "string",  note: "Recipient's phone number" },
    { path: "$trigger.body",                      type: "string",  note: "Message text body" },
    { path: "$trigger.messageId",                 type: "string",  note: "WhatsApp message ID (wamid.xxx)" },
    { path: "$trigger.timestamp",                 type: "string",  note: "Unix timestamp of the message" },
    { path: "$trigger.type",                      type: "string",  note: "'text' | 'image' | 'audio' | 'document' | 'location'" },
    { path: "$trigger.profileName",               type: "string",  note: "Sender's WhatsApp display name" },
    { path: "$trigger.image.id",                  type: "string",  note: "Media ID for images" },
    { path: "$trigger.image.mime_type",           type: "string",  note: "MIME type of the image" },
    { path: "$trigger.document.filename",         type: "string",  note: "Filename for document messages" },
    { path: "$trigger.location.latitude",         type: "number",  note: "Latitude (location messages)" },
    { path: "$trigger.location.longitude",        type: "number",  note: "Longitude (location messages)" },
    { path: "$trigger.context.from",              type: "string",  note: "Original sender if this is a reply" },
    { path: "$trigger.context.id",                type: "string",  note: "Message ID being replied to" },
    { path: "$trigger.phoneNumberId",             type: "string",  note: "Business phone number ID" },
    { path: "$trigger.displayPhoneNumber",        type: "string",  note: "Business phone number display" },
  ],

  gmail: [
    { path: "$trigger.email.id",                  type: "string",  note: "Gmail message ID" },
    { path: "$trigger.email.threadId",            type: "string",  note: "Gmail thread ID" },
    { path: "$trigger.email.from",                type: "string",  note: "Sender address" },
    { path: "$trigger.email.fromName",            type: "string",  note: "Sender display name" },
    { path: "$trigger.email.to",                  type: "string",  note: "Recipient address(es)" },
    { path: "$trigger.email.cc",                  type: "string",  note: "CC address(es)" },
    { path: "$trigger.email.subject",             type: "string",  note: "Email subject" },
    { path: "$trigger.email.snippet",             type: "string",  note: "Short preview snippet" },
    { path: "$trigger.email.body",                type: "string",  note: "Plain-text body" },
    { path: "$trigger.email.bodyHtml",            type: "string",  note: "HTML body" },
    { path: "$trigger.email.labels",              type: "array",   note: "Gmail label IDs applied" },
    { path: "$trigger.email.attachments",         type: "array",   note: "List of attachment objects" },
    { path: "$trigger.email.date",                type: "string",  note: "Received date ISO string" },
    { path: "$trigger.email.internalDate",        type: "string",  note: "Gmail internal timestamp ms" },
    { path: "$trigger.email.isUnread",            type: "boolean", note: "true if UNREAD label present" },
    { path: "$trigger.email.isStarred",           type: "boolean", note: "true if STARRED label present" },
    { path: "$trigger.email",                     type: "object",  note: "Full Gmail message object" },
  ],

  airtable: [
    { path: "$trigger.record.id",                 type: "string",  note: "Airtable record ID (recXXX)" },
    { path: "$trigger.record.fields",             type: "object",  note: "All field values of the record" },
    { path: "$trigger.record.fields.<FieldName>", type: "any",     note: "Any field by its exact name" },
    { path: "$trigger.record.createdTime",        type: "string",  note: "ISO timestamp record was created" },
    { path: "$trigger.baseId",                    type: "string",  note: "Airtable base ID (appXXX)" },
    { path: "$trigger.tableId",                   type: "string",  note: "Table ID (tblXXX)" },
    { path: "$trigger.tableName",                 type: "string",  note: "Human table name" },
    { path: "$trigger.event",                     type: "string",  note: "'create' | 'update' | 'delete'" },
    { path: "$trigger.changedFieldNames",         type: "array",   note: "Fields that changed (update events)" },
    { path: "$trigger.previousFieldValues",       type: "object",  note: "Field values before update" },
    { path: "$trigger.automationRunId",           type: "string",  note: "Airtable automation run ID" },
    { path: "$trigger.triggeredAt",               type: "string",  note: "ISO timestamp of trigger" },
    { path: "$trigger.record",                    type: "object",  note: "Full Airtable record object" },
  ],

  notion: [
    { path: "$trigger.page.id",                   type: "string",  note: "Notion page UUID" },
    { path: "$trigger.page.url",                  type: "string",  note: "Web URL to the Notion page" },
    { path: "$trigger.page.title",                type: "string",  note: "Plain text title of the page" },
    { path: "$trigger.page.created_time",         type: "string",  note: "ISO creation timestamp" },
    { path: "$trigger.page.last_edited_time",     type: "string",  note: "ISO last-edit timestamp" },
    { path: "$trigger.page.created_by.id",        type: "string",  note: "User ID who created the page" },
    { path: "$trigger.page.last_edited_by.id",    type: "string",  note: "User ID who last edited" },
    { path: "$trigger.page.parent.type",          type: "string",  note: "'database_id' | 'page_id' | 'workspace'" },
    { path: "$trigger.page.parent.database_id",   type: "string",  note: "Parent database ID" },
    { path: "$trigger.page.properties",           type: "object",  note: "All database properties" },
    { path: "$trigger.page.properties.<Prop>",    type: "any",     note: "Any property by name" },
    { path: "$trigger.page.archived",             type: "boolean", note: "true if page is archived" },
    { path: "$trigger.database.id",               type: "string",  note: "Parent database ID" },
    { path: "$trigger.event",                     type: "string",  note: "'created' | 'updated'" },
    { path: "$trigger.page",                      type: "object",  note: "Full Notion page object" },
  ],

  hubspot: [
    { path: "$trigger.objectId",                  type: "number",  note: "HubSpot object ID (contact, deal…)" },
    { path: "$trigger.objectType",                type: "string",  note: "'contact' | 'deal' | 'company' | 'ticket'" },
    { path: "$trigger.subscriptionType",          type: "string",  note: "e.g. contact.creation, deal.stageChange" },
    { path: "$trigger.changeFlag",                type: "string",  note: "Property name that changed" },
    { path: "$trigger.changeSource",              type: "string",  note: "Source of the change (CRM_UI, API…)" },
    { path: "$trigger.portalId",                  type: "number",  note: "HubSpot portal (account) ID" },
    { path: "$trigger.appId",                     type: "number",  note: "HubSpot App ID" },
    { path: "$trigger.occurredAt",                type: "string",  note: "ISO timestamp of the event" },
    { path: "$trigger.properties.email",          type: "string",  note: "Contact email (contact events)" },
    { path: "$trigger.properties.firstname",      type: "string",  note: "Contact first name" },
    { path: "$trigger.properties.lastname",       type: "string",  note: "Contact last name" },
    { path: "$trigger.properties.dealname",       type: "string",  note: "Deal name (deal events)" },
    { path: "$trigger.properties.dealstage",      type: "string",  note: "Deal pipeline stage ID" },
    { path: "$trigger.properties.amount",         type: "string",  note: "Deal value" },
    { path: "$trigger.properties",               type: "object",  note: "All object properties" },
  ],

  shopify: [
    { path: "$trigger.id",                        type: "number",  note: "Shopify resource ID" },
    { path: "$trigger.topic",                     type: "string",  note: "Webhook topic e.g. orders/create" },
    { path: "$trigger.order.id",                  type: "number",  note: "Order ID" },
    { path: "$trigger.order.order_number",        type: "number",  note: "Human order number e.g. 1001" },
    { path: "$trigger.order.email",               type: "string",  note: "Customer email" },
    { path: "$trigger.order.total_price",         type: "string",  note: "Order total as decimal string" },
    { path: "$trigger.order.currency",            type: "string",  note: "ISO currency code" },
    { path: "$trigger.order.financial_status",    type: "string",  note: "'paid' | 'pending' | 'refunded'" },
    { path: "$trigger.order.fulfillment_status",  type: "string",  note: "'fulfilled' | 'partial' | null" },
    { path: "$trigger.order.line_items",          type: "array",   note: "Line item objects" },
    { path: "$trigger.order.customer.id",         type: "number",  note: "Customer Shopify ID" },
    { path: "$trigger.order.customer.first_name", type: "string",  note: "Customer first name" },
    { path: "$trigger.order.shipping_address",    type: "object",  note: "Shipping address object" },
    { path: "$trigger.order.created_at",          type: "string",  note: "ISO timestamp order created" },
    { path: "$trigger.shop_domain",               type: "string",  note: "Shopify store domain" },
    { path: "$trigger.order",                     type: "object",  note: "Full Shopify order object" },
  ],

  linear: [
    { path: "$trigger.action",                    type: "string",  note: "'create' | 'update' | 'remove'" },
    { path: "$trigger.type",                      type: "string",  note: "Resource type e.g. Issue, Comment" },
    { path: "$trigger.data.id",                   type: "string",  note: "Resource UUID" },
    { path: "$trigger.data.identifier",           type: "string",  note: "Issue identifier e.g. ENG-123" },
    { path: "$trigger.data.title",                type: "string",  note: "Issue title" },
    { path: "$trigger.data.description",          type: "string",  note: "Issue description (markdown)" },
    { path: "$trigger.data.state.name",           type: "string",  note: "State label e.g. In Progress" },
    { path: "$trigger.data.state.type",           type: "string",  note: "'triage' | 'backlog' | 'started' | 'completed'" },
    { path: "$trigger.data.priority",             type: "number",  note: "Priority 0=none 1=urgent 2=high 3=medium 4=low" },
    { path: "$trigger.data.assignee.name",        type: "string",  note: "Assignee display name" },
    { path: "$trigger.data.assignee.email",       type: "string",  note: "Assignee email" },
    { path: "$trigger.data.team.name",            type: "string",  note: "Team name" },
    { path: "$trigger.data.labels",               type: "array",   note: "Applied label objects" },
    { path: "$trigger.data.url",                  type: "string",  note: "Direct link to the issue" },
    { path: "$trigger.data.createdAt",            type: "string",  note: "ISO creation timestamp" },
    { path: "$trigger.updatedFrom",               type: "object",  note: "Previous values before update" },
    { path: "$trigger.data",                      type: "object",  note: "Full resource data object" },
  ],

  typeform: [
    { path: "$trigger.form_id",                   type: "string",  note: "Typeform form ID" },
    { path: "$trigger.token",                     type: "string",  note: "Unique submission token" },
    { path: "$trigger.submitted_at",              type: "string",  note: "ISO timestamp of submission" },
    { path: "$trigger.landed_at",                 type: "string",  note: "ISO timestamp when respondent landed" },
    { path: "$trigger.respondent_id",             type: "string",  note: "Anonymous respondent ID" },
    { path: "$trigger.answers",                   type: "array",   note: "Array of answer objects" },
    { path: "$trigger.answers[0].field.ref",      type: "string",  note: "Field reference/slug" },
    { path: "$trigger.answers[0].text",           type: "string",  note: "Text answer value" },
    { path: "$trigger.answers[0].email",          type: "string",  note: "Email answer value" },
    { path: "$trigger.answers[0].number",         type: "number",  note: "Numeric answer value" },
    { path: "$trigger.answers[0].boolean",        type: "boolean", note: "Yes/no answer value" },
    { path: "$trigger.answers[0].choice.label",   type: "string",  note: "Selected choice label" },
    { path: "$trigger.hidden",                    type: "object",  note: "Hidden fields passed in the URL" },
    { path: "$trigger.variables",                 type: "object",  note: "Typeform variables at submission time" },
    { path: "$trigger.score",                     type: "number",  note: "Score field value (if used)" },
    { path: "$trigger.form_response",             type: "object",  note: "Full form response object" },
  ],

  google_calendar: [
    { path: "$trigger.event.id",                  type: "string",  note: "Google Calendar event ID" },
    { path: "$trigger.event.summary",             type: "string",  note: "Event title" },
    { path: "$trigger.event.description",         type: "string",  note: "Event description" },
    { path: "$trigger.event.location",            type: "string",  note: "Physical or virtual location" },
    { path: "$trigger.event.start.dateTime",      type: "string",  note: "Start datetime ISO string" },
    { path: "$trigger.event.end.dateTime",        type: "string",  note: "End datetime ISO string" },
    { path: "$trigger.event.start.timeZone",      type: "string",  note: "Timezone for the start time" },
    { path: "$trigger.event.organizer.email",     type: "string",  note: "Organizer's email" },
    { path: "$trigger.event.creator.email",       type: "string",  note: "Creator's email" },
    { path: "$trigger.event.attendees",           type: "array",   note: "List of attendee objects" },
    { path: "$trigger.event.status",              type: "string",  note: "'confirmed' | 'tentative' | 'cancelled'" },
    { path: "$trigger.event.htmlLink",            type: "string",  note: "Web URL to open the event" },
    { path: "$trigger.event.recurrence",          type: "array",   note: "RRULE strings if recurring" },
    { path: "$trigger.event.conferenceData",      type: "object",  note: "Meet/Zoom link data" },
    { path: "$trigger.calendarId",                type: "string",  note: "Calendar ID that was watched" },
    { path: "$trigger.changeType",                type: "string",  note: "'created' | 'updated' | 'deleted'" },
    { path: "$trigger.event",                     type: "object",  note: "Full Google Calendar event object" },
  ],

  google_sheets: [
    { path: "$trigger.spreadsheetId",             type: "string",  note: "Google Sheets spreadsheet ID" },
    { path: "$trigger.spreadsheetTitle",          type: "string",  note: "Spreadsheet name" },
    { path: "$trigger.sheetId",                   type: "number",  note: "Sheet tab ID" },
    { path: "$trigger.sheetTitle",                type: "string",  note: "Sheet tab name" },
    { path: "$trigger.row",                       type: "object",  note: "New or updated row as key→value" },
    { path: "$trigger.row.<ColumnHeader>",        type: "any",     note: "Any column by its header name" },
    { path: "$trigger.rowNumber",                 type: "number",  note: "1-indexed row number in the sheet" },
    { path: "$trigger.range",                     type: "string",  note: "A1 notation of affected range" },
    { path: "$trigger.values",                    type: "array",   note: "Raw 2D array of cell values" },
    { path: "$trigger.previousRow",               type: "object",  note: "Row before the update" },
    { path: "$trigger.changedColumns",            type: "array",   note: "Column headers that changed" },
    { path: "$trigger.changeType",                type: "string",  note: "'row_added' | 'row_updated' | 'row_deleted'" },
    { path: "$trigger.lastModifiedBy",            type: "string",  note: "Email of user who made the change" },
    { path: "$trigger.lastModifiedAt",            type: "string",  note: "ISO timestamp of change" },
  ],

  jira: [
    { path: "$trigger.webhookEvent",              type: "string",  note: "Jira event name e.g. jira:issue_created" },
    { path: "$trigger.issue.id",                  type: "string",  note: "Jira issue numeric ID" },
    { path: "$trigger.issue.key",                 type: "string",  note: "Issue key e.g. PROJ-123" },
    { path: "$trigger.issue.self",                type: "string",  note: "REST API URL for the issue" },
    { path: "$trigger.issue.fields.summary",      type: "string",  note: "Issue summary / title" },
    { path: "$trigger.issue.fields.description",  type: "string",  note: "Issue description (ADF or plain)" },
    { path: "$trigger.issue.fields.status.name",  type: "string",  note: "Status name e.g. In Progress" },
    { path: "$trigger.issue.fields.priority.name",type: "string",  note: "Priority label e.g. High" },
    { path: "$trigger.issue.fields.assignee.displayName", type: "string", note: "Assignee display name" },
    { path: "$trigger.issue.fields.assignee.emailAddress", type: "string", note: "Assignee email" },
    { path: "$trigger.issue.fields.reporter.displayName", type: "string", note: "Reporter display name" },
    { path: "$trigger.issue.fields.issuetype.name", type: "string", note: "Issue type e.g. Bug, Story" },
    { path: "$trigger.issue.fields.project.key", type: "string",  note: "Project key" },
    { path: "$trigger.issue.fields.labels",       type: "array",   note: "Applied labels" },
    { path: "$trigger.issue.fields.created",      type: "string",  note: "ISO creation timestamp" },
    { path: "$trigger.changelog",                 type: "object",  note: "Changed fields (update events)" },
    { path: "$trigger.issue",                     type: "object",  note: "Full Jira issue object" },
  ],

  github_issue: [
    { path: "$trigger.action",                    type: "string",  note: "'opened' | 'closed' | 'edited' | 'labeled'" },
    { path: "$trigger.issue.number",              type: "number",  note: "Issue number" },
    { path: "$trigger.issue.title",               type: "string",  note: "Issue title" },
    { path: "$trigger.issue.body",                type: "string",  note: "Issue body markdown" },
    { path: "$trigger.issue.state",               type: "string",  note: "'open' | 'closed'" },
    { path: "$trigger.issue.html_url",            type: "string",  note: "Web URL to the issue" },
    { path: "$trigger.issue.user.login",          type: "string",  note: "Author's GitHub username" },
    { path: "$trigger.issue.assignees",           type: "array",   note: "List of assignee objects" },
    { path: "$trigger.issue.labels",              type: "array",   note: "Applied label objects" },
    { path: "$trigger.issue.milestone.title",     type: "string",  note: "Milestone name (if set)" },
    { path: "$trigger.issue.comments",            type: "number",  note: "Number of comments" },
    { path: "$trigger.issue.created_at",          type: "string",  note: "ISO creation timestamp" },
    { path: "$trigger.issue.closed_at",           type: "string",  note: "ISO close timestamp (if closed)" },
    { path: "$trigger.repository.full_name",      type: "string",  note: "owner/repo" },
    { path: "$trigger.sender.login",              type: "string",  note: "Actor who triggered the event" },
    { path: "$trigger.label.name",                type: "string",  note: "Label added/removed (label events)" },
    { path: "$trigger.issue",                     type: "object",  note: "Full GitHub issue object" },
  ],

  trello: [
    { path: "$trigger.action.type",               type: "string",  note: "Action type e.g. createCard, updateCard" },
    { path: "$trigger.action.data.card.id",       type: "string",  note: "Trello card ID" },
    { path: "$trigger.action.data.card.name",     type: "string",  note: "Card title" },
    { path: "$trigger.action.data.card.shortUrl", type: "string",  note: "Short URL to the card" },
    { path: "$trigger.action.data.card.desc",     type: "string",  note: "Card description" },
    { path: "$trigger.action.data.list.name",     type: "string",  note: "Current list name" },
    { path: "$trigger.action.data.listBefore.name", type: "string", note: "Previous list (moveCard)" },
    { path: "$trigger.action.data.board.name",    type: "string",  note: "Board name" },
    { path: "$trigger.action.memberCreator.username", type: "string", note: "Actor's Trello username" },
    { path: "$trigger.action.memberCreator.fullName", type: "string", note: "Actor's full name" },
    { path: "$trigger.action.date",               type: "string",  note: "ISO timestamp of the action" },
    { path: "$trigger.model.id",                  type: "string",  note: "ID of the Trello model (board)" },
    { path: "$trigger.action.data",               type: "object",  note: "Full action data payload" },
    { path: "$trigger.action",                    type: "object",  note: "Full Trello action object" },
  ],

  gitlab: [
    { path: "$trigger.object_kind",               type: "string",  note: "Event kind: push, merge_request, issue…" },
    { path: "$trigger.event_name",                type: "string",  note: "Specific event e.g. push, tag_push" },
    { path: "$trigger.project.id",                type: "number",  note: "GitLab project ID" },
    { path: "$trigger.project.path_with_namespace",type: "string", note: "group/project format" },
    { path: "$trigger.project.web_url",           type: "string",  note: "Web URL of the project" },
    { path: "$trigger.user.name",                 type: "string",  note: "Actor display name" },
    { path: "$trigger.user.username",             type: "string",  note: "Actor username" },
    { path: "$trigger.commits",                   type: "array",   note: "List of commit objects (push)" },
    { path: "$trigger.before",                    type: "string",  note: "SHA before push" },
    { path: "$trigger.after",                     type: "string",  note: "SHA after push" },
    { path: "$trigger.ref",                       type: "string",  note: "Git ref that was pushed" },
    { path: "$trigger.object_attributes.title",   type: "string",  note: "MR/Issue title" },
    { path: "$trigger.object_attributes.state",   type: "string",  note: "MR/Issue state" },
    { path: "$trigger.object_attributes.url",     type: "string",  note: "Web URL to the resource" },
    { path: "$trigger.object_attributes",         type: "object",  note: "Full resource attributes" },
  ],

  sentry: [
    { path: "$trigger.action",                    type: "string",  note: "'created' | 'resolved' | 'assigned' | 'ignored'" },
    { path: "$trigger.data.issue.id",             type: "string",  note: "Sentry issue ID" },
    { path: "$trigger.data.issue.title",          type: "string",  note: "Issue title / exception name" },
    { path: "$trigger.data.issue.culprit",        type: "string",  note: "Culprit file:line" },
    { path: "$trigger.data.issue.level",          type: "string",  note: "'error' | 'warning' | 'info' | 'fatal'" },
    { path: "$trigger.data.issue.status",         type: "string",  note: "'unresolved' | 'resolved' | 'ignored'" },
    { path: "$trigger.data.issue.firstSeen",      type: "string",  note: "ISO timestamp of first occurrence" },
    { path: "$trigger.data.issue.lastSeen",       type: "string",  note: "ISO timestamp of latest occurrence" },
    { path: "$trigger.data.issue.count",          type: "string",  note: "Number of times event occurred" },
    { path: "$trigger.data.issue.userCount",      type: "number",  note: "Number of affected users" },
    { path: "$trigger.data.issue.permalink",      type: "string",  note: "Link to the issue in Sentry" },
    { path: "$trigger.data.issue.project.slug",   type: "string",  note: "Sentry project slug" },
    { path: "$trigger.installation.uuid",         type: "string",  note: "Sentry app installation UUID" },
    { path: "$trigger.data.issue",                type: "object",  note: "Full Sentry issue object" },
  ],

  vercel: [
    { path: "$trigger.type",                      type: "string",  note: "Event type e.g. deployment.created" },
    { path: "$trigger.payload.deployment.id",     type: "string",  note: "Vercel deployment ID" },
    { path: "$trigger.payload.deployment.url",    type: "string",  note: "Preview URL of the deployment" },
    { path: "$trigger.payload.deployment.state",  type: "string",  note: "'BUILDING' | 'READY' | 'ERROR' | 'CANCELED'" },
    { path: "$trigger.payload.deployment.name",   type: "string",  note: "Project name" },
    { path: "$trigger.payload.deployment.meta.githubCommitSha", type: "string", note: "Git commit SHA" },
    { path: "$trigger.payload.deployment.meta.githubCommitMessage", type: "string", note: "Commit message" },
    { path: "$trigger.payload.deployment.meta.githubCommitAuthorName", type: "string", note: "Commit author" },
    { path: "$trigger.payload.deployment.meta.branchAlias", type: "string", note: "Branch name" },
    { path: "$trigger.payload.links.deployment",  type: "string",  note: "Link to deployment in Vercel dashboard" },
    { path: "$trigger.payload.project.id",        type: "string",  note: "Vercel project ID" },
    { path: "$trigger.payload.target",            type: "string",  note: "'production' | 'staging' | null" },
    { path: "$trigger.teamId",                    type: "string",  note: "Vercel team ID" },
    { path: "$trigger.payload.deployment",        type: "object",  note: "Full deployment object" },
  ],

  pagerduty: [
    { path: "$trigger.event.event_type",          type: "string",  note: "e.g. incident.triggered, incident.resolved" },
    { path: "$trigger.event.data.id",             type: "string",  note: "Incident ID" },
    { path: "$trigger.event.data.incident_number",type: "number",  note: "Human incident number" },
    { path: "$trigger.event.data.title",          type: "string",  note: "Incident title" },
    { path: "$trigger.event.data.status",         type: "string",  note: "'triggered' | 'acknowledged' | 'resolved'" },
    { path: "$trigger.event.data.urgency",        type: "string",  note: "'high' | 'low'" },
    { path: "$trigger.event.data.priority.name",  type: "string",  note: "Priority label e.g. P1" },
    { path: "$trigger.event.data.service.summary",type: "string",  note: "Affected service name" },
    { path: "$trigger.event.data.html_url",       type: "string",  note: "Link to incident in PagerDuty" },
    { path: "$trigger.event.data.created_at",     type: "string",  note: "ISO creation timestamp" },
    { path: "$trigger.event.data.resolved_at",    type: "string",  note: "ISO resolve timestamp" },
    { path: "$trigger.event.data.escalation_policy.summary", type: "string", note: "Escalation policy name" },
    { path: "$trigger.event.data.assigned_via",   type: "string",  note: "How the incident was assigned" },
    { path: "$trigger.event.data",                type: "object",  note: "Full incident data object" },
  ],

  datadog: [
    { path: "$trigger.id",                        type: "string",  note: "Datadog monitor alert ID" },
    { path: "$trigger.title",                     type: "string",  note: "Alert title" },
    { path: "$trigger.text",                      type: "string",  note: "Alert message body" },
    { path: "$trigger.alert_type",                type: "string",  note: "'error' | 'warning' | 'info' | 'success'" },
    { path: "$trigger.alert_transition",          type: "string",  note: "'Triggered' | 'Recovered' | 'No Data'" },
    { path: "$trigger.priority",                  type: "string",  note: "'P1'–'P5'" },
    { path: "$trigger.last_updated",              type: "string",  note: "ISO timestamp of last state change" },
    { path: "$trigger.metric",                    type: "string",  note: "Metric name being monitored" },
    { path: "$trigger.query",                     type: "string",  note: "Monitor query" },
    { path: "$trigger.tags",                      type: "array",   note: "Tags on the monitor" },
    { path: "$trigger.host",                      type: "string",  note: "Hostname (if applicable)" },
    { path: "$trigger.url",                       type: "string",  note: "Link to the monitor in Datadog" },
    { path: "$trigger.org.name",                  type: "string",  note: "Datadog org name" },
    { path: "$trigger.body",                      type: "object",  note: "Full Datadog webhook payload" },
  ],

  zendesk: [
    { path: "$trigger.ticket.id",                 type: "number",  note: "Zendesk ticket ID" },
    { path: "$trigger.ticket.subject",            type: "string",  note: "Ticket subject line" },
    { path: "$trigger.ticket.description",        type: "string",  note: "First message / description" },
    { path: "$trigger.ticket.status",             type: "string",  note: "'new' | 'open' | 'pending' | 'solved' | 'closed'" },
    { path: "$trigger.ticket.priority",           type: "string",  note: "'low' | 'normal' | 'high' | 'urgent'" },
    { path: "$trigger.ticket.type",               type: "string",  note: "'question' | 'incident' | 'problem' | 'task'" },
    { path: "$trigger.ticket.tags",               type: "array",   note: "List of tag strings" },
    { path: "$trigger.ticket.requester.name",     type: "string",  note: "Requester display name" },
    { path: "$trigger.ticket.requester.email",    type: "string",  note: "Requester email" },
    { path: "$trigger.ticket.assignee.name",      type: "string",  note: "Assigned agent name" },
    { path: "$trigger.ticket.group.name",         type: "string",  note: "Assigned group name" },
    { path: "$trigger.ticket.organization.name",  type: "string",  note: "Requester's org name" },
    { path: "$trigger.ticket.created_at",         type: "string",  note: "ISO creation timestamp" },
    { path: "$trigger.ticket.updated_at",         type: "string",  note: "ISO last-update timestamp" },
    { path: "$trigger.ticket.url",                type: "string",  note: "REST API URL for the ticket" },
    { path: "$trigger.ticket",                    type: "object",  note: "Full Zendesk ticket object" },
  ],

  calendly: [
    { path: "$trigger.event",                     type: "string",  note: "'invitee.created' | 'invitee.canceled'" },
    { path: "$trigger.payload.event.name",        type: "string",  note: "Event type name" },
    { path: "$trigger.payload.event.start_time",  type: "string",  note: "ISO start time of the meeting" },
    { path: "$trigger.payload.event.end_time",    type: "string",  note: "ISO end time of the meeting" },
    { path: "$trigger.payload.event.status",      type: "string",  note: "'active' | 'canceled'" },
    { path: "$trigger.payload.event.location",    type: "object",  note: "Location object (Zoom, phone, etc.)" },
    { path: "$trigger.payload.invitee.name",      type: "string",  note: "Invitee full name" },
    { path: "$trigger.payload.invitee.email",     type: "string",  note: "Invitee email address" },
    { path: "$trigger.payload.invitee.timezone",  type: "string",  note: "Invitee's timezone" },
    { path: "$trigger.payload.invitee.questions_and_answers", type: "array", note: "Form Q&A responses" },
    { path: "$trigger.payload.cancellation.reason", type: "string", note: "Cancellation reason (canceled events)" },
    { path: "$trigger.payload.tracking.utm_source", type: "string", note: "UTM source from booking link" },
    { path: "$trigger.payload.event.created_at",  type: "string",  note: "ISO booking creation timestamp" },
    { path: "$trigger.payload",                   type: "object",  note: "Full Calendly payload object" },
  ],

  mailchimp: [
    { path: "$trigger.type",                      type: "string",  note: "Event type e.g. subscribe, unsubscribe, campaign" },
    { path: "$trigger.fired_at",                  type: "string",  note: "ISO timestamp of event" },
    { path: "$trigger.data.id",                   type: "string",  note: "Subscriber or campaign ID" },
    { path: "$trigger.data.email",                type: "string",  note: "Subscriber email address" },
    { path: "$trigger.data.email_type",           type: "string",  note: "'html' | 'text'" },
    { path: "$trigger.data.merges.FNAME",         type: "string",  note: "Subscriber first name merge tag" },
    { path: "$trigger.data.merges.LNAME",         type: "string",  note: "Subscriber last name merge tag" },
    { path: "$trigger.data.merges.<TAG>",         type: "any",     note: "Any custom merge tag value" },
    { path: "$trigger.data.list_id",              type: "string",  note: "Audience / list ID" },
    { path: "$trigger.data.reason",               type: "string",  note: "Unsubscribe reason (unsubscribe events)" },
    { path: "$trigger.data.ip_signup",            type: "string",  note: "IP address at signup" },
    { path: "$trigger.data.timestamp_signup",     type: "string",  note: "ISO signup timestamp" },
    { path: "$trigger.data",                      type: "object",  note: "Full event data object" },
  ],

  clickup: [
    { path: "$trigger.event",                     type: "string",  note: "Event name e.g. taskCreated, taskUpdated" },
    { path: "$trigger.task_id",                   type: "string",  note: "ClickUp task ID" },
    { path: "$trigger.history_items[0].field",    type: "string",  note: "Field that changed" },
    { path: "$trigger.history_items[0].before",   type: "string",  note: "Value before the change" },
    { path: "$trigger.history_items[0].after",    type: "string",  note: "Value after the change" },
    { path: "$trigger.task.name",                 type: "string",  note: "Task name" },
    { path: "$trigger.task.status.status",        type: "string",  note: "Current status label" },
    { path: "$trigger.task.priority.priority",    type: "string",  note: "Priority label" },
    { path: "$trigger.task.assignees",            type: "array",   note: "List of assignee objects" },
    { path: "$trigger.task.due_date",             type: "string",  note: "Due date timestamp (ms)" },
    { path: "$trigger.task.url",                  type: "string",  note: "Web URL to the task" },
    { path: "$trigger.task.list.name",            type: "string",  note: "Parent list name" },
    { path: "$trigger.task.space.id",             type: "string",  note: "Space ID" },
    { path: "$trigger.webhook_id",                type: "string",  note: "ClickUp webhook ID" },
    { path: "$trigger.task",                      type: "object",  note: "Full task object" },
  ],

  monday: [
    { path: "$trigger.event.type",                type: "string",  note: "Event type e.g. update_column_value" },
    { path: "$trigger.event.boardId",             type: "number",  note: "Board ID" },
    { path: "$trigger.event.itemId",              type: "number",  note: "Item (row) ID" },
    { path: "$trigger.event.itemName",            type: "string",  note: "Item name" },
    { path: "$trigger.event.groupId",             type: "string",  note: "Group ID the item is in" },
    { path: "$trigger.event.columnId",            type: "string",  note: "Column ID that changed" },
    { path: "$trigger.event.columnTitle",         type: "string",  note: "Column display name" },
    { path: "$trigger.event.value",               type: "object",  note: "New column value" },
    { path: "$trigger.event.previousValue",       type: "object",  note: "Previous column value" },
    { path: "$trigger.event.userId",              type: "number",  note: "Monday.com user ID of actor" },
    { path: "$trigger.event.userName",            type: "string",  note: "Display name of actor" },
    { path: "$trigger.event.createdAt",           type: "string",  note: "ISO timestamp of event" },
    { path: "$trigger.event.pulseId",             type: "number",  note: "Alias for itemId (pulse)" },
    { path: "$trigger.event",                     type: "object",  note: "Full Monday event object" },
  ],

  figma: [
    { path: "$trigger.event_type",                type: "string",  note: "'FILE_UPDATE' | 'FILE_VERSION_UPDATE' | 'FILE_COMMENT' | 'FILE_DELETE'" },
    { path: "$trigger.file_key",                  type: "string",  note: "Figma file key" },
    { path: "$trigger.file_name",                 type: "string",  note: "Figma file name" },
    { path: "$trigger.description",               type: "string",  note: "Comment text (comment events)" },
    { path: "$trigger.comment_id",                type: "string",  note: "Comment ID" },
    { path: "$trigger.triggered_by.id",           type: "string",  note: "Actor user ID" },
    { path: "$trigger.triggered_by.handle",       type: "string",  note: "Actor username" },
    { path: "$trigger.created_components",        type: "array",   note: "New components (version update)" },
    { path: "$trigger.modified_components",       type: "array",   note: "Changed components" },
    { path: "$trigger.deleted_components",        type: "array",   note: "Removed components" },
    { path: "$trigger.created_styles",            type: "array",   note: "New styles added" },
    { path: "$trigger.modified_styles",           type: "array",   note: "Modified styles" },
    { path: "$trigger.passcode",                  type: "string",  note: "Webhook validation passcode" },
    { path: "$trigger.webhook_id",                type: "string",  note: "Figma webhook ID" },
  ],

  asana: [
    { path: "$trigger.events[0].action",          type: "string",  note: "'added' | 'removed' | 'changed' | 'deleted'" },
    { path: "$trigger.events[0].resource.gid",    type: "string",  note: "Resource GID (task, project, story)" },
    { path: "$trigger.events[0].resource.resource_type", type: "string", note: "'task' | 'project' | 'story'" },
    { path: "$trigger.events[0].resource.name",   type: "string",  note: "Resource name" },
    { path: "$trigger.events[0].parent.gid",      type: "string",  note: "Parent resource GID" },
    { path: "$trigger.events[0].parent.resource_type", type: "string", note: "Parent resource type" },
    { path: "$trigger.events[0].user.gid",        type: "string",  note: "User who triggered the event" },
    { path: "$trigger.events[0].user.name",       type: "string",  note: "User display name" },
    { path: "$trigger.events[0].created_at",      type: "string",  note: "ISO timestamp of event" },
    { path: "$trigger.events[0].change.field",    type: "string",  note: "Field that changed" },
    { path: "$trigger.events[0].change.new_value", type: "any",   note: "New value after change" },
    { path: "$trigger.events[0].change.old_value", type: "any",   note: "Old value before change" },
    { path: "$trigger.events",                    type: "array",   note: "Array of all event objects" },
  ],

  pipedrive: [
    { path: "$trigger.event",                     type: "string",  note: "e.g. added.deal, updated.person" },
    { path: "$trigger.meta.action",               type: "string",  note: "'added' | 'updated' | 'deleted' | 'merged'" },
    { path: "$trigger.meta.object",               type: "string",  note: "'deal' | 'person' | 'organization' | 'activity'" },
    { path: "$trigger.current.id",                type: "number",  note: "Resource ID" },
    { path: "$trigger.current.title",             type: "string",  note: "Deal title (deal events)" },
    { path: "$trigger.current.value",             type: "number",  note: "Deal value" },
    { path: "$trigger.current.currency",          type: "string",  note: "Deal currency" },
    { path: "$trigger.current.status",            type: "string",  note: "'open' | 'won' | 'lost' | 'deleted'" },
    { path: "$trigger.current.person_name",       type: "string",  note: "Contact name" },
    { path: "$trigger.current.org_name",          type: "string",  note: "Organization name" },
    { path: "$trigger.current.stage_id",          type: "number",  note: "Pipeline stage ID" },
    { path: "$trigger.previous",                  type: "object",  note: "Resource state before the change" },
    { path: "$trigger.meta.timestamp",            type: "string",  note: "ISO timestamp of event" },
    { path: "$trigger.current",                   type: "object",  note: "Full current resource state" },
  ],

  google_drive: [
    { path: "$trigger.file.id",                   type: "string",  note: "Google Drive file ID" },
    { path: "$trigger.file.name",                 type: "string",  note: "File name" },
    { path: "$trigger.file.mimeType",             type: "string",  note: "MIME type e.g. application/pdf" },
    { path: "$trigger.file.webViewLink",          type: "string",  note: "URL to view the file in browser" },
    { path: "$trigger.file.webContentLink",       type: "string",  note: "Direct download URL" },
    { path: "$trigger.file.size",                 type: "string",  note: "File size in bytes" },
    { path: "$trigger.file.parents",              type: "array",   note: "Parent folder IDs" },
    { path: "$trigger.file.createdTime",          type: "string",  note: "ISO creation timestamp" },
    { path: "$trigger.file.modifiedTime",         type: "string",  note: "ISO last-modified timestamp" },
    { path: "$trigger.file.lastModifyingUser.displayName", type: "string", note: "Name of last modifier" },
    { path: "$trigger.file.lastModifyingUser.emailAddress", type: "string", note: "Email of last modifier" },
    { path: "$trigger.file.shared",               type: "boolean", note: "true if file is shared" },
    { path: "$trigger.changeType",                type: "string",  note: "'file_added' | 'file_updated' | 'file_deleted'" },
    { path: "$trigger.file",                      type: "object",  note: "Full Drive file metadata object" },
  ],

  google_forms: [
    { path: "$trigger.formId",                    type: "string",  note: "Google Form ID" },
    { path: "$trigger.responseId",                type: "string",  note: "Unique response ID" },
    { path: "$trigger.createTime",                type: "string",  note: "ISO submission timestamp" },
    { path: "$trigger.lastSubmittedTime",         type: "string",  note: "ISO last-edit timestamp" },
    { path: "$trigger.respondentEmail",           type: "string",  note: "Respondent email (if collected)" },
    { path: "$trigger.answers",                   type: "object",  note: "Map of questionId → answer" },
    { path: "$trigger.answers.<questionId>.textAnswers.answers[0].value", type: "string", note: "First text answer" },
    { path: "$trigger.answers.<questionId>.questionId", type: "string", note: "Question identifier" },
    { path: "$trigger.totalScore",                type: "number",  note: "Quiz total score (if graded)" },
    { path: "$trigger.formTitle",                 type: "string",  note: "Form title" },
    { path: "$trigger.formDescription",           type: "string",  note: "Form description" },
    { path: "$trigger.submittedAt",               type: "string",  note: "ISO timestamp alias" },
    { path: "$trigger.answers",                   type: "object",  note: "Full answers map" },
  ],

  outlook: [
    { path: "$trigger.email.id",                  type: "string",  note: "Outlook message ID" },
    { path: "$trigger.email.subject",             type: "string",  note: "Email subject" },
    { path: "$trigger.email.from.emailAddress.address", type: "string", note: "Sender email address" },
    { path: "$trigger.email.from.emailAddress.name",    type: "string", note: "Sender display name" },
    { path: "$trigger.email.toRecipients",        type: "array",   note: "To recipient objects" },
    { path: "$trigger.email.ccRecipients",        type: "array",   note: "CC recipient objects" },
    { path: "$trigger.email.body.content",        type: "string",  note: "Body text or HTML" },
    { path: "$trigger.email.body.contentType",    type: "string",  note: "'text' | 'html'" },
    { path: "$trigger.email.receivedDateTime",    type: "string",  note: "ISO received timestamp" },
    { path: "$trigger.email.sentDateTime",        type: "string",  note: "ISO sent timestamp" },
    { path: "$trigger.email.hasAttachments",      type: "boolean", note: "true if message has attachments" },
    { path: "$trigger.email.attachments",         type: "array",   note: "Attachment metadata array" },
    { path: "$trigger.email.isRead",              type: "boolean", note: "true if message has been read" },
    { path: "$trigger.email.importance",          type: "string",  note: "'low' | 'normal' | 'high'" },
    { path: "$trigger.email.conversationId",      type: "string",  note: "Thread conversation ID" },
    { path: "$trigger.email",                     type: "object",  note: "Full Outlook message object" },
  ],

  teams: [
    { path: "$trigger.type",                      type: "string",  note: "Activity type e.g. message, conversationUpdate" },
    { path: "$trigger.text",                      type: "string",  note: "Plain text of the message" },
    { path: "$trigger.id",                        type: "string",  note: "Activity ID" },
    { path: "$trigger.channelId",                 type: "string",  note: "Channel identifier (msteams)" },
    { path: "$trigger.from.id",                   type: "string",  note: "Sender's Teams user ID" },
    { path: "$trigger.from.name",                 type: "string",  note: "Sender's display name" },
    { path: "$trigger.from.aadObjectId",          type: "string",  note: "Azure AD object ID" },
    { path: "$trigger.conversation.id",           type: "string",  note: "Conversation ID" },
    { path: "$trigger.conversation.isGroup",      type: "boolean", note: "true if group conversation" },
    { path: "$trigger.conversation.name",         type: "string",  note: "Channel/chat name" },
    { path: "$trigger.recipient.name",            type: "string",  note: "Bot's display name" },
    { path: "$trigger.timestamp",                 type: "string",  note: "ISO activity timestamp" },
    { path: "$trigger.serviceUrl",                type: "string",  note: "Teams service URL for replies" },
    { path: "$trigger.attachments",               type: "array",   note: "Adaptive cards or file attachments" },
    { path: "$trigger.entities",                  type: "array",   note: "Mention/hashtag entities" },
  ],

  http_monitor: [
    { path: "$trigger.url",                       type: "string",  note: "Monitored URL" },
    { path: "$trigger.status",                    type: "string",  note: "'up' | 'down' | 'degraded'" },
    { path: "$trigger.previousStatus",            type: "string",  note: "Status before this check" },
    { path: "$trigger.statusCode",                type: "number",  note: "HTTP response status code" },
    { path: "$trigger.responseTimeMs",            type: "number",  note: "Response time in milliseconds" },
    { path: "$trigger.checkedAt",                 type: "string",  note: "ISO timestamp of the check" },
    { path: "$trigger.downSince",                 type: "string",  note: "ISO timestamp when went down" },
    { path: "$trigger.errorMessage",              type: "string",  note: "Error message if request failed" },
    { path: "$trigger.region",                    type: "string",  note: "Monitoring region (us-east, eu-west…)" },
    { path: "$trigger.consecutiveFailures",       type: "number",  note: "Number of consecutive failures" },
    { path: "$trigger.sslExpiresAt",              type: "string",  note: "SSL cert expiry ISO date" },
    { path: "$trigger.sslDaysRemaining",          type: "number",  note: "Days until SSL cert expires" },
    { path: "$trigger.headers",                   type: "object",  note: "Response headers received" },
    { path: "$trigger.body",                      type: "string",  note: "First 1KB of response body" },
  ],

  ssl: [
    { path: "$trigger.domain",                    type: "string",  note: "Domain that was checked" },
    { path: "$trigger.status",                    type: "string",  note: "'valid' | 'expiring_soon' | 'expired' | 'invalid'" },
    { path: "$trigger.expiresAt",                 type: "string",  note: "ISO cert expiry timestamp" },
    { path: "$trigger.daysRemaining",             type: "number",  note: "Days until expiry" },
    { path: "$trigger.issuer",                    type: "string",  note: "Certificate issuer CN" },
    { path: "$trigger.subject",                   type: "string",  note: "Certificate subject CN" },
    { path: "$trigger.validFrom",                 type: "string",  note: "ISO cert valid-from timestamp" },
    { path: "$trigger.serialNumber",              type: "string",  note: "Cert serial number" },
    { path: "$trigger.fingerprint",               type: "string",  note: "SHA-256 fingerprint" },
    { path: "$trigger.protocol",                  type: "string",  note: "TLS protocol version e.g. TLSv1.3" },
    { path: "$trigger.port",                      type: "number",  note: "Port that was checked" },
    { path: "$trigger.checkedAt",                 type: "string",  note: "ISO timestamp of the check" },
    { path: "$trigger.previousStatus",            type: "string",  note: "SSL status before this check" },
  ],

  dns: [
    { path: "$trigger.domain",                    type: "string",  note: "Domain being monitored" },
    { path: "$trigger.recordType",                type: "string",  note: "'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS'" },
    { path: "$trigger.currentValue",              type: "any",     note: "Current DNS record value(s)" },
    { path: "$trigger.previousValue",             type: "any",     note: "Previous DNS record value(s)" },
    { path: "$trigger.changed",                   type: "boolean", note: "true if record changed" },
    { path: "$trigger.ttl",                       type: "number",  note: "TTL in seconds" },
    { path: "$trigger.nameservers",               type: "array",   note: "Authoritative nameservers" },
    { path: "$trigger.resolvedIPs",               type: "array",   note: "Resolved IP addresses (A records)" },
    { path: "$trigger.mxRecords",                 type: "array",   note: "MX records with priority" },
    { path: "$trigger.txtRecords",                type: "array",   note: "TXT record values" },
    { path: "$trigger.checkedAt",                 type: "string",  note: "ISO timestamp of DNS check" },
    { path: "$trigger.propagatedAt",              type: "string",  note: "When change was fully propagated" },
    { path: "$trigger.region",                    type: "string",  note: "DNS resolver region" },
  ],

  hackernews: [
    { path: "$trigger.item.id",                   type: "number",  note: "HN item ID" },
    { path: "$trigger.item.type",                 type: "string",  note: "'story' | 'comment' | 'job' | 'poll'" },
    { path: "$trigger.item.title",                type: "string",  note: "Story title" },
    { path: "$trigger.item.url",                  type: "string",  note: "External URL of the story" },
    { path: "$trigger.item.text",                 type: "string",  note: "Comment or self-post text (HTML)" },
    { path: "$trigger.item.by",                   type: "string",  note: "Username of the submitter" },
    { path: "$trigger.item.score",                type: "number",  note: "Current upvote score" },
    { path: "$trigger.item.descendants",          type: "number",  note: "Number of comments" },
    { path: "$trigger.item.time",                 type: "number",  note: "Unix timestamp of submission" },
    { path: "$trigger.item.hnUrl",                type: "string",  note: "HN link to the item" },
    { path: "$trigger.matchedKeywords",           type: "array",   note: "Keywords matched (if keyword filter set)" },
    { path: "$trigger.rank",                      type: "number",  note: "Position on the front page at poll time" },
    { path: "$trigger.polledAt",                  type: "string",  note: "ISO timestamp when check ran" },
    { path: "$trigger.item",                      type: "object",  note: "Full HN item object" },
  ],

  reddit: [
    { path: "$trigger.post.id",                   type: "string",  note: "Reddit post ID (t3_xxxxx)" },
    { path: "$trigger.post.title",                type: "string",  note: "Post title" },
    { path: "$trigger.post.selftext",             type: "string",  note: "Post body text" },
    { path: "$trigger.post.url",                  type: "string",  note: "Post URL (external link or self)" },
    { path: "$trigger.post.permalink",            type: "string",  note: "Reddit.com permalink" },
    { path: "$trigger.post.author",               type: "string",  note: "Author username" },
    { path: "$trigger.post.subreddit",            type: "string",  note: "Subreddit name (without r/)" },
    { path: "$trigger.post.score",                type: "number",  note: "Upvote score" },
    { path: "$trigger.post.upvote_ratio",         type: "number",  note: "Ratio of upvotes to total votes" },
    { path: "$trigger.post.num_comments",         type: "number",  note: "Number of comments" },
    { path: "$trigger.post.created_utc",          type: "number",  note: "Unix UTC timestamp of post" },
    { path: "$trigger.post.is_video",             type: "boolean", note: "true if post contains a video" },
    { path: "$trigger.post.flair_text",           type: "string",  note: "Post flair label" },
    { path: "$trigger.matchedKeywords",           type: "array",   note: "Keywords matched from filter" },
    { path: "$trigger.post",                      type: "object",  note: "Full Reddit post data object" },
  ],

  woocommerce: [
    { path: "$trigger.topic",                     type: "string",  note: "Webhook topic e.g. order.created" },
    { path: "$trigger.order.id",                  type: "number",  note: "WooCommerce order ID" },
    { path: "$trigger.order.number",              type: "string",  note: "Order number displayed to customers" },
    { path: "$trigger.order.status",              type: "string",  note: "'pending' | 'processing' | 'completed' | 'refunded'" },
    { path: "$trigger.order.total",               type: "string",  note: "Order total decimal string" },
    { path: "$trigger.order.currency",            type: "string",  note: "ISO currency code" },
    { path: "$trigger.order.billing.email",       type: "string",  note: "Billing email address" },
    { path: "$trigger.order.billing.first_name",  type: "string",  note: "Billing first name" },
    { path: "$trigger.order.billing.last_name",   type: "string",  note: "Billing last name" },
    { path: "$trigger.order.line_items",          type: "array",   note: "Purchased items array" },
    { path: "$trigger.order.shipping.address_1",  type: "string",  note: "Shipping street address" },
    { path: "$trigger.order.payment_method",      type: "string",  note: "Payment method ID" },
    { path: "$trigger.order.payment_method_title",type: "string",  note: "Payment method display name" },
    { path: "$trigger.order.date_created",        type: "string",  note: "ISO creation timestamp" },
    { path: "$trigger.order",                     type: "object",  note: "Full WooCommerce order object" },
  ],

  intercom: [
    { path: "$trigger.type",                      type: "string",  note: "Event type e.g. conversation.user.created" },
    { path: "$trigger.data.item.id",              type: "string",  note: "Resource ID" },
    { path: "$trigger.data.item.type",            type: "string",  note: "'conversation' | 'contact' | 'user'" },
    { path: "$trigger.data.item.conversation_id", type: "string",  note: "Conversation ID" },
    { path: "$trigger.data.item.body",            type: "string",  note: "Message body text" },
    { path: "$trigger.data.item.created_at",      type: "number",  note: "Unix timestamp of creation" },
    { path: "$trigger.data.item.author.id",       type: "string",  note: "Message author ID" },
    { path: "$trigger.data.item.author.name",     type: "string",  note: "Message author name" },
    { path: "$trigger.data.item.author.email",    type: "string",  note: "Message author email" },
    { path: "$trigger.data.item.author.type",     type: "string",  note: "'user' | 'admin' | 'bot'" },
    { path: "$trigger.data.item.user.email",      type: "string",  note: "Contact/user email" },
    { path: "$trigger.data.item.tags.tags",       type: "array",   note: "Tags on the conversation" },
    { path: "$trigger.data.item.assignee.id",     type: "string",  note: "Assigned admin ID" },
    { path: "$trigger.data.item",                 type: "object",  note: "Full Intercom item object" },
  ],

  instagram: [
    { path: "$trigger.object",                    type: "string",  note: "'instagram'" },
    { path: "$trigger.entry[0].id",               type: "string",  note: "Instagram Business Account ID" },
    { path: "$trigger.entry[0].time",             type: "number",  note: "Unix timestamp of event" },
    { path: "$trigger.entry[0].changes[0].field", type: "string",  note: "'comments' | 'messages' | 'feed' | 'mentions'" },
    { path: "$trigger.entry[0].changes[0].value.id",   type: "string", note: "Comment / media ID" },
    { path: "$trigger.entry[0].changes[0].value.text", type: "string", note: "Comment text" },
    { path: "$trigger.entry[0].changes[0].value.from.id",   type: "string", note: "Commenter user ID" },
    { path: "$trigger.entry[0].changes[0].value.from.username", type: "string", note: "Commenter username" },
    { path: "$trigger.entry[0].changes[0].value.media.id",  type: "string", note: "Media the comment is on" },
    { path: "$trigger.entry[0].messaging[0].sender.id",  type: "string", note: "DM sender IGSID" },
    { path: "$trigger.entry[0].messaging[0].message.text", type: "string", note: "DM message text" },
    { path: "$trigger.entry[0].messaging[0].timestamp",    type: "number", note: "DM timestamp" },
    { path: "$trigger.entry[0].changes[0].value", type: "object", note: "Full change value object" },
  ],

  tiktok: [
    { path: "$trigger.event",                     type: "string",  note: "Event type e.g. video.publish" },
    { path: "$trigger.video.id",                  type: "string",  note: "TikTok video ID" },
    { path: "$trigger.video.title",               type: "string",  note: "Video caption" },
    { path: "$trigger.video.cover_image_url",     type: "string",  note: "Thumbnail image URL" },
    { path: "$trigger.video.share_url",           type: "string",  note: "Public share URL" },
    { path: "$trigger.video.duration",            type: "number",  note: "Video duration in seconds" },
    { path: "$trigger.video.view_count",          type: "number",  note: "View count at time of event" },
    { path: "$trigger.video.like_count",          type: "number",  note: "Like count" },
    { path: "$trigger.video.comment_count",       type: "number",  note: "Comment count" },
    { path: "$trigger.video.create_time",         type: "number",  note: "Unix creation timestamp" },
    { path: "$trigger.video.privacy_level",       type: "string",  note: "'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY'" },
    { path: "$trigger.video.embed_disabled",      type: "boolean", note: "true if embedding is disabled" },
    { path: "$trigger.creator.open_id",           type: "string",  note: "Creator's TikTok open ID" },
    { path: "$trigger.video",                     type: "object",  note: "Full video object" },
  ],

  youtube: [
    { path: "$trigger.video.videoId",             type: "string",  note: "YouTube video ID" },
    { path: "$trigger.video.title",               type: "string",  note: "Video title" },
    { path: "$trigger.video.description",         type: "string",  note: "Video description" },
    { path: "$trigger.video.publishedAt",         type: "string",  note: "ISO publish timestamp" },
    { path: "$trigger.video.channelId",           type: "string",  note: "Channel ID" },
    { path: "$trigger.video.channelTitle",        type: "string",  note: "Channel display name" },
    { path: "$trigger.video.thumbnails.default.url", type: "string", note: "Default thumbnail URL" },
    { path: "$trigger.video.statistics.viewCount",   type: "string", note: "View count" },
    { path: "$trigger.video.statistics.likeCount",   type: "string", note: "Like count" },
    { path: "$trigger.video.statistics.commentCount",type: "string", note: "Comment count" },
    { path: "$trigger.video.contentDetails.duration", type: "string", note: "ISO 8601 duration e.g. PT5M30S" },
    { path: "$trigger.video.status.privacyStatus",   type: "string", note: "'public' | 'unlisted' | 'private'" },
    { path: "$trigger.video.tags",                type: "array",   note: "Video tags" },
    { path: "$trigger.feedUrl",                   type: "string",  note: "Channel RSS feed URL polled" },
    { path: "$trigger.video",                     type: "object",  note: "Full video snippet object" },
  ],

  price_alert: [
    { path: "$trigger.symbol",                    type: "string",  note: "Asset symbol e.g. BTC, AAPL" },
    { path: "$trigger.price",                     type: "number",  note: "Current price at time of alert" },
    { path: "$trigger.previousPrice",             type: "number",  note: "Price at previous check" },
    { path: "$trigger.change",                    type: "number",  note: "Absolute price change" },
    { path: "$trigger.changePercent",             type: "number",  note: "Percentage price change" },
    { path: "$trigger.direction",                 type: "string",  note: "'up' | 'down'" },
    { path: "$trigger.currency",                  type: "string",  note: "Quote currency e.g. USD" },
    { path: "$trigger.exchange",                  type: "string",  note: "Exchange name e.g. NASDAQ, Binance" },
    { path: "$trigger.marketCap",                 type: "number",  note: "Market cap in USD" },
    { path: "$trigger.volume24h",                 type: "number",  note: "24h trading volume" },
    { path: "$trigger.high24h",                   type: "number",  note: "24h high price" },
    { path: "$trigger.low24h",                    type: "number",  note: "24h low price" },
    { path: "$trigger.alertThreshold",            type: "number",  note: "Configured trigger threshold" },
    { path: "$trigger.checkedAt",                 type: "string",  note: "ISO timestamp of price check" },
  ],

  port_monitor: [
    { path: "$trigger.host",                      type: "string",  note: "Hostname or IP being monitored" },
    { path: "$trigger.port",                      type: "number",  note: "Port number checked" },
    { path: "$trigger.protocol",                  type: "string",  note: "'tcp' | 'udp'" },
    { path: "$trigger.status",                    type: "string",  note: "'open' | 'closed' | 'filtered'" },
    { path: "$trigger.previousStatus",            type: "string",  note: "Status before this check" },
    { path: "$trigger.responseTimeMs",            type: "number",  note: "Connection time in ms" },
    { path: "$trigger.checkedAt",                 type: "string",  note: "ISO timestamp of check" },
    { path: "$trigger.downSince",                 type: "string",  note: "ISO timestamp when port went down" },
    { path: "$trigger.consecutiveFailures",       type: "number",  note: "Consecutive failed checks" },
    { path: "$trigger.serviceName",               type: "string",  note: "Friendly name for the service" },
    { path: "$trigger.region",                    type: "string",  note: "Check origin region" },
    { path: "$trigger.ipResolved",                type: "string",  note: "Resolved IP of hostname" },
  ],

  docker: [
    { path: "$trigger.Type",                      type: "string",  note: "Event category: 'container' | 'image' | 'network' | 'volume'" },
    { path: "$trigger.Action",                    type: "string",  note: "Action: 'start' | 'stop' | 'die' | 'create' | 'destroy'" },
    { path: "$trigger.Actor.ID",                  type: "string",  note: "Container/image ID" },
    { path: "$trigger.Actor.Attributes.name",     type: "string",  note: "Container name" },
    { path: "$trigger.Actor.Attributes.image",    type: "string",  note: "Image name:tag" },
    { path: "$trigger.Actor.Attributes.exitCode", type: "string",  note: "Exit code on die/stop events" },
    { path: "$trigger.time",                      type: "number",  note: "Unix timestamp of event" },
    { path: "$trigger.timeNano",                  type: "number",  note: "Timestamp in nanoseconds" },
    { path: "$trigger.status",                    type: "string",  note: "Combined status string" },
    { path: "$trigger.id",                        type: "string",  note: "Short container/resource ID" },
    { path: "$trigger.from",                      type: "string",  note: "Image name (container events)" },
    { path: "$trigger.Actor.Attributes",          type: "object",  note: "All event attributes" },
  ],

  ssh: [
    { path: "$trigger.event",                     type: "string",  note: "'login' | 'logout' | 'failed_login' | 'command'" },
    { path: "$trigger.user",                      type: "string",  note: "Username that triggered the event" },
    { path: "$trigger.sourceIp",                  type: "string",  note: "Source IP address" },
    { path: "$trigger.timestamp",                 type: "string",  note: "ISO event timestamp" },
    { path: "$trigger.host",                      type: "string",  note: "SSH host being monitored" },
    { path: "$trigger.port",                      type: "number",  note: "SSH port" },
    { path: "$trigger.authMethod",                type: "string",  note: "'password' | 'publickey' | 'keyboard-interactive'" },
    { path: "$trigger.command",                   type: "string",  note: "Command executed (command events)" },
    { path: "$trigger.pid",                       type: "number",  note: "Process ID of the SSH session" },
    { path: "$trigger.sessionId",                 type: "string",  note: "SSH session identifier" },
    { path: "$trigger.duration",                  type: "number",  note: "Session duration in seconds (logout)" },
    { path: "$trigger.failureReason",             type: "string",  note: "Reason for failed login" },
  ],

  azure_devops: [
    { path: "$trigger.eventType",                 type: "string",  note: "e.g. workitem.created, git.push" },
    { path: "$trigger.resource.id",               type: "number",  note: "Resource ID" },
    { path: "$trigger.resource.workItemType",      type: "string",  note: "Work item type e.g. Bug, Task" },
    { path: "$trigger.resource.fields.System.Title",          type: "string", note: "Work item title" },
    { path: "$trigger.resource.fields.System.State",          type: "string", note: "Work item state" },
    { path: "$trigger.resource.fields.System.AssignedTo",     type: "string", note: "Assigned to" },
    { path: "$trigger.resource.fields.System.AreaPath",       type: "string", note: "Area path" },
    { path: "$trigger.resource.fields.Microsoft.VSTS.Common.Priority", type: "number", note: "Priority" },
    { path: "$trigger.resource.refUpdates",       type: "array",   note: "Branch ref updates (push events)" },
    { path: "$trigger.resource.repository.name",  type: "string",  note: "Repo name" },
    { path: "$trigger.resourceVersion",           type: "string",  note: "API version of resource schema" },
    { path: "$trigger.createdDate",               type: "string",  note: "ISO timestamp of event" },
    { path: "$trigger.resource",                  type: "object",  note: "Full resource object" },
  ],

  netlify: [
    { path: "$trigger.id",                        type: "string",  note: "Netlify deploy ID" },
    { path: "$trigger.site_id",                   type: "string",  note: "Netlify site ID" },
    { path: "$trigger.site_name",                 type: "string",  note: "Site name" },
    { path: "$trigger.state",                     type: "string",  note: "'building' | 'ready' | 'error' | 'enqueued'" },
    { path: "$trigger.error_message",             type: "string",  note: "Build error message (if failed)" },
    { path: "$trigger.deploy_url",                type: "string",  note: "Preview URL for the deploy" },
    { path: "$trigger.ssl_url",                   type: "string",  note: "HTTPS URL for the deploy" },
    { path: "$trigger.admin_url",                 type: "string",  note: "Link to deploy in Netlify UI" },
    { path: "$trigger.branch",                    type: "string",  note: "Git branch deployed" },
    { path: "$trigger.commit_ref",                type: "string",  note: "Git commit SHA" },
    { path: "$trigger.commit_url",                type: "string",  note: "Link to the commit" },
    { path: "$trigger.created_at",                type: "string",  note: "ISO deploy creation timestamp" },
    { path: "$trigger.published_at",              type: "string",  note: "ISO deploy publish timestamp" },
    { path: "$trigger.build_id",                  type: "string",  note: "Netlify build ID" },
  ],

  producthunt: [
    { path: "$trigger.post.id",                   type: "string",  note: "Product Hunt post ID" },
    { path: "$trigger.post.name",                 type: "string",  note: "Product name" },
    { path: "$trigger.post.tagline",              type: "string",  note: "Product tagline" },
    { path: "$trigger.post.description",          type: "string",  note: "Product description" },
    { path: "$trigger.post.url",                  type: "string",  note: "Product Hunt page URL" },
    { path: "$trigger.post.website",              type: "string",  note: "Product's external website" },
    { path: "$trigger.post.votesCount",           type: "number",  note: "Total upvotes" },
    { path: "$trigger.post.commentsCount",        type: "number",  note: "Number of comments" },
    { path: "$trigger.post.reviewsRating",        type: "number",  note: "Average review rating" },
    { path: "$trigger.post.thumbnail.url",        type: "string",  note: "Thumbnail image URL" },
    { path: "$trigger.post.topics",               type: "array",   note: "Topic tags e.g. AI, SaaS" },
    { path: "$trigger.post.makers",               type: "array",   note: "Maker profile objects" },
    { path: "$trigger.post.featuredAt",           type: "string",  note: "ISO featured date" },
    { path: "$trigger.post.createdAt",            type: "string",  note: "ISO post creation timestamp" },
    { path: "$trigger.post",                      type: "object",  note: "Full Product Hunt post object" },
  ],

  mastodon: [
    { path: "$trigger.id",                        type: "string",  note: "Status (toot) ID" },
    { path: "$trigger.content",                   type: "string",  note: "HTML content of the toot" },
    { path: "$trigger.text",                      type: "string",  note: "Plain text content (stripped HTML)" },
    { path: "$trigger.url",                       type: "string",  note: "Permalink to the toot" },
    { path: "$trigger.account.id",                type: "string",  note: "Author account ID" },
    { path: "$trigger.account.username",          type: "string",  note: "Author username (without @server)" },
    { path: "$trigger.account.acct",              type: "string",  note: "Full account @username@server" },
    { path: "$trigger.account.display_name",      type: "string",  note: "Author display name" },
    { path: "$trigger.account.followers_count",   type: "number",  note: "Author follower count" },
    { path: "$trigger.tags",                      type: "array",   note: "Hashtag objects" },
    { path: "$trigger.mentions",                  type: "array",   note: "Mentioned account objects" },
    { path: "$trigger.media_attachments",         type: "array",   note: "Image/video attachment objects" },
    { path: "$trigger.visibility",                type: "string",  note: "'public' | 'unlisted' | 'private' | 'direct'" },
    { path: "$trigger.created_at",                type: "string",  note: "ISO creation timestamp" },
    { path: "$trigger.reblog",                    type: "object",  note: "Original status if this is a boost" },
  ],

  virustotal: [
    { path: "$trigger.data.id",                   type: "string",  note: "Analysis ID" },
    { path: "$trigger.data.type",                 type: "string",  note: "'analysis'" },
    { path: "$trigger.data.attributes.status",    type: "string",  note: "'completed' | 'queued' | 'in-progress'" },
    { path: "$trigger.data.attributes.stats.malicious",   type: "number", note: "Engines flagging as malicious" },
    { path: "$trigger.data.attributes.stats.suspicious",  type: "number", note: "Engines flagging as suspicious" },
    { path: "$trigger.data.attributes.stats.harmless",    type: "number", note: "Engines flagging as harmless" },
    { path: "$trigger.data.attributes.stats.undetected",  type: "number", note: "Engines with no detection" },
    { path: "$trigger.data.attributes.date",      type: "number",  note: "Unix timestamp of analysis" },
    { path: "$trigger.meta.file_info.sha256",     type: "string",  note: "SHA-256 hash of analyzed file" },
    { path: "$trigger.meta.file_info.md5",        type: "string",  note: "MD5 hash of analyzed file" },
    { path: "$trigger.meta.file_info.size",       type: "number",  note: "File size in bytes" },
    { path: "$trigger.data.attributes.results",   type: "object",  note: "Per-engine detection results" },
    { path: "$trigger.data.attributes",           type: "object",  note: "Full analysis attributes" },
  ],

  onedrive: [
    { path: "$trigger.value[0].subscriptionId",   type: "string",  note: "Subscription ID" },
    { path: "$trigger.value[0].clientState",      type: "string",  note: "Client state validation string" },
    { path: "$trigger.value[0].changeType",       type: "string",  note: "'created' | 'updated' | 'deleted'" },
    { path: "$trigger.value[0].resource",         type: "string",  note: "Changed resource path" },
    { path: "$trigger.value[0].resourceData.id",  type: "string",  note: "DriveItem ID" },
    { path: "$trigger.file.name",                 type: "string",  note: "File name" },
    { path: "$trigger.file.size",                 type: "number",  note: "File size in bytes" },
    { path: "$trigger.file.webUrl",               type: "string",  note: "Browser URL to open the file" },
    { path: "$trigger.file.createdDateTime",      type: "string",  note: "ISO creation timestamp" },
    { path: "$trigger.file.lastModifiedDateTime", type: "string",  note: "ISO last-modified timestamp" },
    { path: "$trigger.file.lastModifiedBy.user.displayName", type: "string", note: "Last modifier name" },
    { path: "$trigger.file.parentReference.path", type: "string",  note: "Parent folder path" },
    { path: "$trigger.file",                      type: "object",  note: "Full DriveItem object" },
  ],

  sharepoint: [
    { path: "$trigger.value[0].changeType",       type: "string",  note: "'created' | 'updated' | 'deleted'" },
    { path: "$trigger.value[0].resource",         type: "string",  note: "Changed resource URL" },
    { path: "$trigger.item.id",                   type: "string",  note: "List item ID" },
    { path: "$trigger.item.fields",               type: "object",  note: "All column field values" },
    { path: "$trigger.item.fields.Title",         type: "string",  note: "Item title" },
    { path: "$trigger.item.fields.<ColumnName>",  type: "any",     note: "Any column by internal name" },
    { path: "$trigger.item.webUrl",               type: "string",  note: "URL to the item" },
    { path: "$trigger.item.createdDateTime",      type: "string",  note: "ISO creation timestamp" },
    { path: "$trigger.item.lastModifiedDateTime", type: "string",  note: "ISO last-modified timestamp" },
    { path: "$trigger.item.createdBy.user.displayName", type: "string", note: "Creator name" },
    { path: "$trigger.item.lastModifiedBy.user.displayName", type: "string", note: "Last modifier name" },
    { path: "$trigger.siteId",                    type: "string",  note: "SharePoint site ID" },
    { path: "$trigger.listId",                    type: "string",  note: "List ID" },
    { path: "$trigger.item",                      type: "object",  note: "Full SharePoint list item object" },
  ],
};

const GENERIC_ACTION_SCHEMA = [
  { path: "output",  type: "any",    note: "Full output of this node" },
  { path: "success", type: "boolean",note: "Whether this node succeeded" },
];

function schemaToRows(schema, nodeId) {
  if (!schema || typeof schema !== "object") return GENERIC_ACTION_SCHEMA;
  if (schema._passthrough || schema._dynamic) return GENERIC_ACTION_SCHEMA;
  return Object.entries(schema)
    .filter(([k]) => !k.startsWith("_"))
    .map(([key, type]) => ({
      path: `{{${nodeId}.${key}}}`,
      type: typeof type === "string" ? type : "object",
      note: "",
    }));
}

// Group flat schema rows into labeled sections by path prefix
function groupSchema(rows) {
  const groups = {};
  for (const row of rows) {
    // Extract group from path: "$trigger.body.x" → "body", "{{id.result}}" → "output"
    const clean = row.path.replace(/^\{\{[^}]+\}\./, "").replace(/^\$trigger\./, "");
    const seg = clean.split(".")[0].replace(/<[^>]+>/, "").toUpperCase() || "DATA";
    const label = seg + " DATA";
    if (!groups[label]) groups[label] = [];
    groups[label].push(row);
  }
  // Collapse single-item groups into "OUTPUT DATA"
  const entries = Object.entries(groups);
  if (entries.length === 1) return [{ label: entries[0][0], rows: entries[0][1] }];
  return entries.map(([label, rows]) => ({ label, rows }));
}

// Type icon
function TypeIcon({ type }) {
  const cls = "w-3.5 h-3.5 shrink-0";
  if (type === "string")  return <Type className={`${cls} text-emerald-400`} strokeWidth={2} />;
  if (type === "object")  return <Box className={`${cls} text-blue-400`} strokeWidth={2} />;
  if (type === "array")   return <ListOrdered className={`${cls} text-violet-400`} strokeWidth={2} />;
  if (type === "boolean") return <ToggleLeft className={`${cls} text-amber-400`} strokeWidth={2} />;
  if (type === "number")  return <Hash className={`${cls} text-orange-400`} strokeWidth={2} />;
  return <Braces className={`${cls} text-zinc-500`} strokeWidth={2} />;
}

// ── Main Sidebar ─────────────────────────────────────────────────────────────
export default function NodeConfigModal() {
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useWorkspaceStore((s) => s.setSelectedNodeId);
  const nodes = useWorkspaceStore((s) => s.nodes);
  const updateNodeConfig = useWorkspaceStore((s) => s.updateNodeConfig);

  const node = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const isOpen = !!selectedNodeId && !!node;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testInput, setTestInput] = useState("{}");
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  useEffect(() => { setSettingsOpen(false); setTestOpen(false); setTestResult(null); }, [selectedNodeId]);

  const runTest = useCallback(async () => {
    if (!node) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      let parsedInput = {};
      try { parsedInput = JSON.parse(testInput); } catch { parsedInput = { raw: testInput }; }
      const res = await api.post("/api/automation/test-node", {
        nodeType: node.data.backendType,
        config: node.data.config || {},
        input: parsedInput,
      });
      setTestResult(res.data);
    } catch (err) {
      setTestResult({ success: false, error: err.response?.data?.error || err.message });
    } finally {
      setTestLoading(false);
    }
  }, [node, testInput]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const isTrigger = node?.data.type === "trigger";
  const variant = isTrigger && node?.data.config?.triggerVariant
    ? TRIGGER_VARIANTS[node.data.config.triggerVariant]
    : null;
  const nodeDef = node ? NodeRegistry[node.data.backendType] : null;
  const def = variant || nodeDef;

  const Icon = def?.icon;
  const logoUrl = variant?.logoUrl || nodeDef?.logoUrl;
  const imgFilter = variant?.imgFilter || nodeDef?.imgFilter;
  const accent = def?.accentColor || "161,161,170";
  const colorClass = def?.colorClass || "text-zinc-400";
  const label = variant?.label || nodeDef?.label || node?.data.label || node?.data.backendType || "";

  const ConfigPanel = variant?.ConfigPanel || nodeDef?.ConfigPanel;

  const triggerVariantKey = node?.data.config?.triggerVariant;
  let rawSchema;
  if (isTrigger) {
    rawSchema = TRIGGER_OUTPUT_SCHEMA[triggerVariantKey] || TRIGGER_OUTPUT_SCHEMA[node?.data.backendType] || GENERIC_ACTION_SCHEMA;
  } else {
    const backendType = node?.data.backendType;
    const defaultSchema = backendType ? DEFAULT_SCHEMAS[backendType] : null;
    rawSchema = schemaToRows(defaultSchema, selectedNodeId);
  }
  const groups = groupSchema(rawSchema);
  const totalCount = rawSchema.length;

  const updateConfig = (key, value) => updateNodeConfig(selectedNodeId, key, value);
  const config = node?.data.config || {};
  const retryPolicy = config.retryPolicy || {};
  const updateRetryPolicy = (field, value) => updateConfig('retryPolicy', { ...retryPolicy, [field]: value });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="sidebar"
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="fixed right-0 top-0 bottom-0 z-30 flex flex-col"
          style={{
            width: 380,
            background: "#1a1a1c",
            borderLeft: "1px solid #2a2a2d",
            boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center gap-3 px-5 py-4 shrink-0 border-b border-[#252527]">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
              style={{ backgroundColor: `rgba(${accent},0.12)` }}
            >
              {logoUrl
                ? <img src={logoUrl} alt={label} className="w-5 h-5 object-contain" style={imgFilter ? { filter: imgFilter } : undefined} />
                : Icon && <Icon className={`w-4 h-4 ${colorClass}`} strokeWidth={1.5} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-white truncate leading-tight">{label}</p>
              <p className="text-[10px] text-[#666] font-mono mt-0.5">{isTrigger ? "trigger" : "action"}</p>
            </div>
            {NODE_DOCS[node.data.backendType] && (
              <button
                onClick={() => setShowDocs(v => !v)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 ${showDocs ? "text-blue-400 bg-blue-500/10" : "text-[#555] hover:text-[#aaa] hover:bg-white/[0.05]"}`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setSelectedNodeId(null)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#555] hover:text-white hover:bg-white/[0.06] transition-all shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ── Docs band ── */}
          <AnimatePresence>
            {showDocs && NODE_DOCS[node.data.backendType] && (() => {
              const doc = NODE_DOCS[node.data.backendType];
              return (
                <motion.div
                  key="docs"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-b border-[#252527] shrink-0"
                >
                  <p className="text-[11px] text-[#888] leading-relaxed px-5 py-3">{doc.description}</p>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto sidebar-scroll">

            {/* ── Output Events section (primary) ── */}
            <div className="px-5 pt-5 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-white">
                  {isTrigger ? "Trigger Events" : "Output Events"}
                  <span className="text-[#555] font-normal ml-2">({totalCount})</span>
                </span>
                <ChevronDown className="w-4 h-4 text-[#555]" />
              </div>
            </div>

            {groups.map((group) => (
              <div key={group.label} className="px-5 py-2">
                <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.1em] mb-2 mt-2">
                  {group.label}
                </p>
                <div className="flex flex-col">
                  {group.rows.map((row) => (
                    <EventRow key={row.path} path={row.path} type={row.type} note={row.note} nodeDef={def} logoUrl={logoUrl} imgFilter={imgFilter} Icon={Icon} colorClass={colorClass} />
                  ))}
                </div>
              </div>
            ))}

            {/* ── Settings (collapsible) ── */}
            <div className="px-5 pt-4 pb-2 mt-2 border-t border-[#252527]">
              <button
                onClick={() => setSettingsOpen(v => !v)}
                className="flex items-center gap-2 w-full text-left group"
              >
                <Settings2 className="w-3.5 h-3.5 text-[#555] group-hover:text-[#aaa] transition-colors shrink-0" />
                <span className="text-[13px] font-semibold text-[#777] group-hover:text-[#bbb] transition-colors flex-1">Settings</span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#555] transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            <AnimatePresence>
              {settingsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 flex flex-col gap-4">
                    {ConfigPanel ? (
                      <ConfigPanelWrapper
                        Panel={ConfigPanel}
                        config={config}
                        updateConfig={updateConfig}
                        selected={true}
                        nodeId={selectedNodeId}
                      />
                    ) : (
                      <p className="text-[12px] text-[#555] py-4 text-center">No configuration needed</p>
                    )}

                    {!isTrigger && (
                      <AdvancedSettings
                        retryPolicy={retryPolicy}
                        updateRetryPolicy={updateRetryPolicy}
                        timeoutMs={config.timeoutMs}
                        onTimeoutChange={(v) => updateConfig('timeoutMs', v)}
                      />
                    )}

                    {!isTrigger && (
                      <div className="rounded-xl border border-[#2a2a2d] overflow-hidden">
                        <button
                          onClick={() => { setTestOpen(v => !v); setTestResult(null); }}
                          className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-white/[0.03] transition-colors group"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-500 shrink-0" strokeWidth={2.5} />
                          <span className="text-[11px] font-semibold text-[#888] group-hover:text-white transition-colors flex-1">Test this node</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-[#555] transition-transform ${testOpen ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                          {testOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden border-t border-[#2a2a2d]"
                            >
                              <div className="p-4 flex flex-col gap-3">
                                <textarea
                                  value={testInput}
                                  onChange={e => setTestInput(e.target.value)}
                                  rows={3}
                                  className="w-full bg-[#111] border border-[#2a2a2d] rounded-lg px-3 py-2 text-[11px] text-zinc-200 font-mono focus:outline-none focus:border-emerald-500/40 resize-none"
                                  placeholder='{"query": "hello world"}'
                                />
                                <button
                                  onClick={runTest}
                                  disabled={testLoading}
                                  className="w-full py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[12px] font-semibold flex items-center justify-center gap-2 hover:bg-emerald-500/15 transition-all disabled:opacity-50"
                                >
                                  {testLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" strokeWidth={2.5} />}
                                  {testLoading ? "Running…" : "Run Test"}
                                </button>
                                {testResult && (
                                  <div className={`rounded-lg border p-3 ${testResult.success ? "bg-emerald-500/5 border-emerald-500/15" : "bg-red-500/5 border-red-500/20"}`}>
                                    <div className="flex items-center gap-1.5 mb-2">
                                      {testResult.success ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                                      <span className={`text-[10px] font-bold ${testResult.success ? "text-emerald-400" : "text-red-400"}`}>
                                        {testResult.success ? `Success · ${testResult.durationMs}ms` : "Failed"}
                                      </span>
                                    </div>
                                    <pre className="text-[10px] font-mono text-zinc-300 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                                      {testResult.success ? JSON.stringify(testResult.output, null, 2) : testResult.error}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Node ID footer */}
            <div className="px-5 py-4 border-t border-[#252527] mt-2">
              <p className="text-[9px] font-bold text-[#444] uppercase tracking-widest mb-1">Node ID</p>
              <code className="text-[10px] font-mono text-[#555] break-all">{selectedNodeId}</code>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Event row — node logo + path + note ──────────────────────────────────────
function EventRow({ path, type, note, logoUrl, imgFilter, Icon, colorClass }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#222224] last:border-0 group">
      <div className="w-7 h-7 rounded-lg bg-[#222224] flex items-center justify-center shrink-0 mt-0.5">
        {logoUrl
          ? <img src={logoUrl} alt="" className="w-4 h-4 object-contain" style={imgFilter ? { filter: imgFilter } : undefined} />
          : Icon ? <Icon className={`w-3.5 h-3.5 ${colorClass}`} strokeWidth={1.5} />
          : <TypeIcon type={type} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#ccc] group-hover:text-white transition-colors font-medium leading-snug break-all">{path}</p>
        {note && <p className="text-[11px] text-[#555] mt-0.5 leading-relaxed">{note}</p>}
      </div>
      <TypeIcon type={type} />
    </div>
  );
}

// ── Wrapper strips Handle/Position props ────────────────────────────────────
function ConfigPanelWrapper({ Panel, config, updateConfig, selected, nodeId }) {
  const ref = useRef(null);
  return (
    <div ref={ref} className="config-panel-wrapper [&_.react-flow\_\_handle]:hidden">
      <Panel config={config} updateConfig={updateConfig} selected={selected} nodeId={nodeId} />
    </div>
  );
}

// ── Advanced Settings ────────────────────────────────────────────────────────
function AdvancedSettings({ retryPolicy, updateRetryPolicy, timeoutMs, onTimeoutChange }) {
  const [open, setOpen] = useState(false);

  const onFailureBehavior = retryPolicy.retryOnFailure === false ? 'error_path' : (retryPolicy.maxAttempts === 1 ? 'no_retry' : 'retry');
  const setOnFailureBehavior = (val) => {
    if (val === 'error_path') updateRetryPolicy('retryOnFailure', false);
    else if (val === 'no_retry') { updateRetryPolicy('retryOnFailure', true); updateRetryPolicy('maxAttempts', 1); }
    else { updateRetryPolicy('retryOnFailure', true); updateRetryPolicy('maxAttempts', retryPolicy.maxAttempts || 3); }
  };

  return (
    <div className="rounded-xl border border-[#2a2a2d] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-white/[0.03] transition-colors group"
      >
        <Settings2 className="w-3.5 h-3.5 text-[#555] group-hover:text-[#aaa] transition-colors" />
        <span className="text-[11px] font-semibold text-[#777] group-hover:text-[#bbb] transition-colors flex-1">Advanced Settings</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#555] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-[#2a2a2d] p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[#555] uppercase tracking-widest">Timeout (ms)</label>
            <input
              type="number" min={1000} max={3600000} step={1000}
              value={timeoutMs || 60000}
              onChange={(e) => onTimeoutChange(Number(e.target.value))}
              className="w-full bg-[#111] border border-[#2a2a2d] rounded-md px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-[#555] uppercase tracking-widest">On Failure</label>
            <select
              value={onFailureBehavior}
              onChange={(e) => setOnFailureBehavior(e.target.value)}
              className="w-full bg-[#111] border border-[#2a2a2d] rounded-md px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="retry">Retry then stop workflow</option>
              <option value="no_retry">Stop immediately (no retry)</option>
              <option value="error_path">Continue to error path</option>
            </select>
          </div>
          {onFailureBehavior === 'retry' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-[#555] uppercase tracking-widest">Max Retries</label>
              <input
                type="number" min={1} max={10}
                value={retryPolicy.maxAttempts || 3}
                onChange={(e) => updateRetryPolicy('maxAttempts', Number(e.target.value))}
                className="w-full bg-[#111] border border-[#2a2a2d] rounded-md px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
