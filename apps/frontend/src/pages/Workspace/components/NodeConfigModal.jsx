import { useEffect, useCallback, useRef, useState } from "react";
import { X, ChevronDown, Settings2, Play, CheckCircle, XCircle, Loader, Hash, Box, ToggleLeft, ListOrdered, Type, HelpCircle, Braces } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useWorkspaceStore from "../../../store/workspaceStore";
import { NodeRegistry } from "../nodeRegistry";
import { TRIGGER_VARIANTS } from "../triggerVariants";
import { DEFAULT_SCHEMAS } from "../../../store/schemaEngine";
import { NODE_DOCS } from "../../../lib/nodeDocumentation";
import api from "../../../lib/api";

// ── Per-trigger available actions/events ─────────────────────────────────────
const TRIGGER_ACTIONS = {
  manual: [
    { name: "Run from Dashboard",        description: "One-click trigger from the automation dashboard" },
    { name: "Run via REST API",          description: "POST to the run endpoint with a JSON payload" },
    { name: "Run via SDK",               description: "Trigger programmatically using the Blinkbox SDK" },
    { name: "Run with Custom Input",     description: "Pass a custom JSON body when triggering the run" },
    { name: "Test Mode Run",             description: "Execute in test mode without affecting production" },
    { name: "Scheduled Manual Run",      description: "Manually fire a run at a specific time" },
    { name: "Run with Metadata",         description: "Attach custom metadata to the triggered run" },
    { name: "Bulk Trigger",              description: "Trigger multiple runs in sequence via API" },
    { name: "Run with Idempotency Key",  description: "Deduplicate triggers using a unique key" },
    { name: "Webhook-backed Manual",     description: "Expose a one-time URL to fire the run remotely" },
    { name: "CLI Trigger",               description: "Fire the automation from the command line" },
  ],

  webhook: [
    { name: "POST Request Received",     description: "Fires when an HTTP POST hits the webhook URL" },
    { name: "GET Request Received",      description: "Fires when an HTTP GET hits the webhook URL" },
    { name: "PUT Request Received",      description: "Fires when an HTTP PUT hits the webhook URL" },
    { name: "DELETE Request Received",   description: "Fires when an HTTP DELETE hits the webhook URL" },
    { name: "Form Submission",           description: "Fires when a form posts URL-encoded data" },
    { name: "JSON Payload",              description: "Fires when a JSON body is received" },
    { name: "Signed Webhook",            description: "Fires only when HMAC signature is valid" },
    { name: "Authenticated Request",     description: "Fires when Authorization header is present" },
    { name: "Query Param Trigger",       description: "Fires on GET requests with specific query params" },
    { name: "File Upload",               description: "Fires when a multipart file upload is received" },
    { name: "Custom Path Hit",           description: "Fires when a specific URL path segment is hit" },
  ],

  chat: [
    { name: "New Chat Message",          description: "Fires when a user sends a message to the chat widget" },
    { name: "New Session Started",       description: "Fires when a new chat session begins" },
    { name: "Session Ended",             description: "Fires when a conversation session is closed" },
    { name: "File Attachment Sent",      description: "Fires when a user uploads a file in the chat" },
    { name: "Keyword Detected",          description: "Fires when a message contains a configured keyword" },
    { name: "User Identified",           description: "Fires when a user logs in and their identity is known" },
    { name: "Feedback Submitted",        description: "Fires when user rates or submits feedback on the chat" },
    { name: "Bot Handoff to Human",      description: "Fires when the conversation is escalated to an agent" },
    { name: "Inactivity Timeout",        description: "Fires when a session exceeds the idle timeout" },
    { name: "Custom Event Sent",         description: "Fires when the client emits a custom chat event" },
    { name: "Error in Chat Flow",        description: "Fires when the AI or chat pipeline throws an error" },
  ],

  cron: [
    { name: "Every Minute",              description: "Runs the automation once every minute" },
    { name: "Every Hour",                description: "Runs at the top of every hour" },
    { name: "Every Day at Time",         description: "Runs once daily at a configured time" },
    { name: "Every Week on Day",         description: "Runs once a week on a chosen weekday" },
    { name: "Every Month on Date",       description: "Runs on a specific date each month" },
    { name: "Custom Cron Expression",    description: "Run on any schedule using a cron string" },
    { name: "Multiple Times Daily",      description: "Runs several times per day at fixed intervals" },
    { name: "Business Hours Only",       description: "Fires only during configured business hours" },
    { name: "Weekdays Only",             description: "Runs Mon-Fri, skipping weekends" },
    { name: "First of Month",            description: "Fires on the 1st of every month" },
    { name: "Last Day of Month",         description: "Fires on the last calendar day of each month" },
  ],

  email: [
    { name: "New Email Received",        description: "Fires when any new email arrives at the inbox" },
    { name: "Email from Specific Sender",description: "Fires only when sender matches a configured address" },
    { name: "Subject Line Match",        description: "Fires when subject contains a keyword or pattern" },
    { name: "Email with Attachment",     description: "Fires when the incoming email has file attachments" },
    { name: "Email Marked as Spam",      description: "Fires when an email is flagged as spam" },
    { name: "Reply to Thread",           description: "Fires when a reply arrives in an existing thread" },
    { name: "Email in Folder",           description: "Fires when an email is delivered to a specific folder" },
    { name: "CC or BCC Match",           description: "Fires when your address appears in CC or BCC" },
    { name: "Email from Domain",         description: "Fires when sender domain matches a pattern" },
    { name: "High Priority Email",       description: "Fires when email is flagged with high importance" },
    { name: "Email with Label",          description: "Fires when a label is applied to an email" },
  ],

  imap: [
    { name: "New Email in INBOX",        description: "Fires when a new message arrives in the INBOX folder" },
    { name: "New Email in Folder",       description: "Fires when a message arrives in a specific IMAP folder" },
    { name: "Unread Email",              description: "Fires for each unread message found on polling" },
    { name: "Email with Attachment",     description: "Fires when an email has one or more attachments" },
    { name: "Email from Sender",         description: "Fires when sender matches a configured filter" },
    { name: "Flagged Email",             description: "Fires when the Flagged IMAP flag is set" },
    { name: "Email Moved to Folder",     description: "Fires when a message is moved between IMAP folders" },
    { name: "Email Deleted",             description: "Fires when a message is marked Deleted" },
    { name: "Subject Contains Keyword",  description: "Fires when subject matches a configured keyword" },
    { name: "Email Thread Reply",        description: "Fires when an In-Reply-To message is received" },
    { name: "Daily Digest Trigger",      description: "Collects emails and fires once per day as a batch" },
  ],

  rss: [
    { name: "New Article Published",     description: "Fires when a new item appears in the RSS feed" },
    { name: "Article with Keyword",      description: "Fires only when article title or content matches a keyword" },
    { name: "New Feed Item from Author", description: "Fires when a specific author publishes" },
    { name: "Article in Category",       description: "Fires when item belongs to a configured category tag" },
    { name: "Feed Updated",              description: "Fires when the feed lastBuildDate changes" },
    { name: "Enclosure / Podcast Episode",description: "Fires when a feed item includes a media enclosure" },
    { name: "Article with Image",        description: "Fires when item includes a media:content image" },
    { name: "High-Traffic Article",      description: "Fires based on a popularity or engagement score" },
    { name: "New Feed Item (Atom)",      description: "Fires for Atom-format feeds on new entry" },
    { name: "Digest - Multiple New Items",description: "Fires once per interval with all new items batched" },
    { name: "Feed Error / Unreachable",  description: "Fires when the feed URL returns an error" },
  ],

  database: [
    { name: "New Row Inserted",          description: "Fires when a new record is added to a table" },
    { name: "Row Updated",               description: "Fires when any field in a row changes" },
    { name: "Row Deleted",               description: "Fires when a record is removed from a table" },
    { name: "Field Value Changed",       description: "Fires when a specific column crosses a threshold" },
    { name: "Bulk Insert",               description: "Fires after a batch of rows is inserted" },
    { name: "New Row in View",           description: "Fires when a row becomes visible in a filtered view" },
    { name: "Scheduled Query",           description: "Runs a SQL query on a cron schedule" },
    { name: "Table Created",             description: "Fires when a new table is created in the database" },
    { name: "Connection Restored",       description: "Fires when a previously failed DB connection recovers" },
    { name: "Query Result Threshold",    description: "Fires when a query returns more/less than N rows" },
    { name: "Transaction Committed",     description: "Fires after a multi-statement transaction commits" },
  ],

  github: [
    { name: "Push to Branch",            description: "Fires when code is pushed to any branch" },
    { name: "Pull Request Opened",       description: "A new pull request is created" },
    { name: "Pull Request Merged",       description: "A pull request is successfully merged" },
    { name: "Pull Request Closed",       description: "A PR is closed without merging" },
    { name: "Issue Created",             description: "A new issue is opened in the repository" },
    { name: "Issue Commented",           description: "A comment is added to an issue" },
    { name: "Issue Closed",              description: "An issue is closed or resolved" },
    { name: "Release Published",         description: "A new GitHub Release is published" },
    { name: "Repository Starred",        description: "Someone stars the repository" },
    { name: "Branch Created",            description: "A new branch is pushed for the first time" },
    { name: "Review Submitted",          description: "A pull request code review is submitted" },
    { name: "Workflow Run Completed",    description: "A GitHub Actions workflow finishes" },
  ],

  stripe: [
    { name: "Payment Succeeded",         description: "A charge or payment intent is successfully paid" },
    { name: "Payment Failed",            description: "A charge attempt fails or is declined" },
    { name: "Subscription Created",      description: "A new subscription is activated" },
    { name: "Subscription Cancelled",    description: "A subscription is cancelled or expires" },
    { name: "Invoice Generated",         description: "A new invoice is created for a customer" },
    { name: "Invoice Paid",              description: "An invoice is marked as paid" },
    { name: "Customer Created",          description: "A new Stripe customer object is created" },
    { name: "Refund Issued",             description: "A refund is processed for a charge" },
    { name: "Dispute Opened",            description: "A chargeback or dispute is filed" },
    { name: "Trial Will End",            description: "A subscription trial period is about to expire" },
    { name: "Checkout Session Completed",description: "A Stripe Checkout session is completed" },
    { name: "Payout Sent",               description: "Stripe sends a payout to your bank account" },
  ],

  error: [
    { name: "Execution Error",           description: "Fires when any node in the workflow throws an error" },
    { name: "Node-Specific Error",       description: "Fires when a specific configured node fails" },
    { name: "Timeout Error",             description: "Fires when a node exceeds its timeout limit" },
    { name: "Rate Limit Hit",            description: "Fires when an external API returns 429" },
    { name: "Auth Error",                description: "Fires when an API call fails with 401 or 403" },
    { name: "Network Error",             description: "Fires on connection failures or DNS errors" },
    { name: "Data Validation Error",     description: "Fires when input data fails a validation rule" },
    { name: "Retry Exhausted",           description: "Fires after all retry attempts are used up" },
    { name: "Unhandled Exception",       description: "Fires when an unexpected JavaScript error occurs" },
    { name: "Partial Failure",           description: "Fires when some items in a batch fail" },
    { name: "Workflow Stuck",            description: "Fires when an execution is paused beyond a threshold" },
  ],

  telegram: [
    { name: "New Message in Chat",       description: "Fires when a message is sent to the bot" },
    { name: "New Group Message",         description: "Fires when a message is posted in a group the bot is in" },
    { name: "Callback Button Pressed",   description: "Fires when a user taps an inline keyboard button" },
    { name: "Command Received",          description: "Fires when a /command is sent to the bot" },
    { name: "Photo Received",            description: "Fires when a user sends a photo to the bot" },
    { name: "Document Received",         description: "Fires when a file or document is received" },
    { name: "Location Shared",           description: "Fires when a user shares their location" },
    { name: "New Chat Member",           description: "Fires when someone joins a group" },
    { name: "Member Left Chat",          description: "Fires when someone leaves or is removed from a group" },
    { name: "Poll Answer Received",      description: "Fires when a user votes in a Telegram poll" },
    { name: "Channel Post",              description: "Fires when a post is published in a Telegram channel" },
  ],

  slack: [
    { name: "New Message in Channel",    description: "Fires when any message is posted to a channel" },
    { name: "Direct Message Received",   description: "Fires when someone sends the app a DM" },
    { name: "App Mentioned",             description: "Fires when @YourApp is mentioned in any channel" },
    { name: "Reaction Added",            description: "Fires when an emoji reaction is added to a message" },
    { name: "New Channel Created",       description: "Fires when a new public or private channel is made" },
    { name: "Member Joined Channel",     description: "Fires when a user joins a channel" },
    { name: "Member Left Channel",       description: "Fires when a user leaves a channel" },
    { name: "File Shared",               description: "Fires when a file is uploaded to Slack" },
    { name: "Slash Command Used",        description: "Fires when a user runs a custom slash command" },
    { name: "Workflow Step Executed",    description: "Fires when a Slack Workflow calls your step" },
    { name: "Message Deleted",           description: "Fires when a message is deleted from a channel" },
    { name: "Bot Message Posted",        description: "Fires when another bot posts a message" },
  ],

  discord: [
    { name: "New Message in Channel",    description: "Fires when a message is sent to a text channel" },
    { name: "Bot Mentioned",             description: "Fires when the bot is @mentioned in any channel" },
    { name: "Member Joined Server",      description: "Fires when a new user joins the Discord server" },
    { name: "Member Left Server",        description: "Fires when a user leaves or is kicked" },
    { name: "Role Assigned to Member",   description: "Fires when a role is added to a user" },
    { name: "Reaction Added",            description: "Fires when an emoji reaction is added to a message" },
    { name: "Slash Command Used",        description: "Fires when a user invokes an application command" },
    { name: "Thread Created",            description: "Fires when a new thread is started in a channel" },
    { name: "Voice Channel Joined",      description: "Fires when a member joins a voice channel" },
    { name: "Stage Event Started",       description: "Fires when a Stage channel event begins" },
    { name: "Ban Added",                 description: "Fires when a member is banned from the server" },
  ],

  whatsapp: [
    { name: "New Text Message",          description: "Fires when a text message is received on the number" },
    { name: "Image Received",            description: "Fires when a user sends an image" },
    { name: "Document Received",         description: "Fires when a user sends a PDF or other file" },
    { name: "Audio Message Received",    description: "Fires when a voice note or audio clip arrives" },
    { name: "Location Shared",           description: "Fires when a user shares their GPS location" },
    { name: "Contact Card Received",     description: "Fires when a vCard contact is shared" },
    { name: "Button Reply Received",     description: "Fires when a user taps a quick-reply button" },
    { name: "List Reply Selected",       description: "Fires when a user picks an item from a list message" },
    { name: "Message Status Updated",    description: "Fires when a sent message status changes (sent/read)" },
    { name: "Opted In / Subscribed",     description: "Fires when a user opts in to receive messages" },
    { name: "Sticker Received",          description: "Fires when a WhatsApp sticker is received" },
  ],

  gmail: [
    { name: "New Email Received",        description: "Fires when a new email arrives in Gmail" },
    { name: "Email with Label Applied",  description: "Fires when Gmail applies a label to an email" },
    { name: "New Email in Thread",       description: "Fires when a reply arrives in an existing thread" },
    { name: "Email Marked as Starred",   description: "Fires when you star a message" },
    { name: "Email Sent",                description: "Fires when you send an email from Gmail" },
    { name: "Email Moved to Trash",      description: "Fires when an email is deleted to Trash" },
    { name: "Email from Specific Sender",description: "Fires only when a configured sender address matches" },
    { name: "Email with Attachment",     description: "Fires when an incoming email has attachments" },
    { name: "Important Email",           description: "Fires when Gmail marks an email as Important" },
    { name: "Draft Created",             description: "Fires when a new draft is saved in Gmail" },
    { name: "Email in Promotions Tab",   description: "Fires when an email lands in the Promotions tab" },
  ],

  airtable: [
    { name: "New Record Created",        description: "Fires when a new row is added to a table" },
    { name: "Record Updated",            description: "Fires when any field in a record changes" },
    { name: "Record Deleted",            description: "Fires when a record is removed from the table" },
    { name: "Field Value Changed",       description: "Fires when a specific field crosses a threshold" },
    { name: "New Record in View",        description: "Fires when a record becomes visible in a filtered view" },
    { name: "Status Field Changed",      description: "Fires when a Status or Single Select field changes" },
    { name: "New Attachment Uploaded",   description: "Fires when a file is attached to a record" },
    { name: "Record Linked to Another",  description: "Fires when a record is linked via a Linked Record field" },
    { name: "Form Submission",           description: "Fires when an Airtable form is submitted" },
    { name: "Comment Added to Record",   description: "Fires when a comment is added to a record" },
    { name: "Automation Run in Airtable",description: "Fires when an Airtable native automation triggers" },
  ],

  notion: [
    { name: "New Page Created",          description: "Fires when a new page is created in a database" },
    { name: "Page Property Updated",     description: "Fires when any property on a page changes" },
    { name: "Page Status Changed",       description: "Fires when the Status property changes value" },
    { name: "Page Archived",             description: "Fires when a page is moved to the archive" },
    { name: "New Database Entry",        description: "Fires when a row is added to a Notion database" },
    { name: "Comment Added",             description: "Fires when a comment is added to a page or block" },
    { name: "Page Shared",               description: "Fires when a page sharing settings change" },
    { name: "Relation Added",            description: "Fires when a page is linked to another via a relation" },
    { name: "Page Moved to Database",    description: "Fires when a page is moved into a different database" },
    { name: "Due Date Approaching",      description: "Fires when a Date property is within N days" },
    { name: "Checklist Item Completed",  description: "Fires when a To-do block is checked" },
  ],

  hubspot: [
    { name: "New Contact Created",       description: "Fires when a new contact is added to HubSpot" },
    { name: "Contact Property Changed",  description: "Fires when a contact property value is updated" },
    { name: "New Deal Created",          description: "Fires when a new deal is added to the CRM" },
    { name: "Deal Stage Changed",        description: "Fires when a deal moves to a different pipeline stage" },
    { name: "Deal Closed Won",           description: "Fires when a deal is marked as Closed Won" },
    { name: "Deal Closed Lost",          description: "Fires when a deal is marked as Closed Lost" },
    { name: "Form Submitted",            description: "Fires when a HubSpot form is submitted" },
    { name: "New Company Created",       description: "Fires when a new company record is added" },
    { name: "Email Opened",              description: "Fires when a contact opens a marketing email" },
    { name: "Email Link Clicked",        description: "Fires when a contact clicks a link in an email" },
    { name: "Contact Enrolled in Workflow",description: "Fires when a contact enters a HubSpot workflow" },
    { name: "Ticket Created",            description: "Fires when a new support ticket is opened" },
  ],

  shopify: [
    { name: "New Order Placed",          description: "Fires when a customer places a new order" },
    { name: "Order Fulfilled",           description: "Fires when an order fulfillment status is set" },
    { name: "Order Cancelled",           description: "Fires when an order is cancelled" },
    { name: "Order Refunded",            description: "Fires when a refund is issued on an order" },
    { name: "New Customer Created",      description: "Fires when a new customer account is created" },
    { name: "Product Created",           description: "Fires when a new product is added to the store" },
    { name: "Product Updated",           description: "Fires when a product title, price, or inventory changes" },
    { name: "Inventory Level Changed",   description: "Fires when stock quantity crosses a threshold" },
    { name: "Cart Abandoned",            description: "Fires when a checkout is abandoned without payment" },
    { name: "Payment Received",          description: "Fires when payment is successfully captured" },
    { name: "Subscription Created",      description: "Fires when a new subscription order is created" },
    { name: "Draft Order Created",       description: "Fires when a draft order is saved" },
  ],

  linear: [
    { name: "New Issue Created",         description: "Fires when a new issue is added to a team" },
    { name: "Issue Status Changed",      description: "Fires when an issue moves to a different state" },
    { name: "Issue Assigned",            description: "Fires when an issue is assigned to a team member" },
    { name: "Issue Completed",           description: "Fires when an issue reaches the Done / Completed state" },
    { name: "Issue Commented",           description: "Fires when a comment is added to an issue" },
    { name: "Issue Priority Changed",    description: "Fires when the priority level of an issue changes" },
    { name: "New Project Created",       description: "Fires when a new project is created in Linear" },
    { name: "Project Milestone Reached", description: "Fires when a project hits a configured milestone" },
    { name: "Issue Moved to Cycle",      description: "Fires when an issue is added to a sprint cycle" },
    { name: "Label Added to Issue",      description: "Fires when a label is applied to an issue" },
    { name: "Issue Blocked",             description: "Fires when an issue is marked as blocked" },
  ],

  typeform: [
    { name: "Form Response Submitted",   description: "Fires when a respondent completes and submits a form" },
    { name: "Partial Response Saved",    description: "Fires when a respondent saves a partially filled form" },
    { name: "Specific Answer Given",     description: "Fires when a specific field has a configured value" },
    { name: "Score Above Threshold",     description: "Fires when a score/number field exceeds a value" },
    { name: "NPS Response Received",     description: "Fires when a Net Promoter Score response arrives" },
    { name: "File Upload Submitted",     description: "Fires when a respondent uploads a file in the form" },
    { name: "New Form Published",        description: "Fires when a Typeform form is published" },
    { name: "Hidden Field Matched",      description: "Fires when a hidden field contains a specific value" },
    { name: "Response Tag Applied",      description: "Fires when a tag is added to a response" },
    { name: "Low Score Alert",           description: "Fires when a rating field gets a low value" },
    { name: "Response via API",          description: "Fires when a response is submitted via Typeform API" },
  ],

  google_calendar: [
    { name: "New Event Created",         description: "Fires when a new event is added to the calendar" },
    { name: "Event Updated",             description: "Fires when an existing event is modified" },
    { name: "Event Deleted",             description: "Fires when an event is removed from the calendar" },
    { name: "Event Starts Soon",         description: "Fires N minutes before an event begins" },
    { name: "Event Started",             description: "Fires exactly when an event start time is reached" },
    { name: "Event Ended",               description: "Fires when an event end time passes" },
    { name: "Invite Accepted",           description: "Fires when an attendee accepts an invitation" },
    { name: "Invite Declined",           description: "Fires when an attendee declines an invitation" },
    { name: "Recurring Event Triggered", description: "Fires for each occurrence of a recurring event" },
    { name: "All-Day Event Created",     description: "Fires when an all-day event is added" },
    { name: "Event with Attachment",     description: "Fires when an event has a Google Drive attachment" },
  ],

  google_sheets: [
    { name: "New Row Added",             description: "Fires when a new row is appended to the spreadsheet" },
    { name: "Row Updated",               description: "Fires when any cell in an existing row changes" },
    { name: "Cell Value Changed",        description: "Fires when a specific cell or range changes" },
    { name: "Row Deleted",               description: "Fires when a row is removed from the sheet" },
    { name: "New Sheet Created",         description: "Fires when a new tab/sheet is added to the workbook" },
    { name: "Form Response Logged",      description: "Fires when a Google Form writes to the sheet" },
    { name: "Scheduled Spreadsheet Read",description: "Polls the sheet on a cron schedule" },
    { name: "Column Threshold Crossed",  description: "Fires when a number column exceeds a set value" },
    { name: "First Empty Row",           description: "Fires when data fills up to the next empty row" },
    { name: "Named Range Changed",       description: "Fires when values inside a named range update" },
    { name: "Spreadsheet Shared",        description: "Fires when sharing permissions are changed" },
  ],

  jira: [
    { name: "New Issue Created",         description: "Fires when a new Jira issue is created" },
    { name: "Issue Status Changed",      description: "Fires when an issue transitions between statuses" },
    { name: "Issue Assigned",            description: "Fires when an issue is assigned to a team member" },
    { name: "Issue Commented",           description: "Fires when a comment is added to an issue" },
    { name: "Issue Priority Changed",    description: "Fires when the priority of an issue is updated" },
    { name: "Sprint Started",            description: "Fires when a new sprint begins" },
    { name: "Sprint Completed",          description: "Fires when a sprint is closed" },
    { name: "Issue Moved to Sprint",     description: "Fires when an issue is added to a sprint" },
    { name: "Version Released",          description: "Fires when a Fix Version is marked as released" },
    { name: "Issue Linked",              description: "Fires when a link (blocks/duplicates) is added" },
    { name: "Epic Updated",              description: "Fires when an Epic fields are modified" },
  ],

  github_issue: [
    { name: "Issue Opened",              description: "Fires when a new GitHub issue is created" },
    { name: "Issue Closed",              description: "Fires when an issue is closed" },
    { name: "Issue Reopened",            description: "Fires when a previously closed issue is reopened" },
    { name: "Issue Assigned",            description: "Fires when a user is assigned to an issue" },
    { name: "Issue Labeled",             description: "Fires when a label is added to an issue" },
    { name: "Issue Milestoned",          description: "Fires when an issue is added to a milestone" },
    { name: "Issue Commented",           description: "Fires when a new comment is posted on an issue" },
    { name: "Comment Edited",            description: "Fires when an existing issue comment is edited" },
    { name: "Issue Transferred",         description: "Fires when an issue is transferred to another repo" },
    { name: "Pinned / Unpinned",         description: "Fires when an issue is pinned or unpinned" },
    { name: "Issue Body Edited",         description: "Fires when the issue description is updated" },
  ],

  trello: [
    { name: "New Card Created",          description: "Fires when a card is added to a board" },
    { name: "Card Moved to List",        description: "Fires when a card is dragged to a different list" },
    { name: "Card Archived",             description: "Fires when a card is archived" },
    { name: "Due Date Added",            description: "Fires when a due date is set on a card" },
    { name: "Due Date Passed",           description: "Fires when a card due date has passed" },
    { name: "Checklist Item Completed",  description: "Fires when a checklist item is checked off" },
    { name: "Member Added to Card",      description: "Fires when a team member is assigned to a card" },
    { name: "Label Added to Card",       description: "Fires when a label is applied to a card" },
    { name: "Attachment Added",          description: "Fires when a file or link is attached to a card" },
    { name: "Comment Added",             description: "Fires when a comment is posted on a card" },
    { name: "New Board Created",         description: "Fires when a new Trello board is created" },
  ],

  gitlab: [
    { name: "Push to Branch",            description: "Fires when commits are pushed to any branch" },
    { name: "Merge Request Opened",      description: "Fires when a new MR is created" },
    { name: "Merge Request Merged",      description: "Fires when an MR is accepted and merged" },
    { name: "Pipeline Started",          description: "Fires when a CI/CD pipeline is triggered" },
    { name: "Pipeline Succeeded",        description: "Fires when a pipeline completes successfully" },
    { name: "Pipeline Failed",           description: "Fires when a pipeline job fails" },
    { name: "Issue Created",             description: "Fires when a new GitLab issue is opened" },
    { name: "Issue Closed",              description: "Fires when an issue is closed" },
    { name: "Release Created",           description: "Fires when a new release tag is created" },
    { name: "Container Image Pushed",    description: "Fires when an image is pushed to the Registry" },
    { name: "Wiki Page Created",         description: "Fires when a new wiki page is added" },
  ],

  sentry: [
    { name: "New Issue Created",         description: "Fires when a new error group is first seen" },
    { name: "Issue Regressed",           description: "Fires when a resolved issue reappears" },
    { name: "Issue Resolved",            description: "Fires when an issue is marked as resolved" },
    { name: "High Error Volume",         description: "Fires when error count exceeds a threshold" },
    { name: "New Performance Issue",     description: "Fires on N+1 queries or slow transactions" },
    { name: "Alert Rule Triggered",      description: "Fires when a custom Sentry alert rule fires" },
    { name: "Issue Assigned",            description: "Fires when an issue is assigned to a team member" },
    { name: "First Occurrence in Release",description: "Fires when an error appears in a specific release" },
    { name: "User Feedback Submitted",   description: "Fires when a user submits feedback via Sentry" },
    { name: "Deploy Created",            description: "Fires when a new deployment is tracked in Sentry" },
    { name: "Spike Protection Triggered",description: "Fires when Sentry spike protection activates" },
  ],

  vercel: [
    { name: "Deployment Succeeded",      description: "Fires when a Vercel deployment finishes successfully" },
    { name: "Deployment Failed",         description: "Fires when a deployment fails or errors out" },
    { name: "Deployment Created",        description: "Fires when a new deployment is initiated" },
    { name: "Preview Deployment Ready",  description: "Fires when a preview branch deployment is live" },
    { name: "Production Deployment",     description: "Fires when the main/production branch deploys" },
    { name: "Domain Added",              description: "Fires when a custom domain is added to a project" },
    { name: "Environment Variable Added",description: "Fires when a new env var is created" },
    { name: "Function Invocation Error", description: "Fires on Serverless Function runtime errors" },
    { name: "Edge Config Updated",       description: "Fires when an Edge Config store is modified" },
    { name: "Build Cancelled",           description: "Fires when a build is manually cancelled" },
    { name: "New Team Member Added",     description: "Fires when a user joins the Vercel team" },
  ],

  pagerduty: [
    { name: "New Incident Triggered",    description: "Fires when a new PagerDuty incident is created" },
    { name: "Incident Acknowledged",     description: "Fires when an on-call engineer acknowledges an incident" },
    { name: "Incident Resolved",         description: "Fires when an incident is marked as resolved" },
    { name: "Incident Escalated",        description: "Fires when an incident is escalated to a higher level" },
    { name: "On-Call Handoff",           description: "Fires at the start of a new on-call shift" },
    { name: "High Severity Incident",    description: "Fires for P1 or SEV-1 severity incidents only" },
    { name: "Service Disruption",        description: "Fires when a service goes into a failure state" },
    { name: "Alert Suppressed",          description: "Fires when an alert is suppressed by maintenance mode" },
    { name: "Schedule Override Added",   description: "Fires when a schedule override is created" },
    { name: "Incident Note Added",       description: "Fires when a note is posted to an incident" },
    { name: "Webhook Subscription Event",description: "Fires for any custom PagerDuty webhook subscription" },
  ],

  datadog: [
    { name: "Monitor Alert Triggered",   description: "Fires when a Datadog monitor enters ALERT state" },
    { name: "Monitor Recovered",         description: "Fires when a monitor returns to OK state" },
    { name: "Monitor Warning Triggered", description: "Fires when a monitor enters WARNING state" },
    { name: "Anomaly Detected",          description: "Fires when anomaly detection flags unusual metrics" },
    { name: "SLO Breach",                description: "Fires when an SLO error budget is depleted" },
    { name: "New Error in Logs",         description: "Fires when a new error log pattern is detected" },
    { name: "Log Query Threshold Hit",   description: "Fires when a log query exceeds a count threshold" },
    { name: "APM Latency Spike",         description: "Fires when service latency exceeds a threshold" },
    { name: "Security Signal",           description: "Fires when a CSPM or SIEM security signal fires" },
    { name: "Cost Threshold Crossed",    description: "Fires when estimated cloud costs exceed a budget" },
    { name: "Incident Created",          description: "Fires when a Datadog Incident is declared" },
  ],

  zendesk: [
    { name: "New Ticket Created",        description: "Fires when a new support ticket is submitted" },
    { name: "Ticket Status Changed",     description: "Fires when a ticket moves between statuses" },
    { name: "Ticket Assigned",           description: "Fires when a ticket is assigned to an agent" },
    { name: "Ticket Solved",             description: "Fires when a ticket is marked as Solved" },
    { name: "New Comment Added",         description: "Fires when a public or private reply is added" },
    { name: "Ticket Escalated",          description: "Fires when a ticket is escalated to a higher tier" },
    { name: "SLA Breach Warning",        description: "Fires when a ticket is close to breaching SLA" },
    { name: "CSAT Survey Response",      description: "Fires when a customer submits a satisfaction rating" },
    { name: "New User Created",          description: "Fires when a new end-user profile is created" },
    { name: "Trigger or Automation Fired",description: "Fires when a Zendesk built-in trigger executes" },
    { name: "Ticket Merged",             description: "Fires when two tickets are merged into one" },
  ],

  calendly: [
    { name: "Meeting Scheduled",         description: "Fires when a new event is booked via Calendly" },
    { name: "Meeting Cancelled",         description: "Fires when an invitee cancels their booking" },
    { name: "Meeting Rescheduled",       description: "Fires when a meeting is moved to a new time" },
    { name: "No-Show Detected",          description: "Fires when an attendee misses their meeting" },
    { name: "New Invitee Created",       description: "Fires when a first-time invitee books with you" },
    { name: "Routing Form Submitted",    description: "Fires when a Calendly routing form is filled" },
    { name: "Meeting Reminder Sent",     description: "Fires N hours before a scheduled meeting" },
    { name: "Event Type Created",        description: "Fires when a new Calendly event type is created" },
    { name: "Round Robin Assignment",    description: "Fires when round-robin assigns a meeting to a host" },
    { name: "Payment Collected",         description: "Fires when Stripe payment is collected at booking" },
    { name: "Group Event Filled",        description: "Fires when all spots in a group event are booked" },
  ],

  mailchimp: [
    { name: "New Subscriber",            description: "Fires when someone subscribes to your audience" },
    { name: "Subscriber Unsubscribed",   description: "Fires when a contact unsubscribes" },
    { name: "Campaign Sent",             description: "Fires when an email campaign is sent" },
    { name: "Email Opened",              description: "Fires when a recipient opens a campaign email" },
    { name: "Link Clicked",              description: "Fires when a recipient clicks a link in an email" },
    { name: "Email Bounced",             description: "Fires when an email hard or soft bounces" },
    { name: "Audience Cleaned",          description: "Fires when a contact is cleaned from the audience" },
    { name: "Campaign Created",          description: "Fires when a new campaign is created (not yet sent)" },
    { name: "Automation Email Sent",     description: "Fires when an automation journey sends an email" },
    { name: "Tag Added to Contact",      description: "Fires when a tag is applied to a subscriber" },
    { name: "Survey Response Received",  description: "Fires when a Mailchimp survey gets a response" },
  ],

  clickup: [
    { name: "Task Created",              description: "Fires when a new task is added to a space" },
    { name: "Task Status Changed",       description: "Fires when a task moves to a different status" },
    { name: "Task Assigned",             description: "Fires when a task is assigned to a member" },
    { name: "Task Completed",            description: "Fires when a task is marked complete" },
    { name: "Due Date Changed",          description: "Fires when a task due date is updated" },
    { name: "Comment Posted",            description: "Fires when a comment is added to a task" },
    { name: "Checklist Item Completed",  description: "Fires when a checklist item in a task is checked" },
    { name: "Time Entry Logged",         description: "Fires when time is tracked against a task" },
    { name: "Priority Changed",          description: "Fires when the priority of a task changes" },
    { name: "Custom Field Updated",      description: "Fires when a custom field value is changed" },
    { name: "New List Created",          description: "Fires when a new list is added to a folder" },
  ],

  monday: [
    { name: "Item Created",              description: "Fires when a new item is added to a board" },
    { name: "Item Status Changed",       description: "Fires when a Status column value changes" },
    { name: "Item Assigned",             description: "Fires when a People column is updated" },
    { name: "Column Value Changed",      description: "Fires when any column value on an item is updated" },
    { name: "Due Date Passed",           description: "Fires when an item date column passes today" },
    { name: "Subitem Created",           description: "Fires when a subitem is added under a parent item" },
    { name: "Item Moved to Group",       description: "Fires when an item is moved between board groups" },
    { name: "New Update Posted",         description: "Fires when a team member posts an update on an item" },
    { name: "Item Archived",             description: "Fires when an item is archived from the board" },
    { name: "Board Created",             description: "Fires when a new Monday.com board is created" },
    { name: "Automation Triggered",      description: "Fires when a Monday.com native automation runs" },
  ],

  figma: [
    { name: "Comment Added to File",     description: "Fires when a comment is posted on a Figma file" },
    { name: "Comment Resolved",          description: "Fires when a comment thread is marked resolved" },
    { name: "File Updated",              description: "Fires when a Figma file is saved / auto-saved" },
    { name: "Version Created",           description: "Fires when a named version is saved in a file" },
    { name: "Component Published",       description: "Fires when a component is published to a library" },
    { name: "Team Member Invited",       description: "Fires when a new member joins the Figma team" },
    { name: "File Moved to Project",     description: "Fires when a file is moved between projects" },
    { name: "Prototype Commented",       description: "Fires when a comment is added in prototype mode" },
    { name: "Dev Mode Annotation Added", description: "Fires when a dev annotation is added to a frame" },
    { name: "Plugin Run",                description: "Fires when a specific Figma plugin is executed" },
    { name: "Branch Created",            description: "Fires when a branch is created from a file" },
  ],

  asana: [
    { name: "New Task Created",          description: "Fires when a task is added to a project" },
    { name: "Task Completed",            description: "Fires when a task is marked complete" },
    { name: "Task Assigned",             description: "Fires when a task is assigned to a team member" },
    { name: "Task Due Date Changed",     description: "Fires when the due date of a task is updated" },
    { name: "Task Commented",            description: "Fires when a comment is posted on a task" },
    { name: "Section Changed",           description: "Fires when a task is moved to a different section" },
    { name: "New Project Created",       description: "Fires when a new Asana project is created" },
    { name: "Project Status Updated",    description: "Fires when the project status is changed" },
    { name: "Subtask Created",           description: "Fires when a subtask is added to an existing task" },
    { name: "Task Liked",                description: "Fires when a team member likes/hearts a task" },
    { name: "Tag Added to Task",         description: "Fires when a tag is applied to a task" },
  ],

  pipedrive: [
    { name: "New Deal Created",          description: "Fires when a deal is added to the pipeline" },
    { name: "Deal Stage Changed",        description: "Fires when a deal advances or retreats in the pipeline" },
    { name: "Deal Won",                  description: "Fires when a deal is marked as Won" },
    { name: "Deal Lost",                 description: "Fires when a deal is marked as Lost" },
    { name: "New Person Created",        description: "Fires when a new contact/person is added" },
    { name: "New Organization Added",    description: "Fires when a new company is added" },
    { name: "Activity Created",          description: "Fires when an activity (call, meeting) is logged" },
    { name: "Note Added",                description: "Fires when a note is attached to a deal or contact" },
    { name: "Email Linked to Deal",      description: "Fires when an email is associated with a deal" },
    { name: "Deal Rotting",              description: "Fires when a deal has been inactive for N days" },
    { name: "Pipeline Stage Reached",    description: "Fires when any deal enters a configured stage" },
  ],

  google_drive: [
    { name: "New File Created",          description: "Fires when a file is created in a monitored folder" },
    { name: "File Updated",              description: "Fires when a file content is modified" },
    { name: "File Deleted",              description: "Fires when a file is moved to Trash" },
    { name: "File Shared",               description: "Fires when sharing permissions change" },
    { name: "New Folder Created",        description: "Fires when a subfolder is created" },
    { name: "File Moved",                description: "Fires when a file is moved between folders" },
    { name: "File Renamed",              description: "Fires when a file name changes" },
    { name: "Comment Added to File",     description: "Fires when a Drive comment is added" },
    { name: "File Downloaded",           description: "Fires when a file is downloaded from Drive" },
    { name: "Ownership Transferred",     description: "Fires when file ownership changes" },
    { name: "New File by Specific User", description: "Fires only when a specific user creates a file" },
  ],

  google_forms: [
    { name: "Form Response Submitted",   description: "Fires when a respondent submits the form" },
    { name: "Specific Answer Matched",   description: "Fires when a question has a configured value" },
    { name: "File Upload Received",      description: "Fires when a respondent uploads a file" },
    { name: "Score Threshold Crossed",   description: "Fires for quiz submissions above/below a score" },
    { name: "Form Opened",               description: "Fires when a respondent starts filling the form" },
    { name: "New Response in Sheet",     description: "Fires when a linked Sheet receives a new row" },
    { name: "Email Notification Sent",   description: "Fires after Google Forms sends a confirmation email" },
    { name: "Form Published",            description: "Fires when a form accepting status changes" },
    { name: "Response Edited",           description: "Fires when a response is edited post-submission" },
    { name: "Daily Response Summary",    description: "Fires once a day with all responses batched" },
    { name: "Low Response Rate Alert",   description: "Fires when response rate drops below a threshold" },
  ],

  outlook: [
    { name: "New Email Received",        description: "Fires when a new email arrives in Outlook inbox" },
    { name: "Email Flagged",             description: "Fires when an email is flagged for follow-up" },
    { name: "Email Moved to Folder",     description: "Fires when an email is moved to a specific folder" },
    { name: "Calendar Event Created",    description: "Fires when a new Outlook calendar event is created" },
    { name: "Meeting Invite Received",   description: "Fires when a meeting invitation arrives" },
    { name: "Email Sent",                description: "Fires when an email is sent from Outlook" },
    { name: "Email with Attachment",     description: "Fires when an incoming email has an attachment" },
    { name: "Email from VIP Sender",     description: "Fires when sender is in the VIP/focused list" },
    { name: "Contact Created",           description: "Fires when a new Outlook contact is added" },
    { name: "Task Created in Outlook",   description: "Fires when a new task is added to Outlook Tasks" },
    { name: "Category Applied",          description: "Fires when a color category is applied to an email" },
  ],

  teams: [
    { name: "New Message in Channel",    description: "Fires when a message is posted in a Teams channel" },
    { name: "Direct Message Received",   description: "Fires when someone sends the bot a direct message" },
    { name: "Bot Mentioned",             description: "Fires when the bot is @mentioned in a channel" },
    { name: "Meeting Started",           description: "Fires when a Teams meeting begins" },
    { name: "Meeting Ended",             description: "Fires when a Teams meeting concludes" },
    { name: "File Uploaded to Channel",  description: "Fires when a file is shared in a Teams channel" },
    { name: "New Team Created",          description: "Fires when a new Team is created in the tenant" },
    { name: "Member Added to Team",      description: "Fires when a user joins a Team" },
    { name: "Tab Created in Channel",    description: "Fires when a new tab is pinned to a channel" },
    { name: "Adaptive Card Submitted",   description: "Fires when a user submits an Adaptive Card form" },
    { name: "Channel Created",           description: "Fires when a new channel is added to a Team" },
  ],

  http_monitor: [
    { name: "Site Down",                 description: "Fires when the monitored URL stops responding" },
    { name: "Site Recovered",            description: "Fires when a down site comes back online" },
    { name: "Status Code Changed",       description: "Fires when the HTTP response code changes" },
    { name: "Response Time Exceeded",    description: "Fires when response time exceeds a threshold" },
    { name: "SSL Certificate Expiring",  description: "Fires N days before the TLS cert expires" },
    { name: "SSL Certificate Expired",   description: "Fires when the TLS cert has expired" },
    { name: "Content Changed",           description: "Fires when page body content changes" },
    { name: "Keyword Found",             description: "Fires when a keyword appears in the response" },
    { name: "Keyword Missing",           description: "Fires when an expected keyword is absent" },
    { name: "Redirect Chain Changed",    description: "Fires when the URL redirect chain is modified" },
    { name: "Domain Expiring",           description: "Fires N days before the domain registration expires" },
  ],

  ssl: [
    { name: "Certificate Expiring Soon", description: "Fires N days before the SSL cert expires" },
    { name: "Certificate Expired",       description: "Fires when the certificate has expired" },
    { name: "Certificate Renewed",       description: "Fires when a new certificate is detected" },
    { name: "Certificate Invalid",       description: "Fires when cert validation fails" },
    { name: "Weak Cipher Detected",      description: "Fires when a weak cipher suite is in use" },
    { name: "Subject Name Mismatch",     description: "Fires when the cert CN does not match the domain" },
    { name: "Chain of Trust Broken",     description: "Fires when the cert chain is incomplete" },
    { name: "HSTS Header Missing",       description: "Fires when Strict-Transport-Security header is absent" },
    { name: "New Certificate Issued",    description: "Fires on CT log detection of a new cert for the domain" },
    { name: "Wildcard Cert Detected",    description: "Fires when a wildcard certificate is found" },
    { name: "Self-Signed Cert",          description: "Fires when a self-signed certificate is detected" },
  ],

  dns: [
    { name: "DNS Record Changed",        description: "Fires when any DNS record for the domain changes" },
    { name: "A Record Changed",          description: "Fires when the IPv4 A record changes" },
    { name: "MX Record Changed",         description: "Fires when the mail exchanger records change" },
    { name: "NS Record Changed",         description: "Fires when name server records change" },
    { name: "CNAME Added or Removed",    description: "Fires when a CNAME record is added or removed" },
    { name: "TXT Record Changed",        description: "Fires when TXT records (SPF, DKIM) change" },
    { name: "DNS Propagation Lag",       description: "Fires when propagation takes longer than expected" },
    { name: "Domain Expiring",           description: "Fires N days before domain registration expires" },
    { name: "Subdomain Takeover Risk",   description: "Fires when a dangling CNAME is detected" },
    { name: "DNSSEC Failure",            description: "Fires when DNSSEC validation fails" },
    { name: "New Subdomain Detected",    description: "Fires when a new subdomain appears in DNS" },
  ],

  hackernews: [
    { name: "New Top Story",             description: "Fires when a story reaches the top stories list" },
    { name: "New Story Matching Keyword",description: "Fires when title contains a configured keyword" },
    { name: "New Ask HN Post",           description: "Fires when a new Ask HN thread is posted" },
    { name: "New Show HN Post",          description: "Fires when a new Show HN thread is posted" },
    { name: "Story Reaches N Points",    description: "Fires when a story crosses a score threshold" },
    { name: "New Comment on Story",      description: "Fires when a comment is added to a tracked story" },
    { name: "New Job Post",              description: "Fires when a new HN Who is Hiring entry appears" },
    { name: "Keyword in Comments",       description: "Fires when a comment contains a configured keyword" },
    { name: "New Submission by User",    description: "Fires when a specific HN user submits a story" },
    { name: "Front Page Entry",          description: "Fires when a story first appears on the front page" },
    { name: "Story Drops Off Front Page",description: "Fires when a tracked story leaves the front page" },
  ],

  reddit: [
    { name: "New Post in Subreddit",     description: "Fires when a new post is submitted to a subreddit" },
    { name: "New Comment on Post",       description: "Fires when a comment is added to a tracked post" },
    { name: "Post Reaches N Upvotes",    description: "Fires when a post crosses an upvote threshold" },
    { name: "Keyword Mentioned in Post", description: "Fires when post title or body contains a keyword" },
    { name: "Keyword in Comment",        description: "Fires when a comment contains a keyword" },
    { name: "Post Awarded",              description: "Fires when a post receives a Reddit award" },
    { name: "New Post by User",          description: "Fires when a specific user submits a new post" },
    { name: "Post Removed by Mods",      description: "Fires when a post is removed by moderators" },
    { name: "New Mod Mail",              description: "Fires when a modmail message arrives" },
    { name: "User Mentioned",            description: "Fires when a username is mentioned in a post/comment" },
    { name: "Post Flaired",              description: "Fires when a post flair is applied" },
  ],

  woocommerce: [
    { name: "New Order Placed",          description: "Fires when a customer places a new order" },
    { name: "Order Status Changed",      description: "Fires when an order moves between statuses" },
    { name: "Order Completed",           description: "Fires when an order is fully completed" },
    { name: "Order Refunded",            description: "Fires when a refund is processed" },
    { name: "New Customer Registered",   description: "Fires when a new WooCommerce account is created" },
    { name: "Product Out of Stock",      description: "Fires when product stock reaches zero" },
    { name: "Low Stock Alert",           description: "Fires when stock drops below a threshold" },
    { name: "Product Review Submitted",  description: "Fires when a product review is posted" },
    { name: "Coupon Used",               description: "Fires when a discount coupon is applied at checkout" },
    { name: "Subscription Renewed",      description: "Fires when a WooCommerce subscription renews" },
    { name: "Abandoned Cart",            description: "Fires when a cart is inactive for N minutes" },
  ],

  intercom: [
    { name: "New Conversation Started",  description: "Fires when a user opens a new Intercom conversation" },
    { name: "Message Received",          description: "Fires when a user sends a message in chat" },
    { name: "Conversation Assigned",     description: "Fires when a conversation is assigned to a teammate" },
    { name: "Conversation Closed",       description: "Fires when a conversation is resolved/closed" },
    { name: "New Lead Created",          description: "Fires when a new lead is added to Intercom" },
    { name: "User Event Tracked",        description: "Fires when a custom event is tracked for a user" },
    { name: "User Tag Added",            description: "Fires when a tag is applied to a user" },
    { name: "User Attribute Changed",    description: "Fires when a custom attribute value changes" },
    { name: "Survey Response Submitted", description: "Fires when a user responds to an Intercom survey" },
    { name: "Note Added to Conversation",description: "Fires when a teammate adds an internal note" },
    { name: "Outbound Message Sent",     description: "Fires when an outbound message campaign sends" },
  ],

  instagram: [
    { name: "New Post Published",        description: "Fires when a new photo/video post is published" },
    { name: "New Story Posted",          description: "Fires when a new Story is added to your account" },
    { name: "New Reel Published",        description: "Fires when a Reel is published" },
    { name: "New Comment on Post",       description: "Fires when a comment is added to a post" },
    { name: "Mention in Post or Story",  description: "Fires when your handle is @mentioned" },
    { name: "New Follower",              description: "Fires when someone follows your account" },
    { name: "Post Reaches N Likes",      description: "Fires when a post crosses a like threshold" },
    { name: "New DM Received",           description: "Fires when a direct message is received" },
    { name: "Post Tagged",               description: "Fires when another account tags you in a post" },
    { name: "Live Stream Started",       description: "Fires when an Instagram Live begins" },
    { name: "Comment Keyword Detected",  description: "Fires when a comment contains a configured keyword" },
  ],

  tiktok: [
    { name: "New Video Published",       description: "Fires when a new TikTok video is posted" },
    { name: "Video Reaches N Views",     description: "Fires when a video crosses a view count threshold" },
    { name: "New Follower Gained",       description: "Fires when someone follows your TikTok account" },
    { name: "New Comment on Video",      description: "Fires when a comment is added to a video" },
    { name: "Video Goes Viral",          description: "Fires when engagement metrics spike rapidly" },
    { name: "Duet Created",              description: "Fires when someone duets your video" },
    { name: "Stitch Created",            description: "Fires when someone stitches your video" },
    { name: "Live Stream Started",       description: "Fires when a TikTok LIVE session begins" },
    { name: "Mention in Caption",        description: "Fires when your handle is tagged in a caption" },
    { name: "Video Liked N Times",       description: "Fires when a video crosses a like threshold" },
    { name: "Comment Keyword Match",     description: "Fires when a comment matches a keyword" },
  ],

  youtube: [
    { name: "New Video Uploaded",        description: "Fires when a new video is published to a channel" },
    { name: "Video Reaches N Views",     description: "Fires when a video crosses a view count" },
    { name: "New Subscriber",            description: "Fires when the channel gains a new subscriber" },
    { name: "New Comment on Video",      description: "Fires when a comment is posted on a video" },
    { name: "Comment Keyword Match",     description: "Fires when a comment contains a configured keyword" },
    { name: "Live Stream Started",       description: "Fires when a YouTube Live broadcast begins" },
    { name: "Live Stream Ended",         description: "Fires when a YouTube Live broadcast ends" },
    { name: "New Playlist Video Added",  description: "Fires when a video is added to a monitored playlist" },
    { name: "Channel Milestone",         description: "Fires on subscriber milestones (100K, 1M etc.)" },
    { name: "Caption / Transcript Added",description: "Fires when a transcript is added to a video" },
    { name: "Video Disliked Threshold",  description: "Fires when dislikes cross a ratio threshold" },
  ],

  price_alert: [
    { name: "Price Dropped",             description: "Fires when a tracked product price falls" },
    { name: "Price Increased",           description: "Fires when a tracked product price rises" },
    { name: "Price Below Threshold",     description: "Fires when price drops under a configured value" },
    { name: "Price Above Threshold",     description: "Fires when price rises over a configured value" },
    { name: "Price Returned to Normal",  description: "Fires when a sale price reverts to original" },
    { name: "Stock Available",           description: "Fires when an out-of-stock item becomes available" },
    { name: "Flash Sale Detected",       description: "Fires when price drops by more than N%" },
    { name: "Price History Change",      description: "Fires when the 30-day low is broken" },
    { name: "Competitor Price Changed",  description: "Fires when a competitor price changes" },
    { name: "Deal Score Threshold",      description: "Fires when deal scoring algorithm flags a buy" },
    { name: "Price Alert Expired",       description: "Fires when a tracked item alert window closes" },
  ],

  port_monitor: [
    { name: "Port Closed",               description: "Fires when a monitored TCP port stops accepting connections" },
    { name: "Port Opened",               description: "Fires when a previously closed port becomes reachable" },
    { name: "Connection Timeout",        description: "Fires when a connection attempt times out" },
    { name: "Latency Spike",             description: "Fires when connection latency exceeds a threshold" },
    { name: "Unexpected Port Open",      description: "Fires when an unmonitored port is found open" },
    { name: "Service Banner Changed",    description: "Fires when the service banner/fingerprint changes" },
    { name: "TLS Handshake Failed",      description: "Fires when TLS negotiation fails on a secure port" },
    { name: "Rate Limit on Port",        description: "Fires when connection attempts are throttled" },
    { name: "New Open Port Discovered",  description: "Fires when a new port is found open on the host" },
    { name: "Port Flapping",             description: "Fires when a port repeatedly opens and closes" },
    { name: "Port Scan Detected",        description: "Fires when a port scan is detected on the host" },
  ],

  docker: [
    { name: "Container Started",         description: "Fires when a Docker container starts" },
    { name: "Container Stopped",         description: "Fires when a container is stopped gracefully" },
    { name: "Container Crashed",         description: "Fires when a container exits with a non-zero code" },
    { name: "Image Pushed",              description: "Fires when a Docker image is pushed to a registry" },
    { name: "Image Pulled",              description: "Fires when a Docker image is pulled locally" },
    { name: "Container Restarted",       description: "Fires when a container is restarted by Docker" },
    { name: "Volume Created",            description: "Fires when a new Docker volume is created" },
    { name: "Network Created",           description: "Fires when a new Docker network is created" },
    { name: "High CPU Usage",            description: "Fires when container CPU exceeds a threshold" },
    { name: "High Memory Usage",         description: "Fires when container memory usage is critical" },
    { name: "Container Health Check Failed",description: "Fires when the Docker HEALTHCHECK fails" },
  ],

  ssh: [
    { name: "Successful Login",          description: "Fires when a user logs in via SSH" },
    { name: "Failed Login Attempt",      description: "Fires on SSH authentication failure" },
    { name: "Brute Force Detected",      description: "Fires when multiple failed attempts hit a threshold" },
    { name: "New User Created",          description: "Fires when a new system user is added" },
    { name: "Sudo Command Executed",     description: "Fires when a sudo/root command is run" },
    { name: "File Changed in Path",      description: "Fires when a monitored file or directory changes" },
    { name: "SSH Port Changed",          description: "Fires when the sshd configuration port changes" },
    { name: "Key-Based Auth Used",       description: "Fires when a login uses a public key" },
    { name: "Root Login Attempted",      description: "Fires when a direct root login is attempted" },
    { name: "Session Disconnected",      description: "Fires when an SSH session ends" },
    { name: "Authorized Keys Modified",  description: "Fires when authorized_keys file is changed" },
  ],

  azure_devops: [
    { name: "Build Completed",           description: "Fires when an Azure DevOps build finishes" },
    { name: "Build Failed",              description: "Fires when a build pipeline fails" },
    { name: "Release Deployed",          description: "Fires when a release is deployed to an environment" },
    { name: "Work Item Created",         description: "Fires when a new work item is added to a board" },
    { name: "Work Item Updated",         description: "Fires when a work item field is changed" },
    { name: "Pull Request Created",      description: "Fires when a new PR is opened" },
    { name: "Pull Request Merged",       description: "Fires when a PR is completed and merged" },
    { name: "Code Pushed",               description: "Fires when commits are pushed to a repo" },
    { name: "Test Run Completed",        description: "Fires when an automated test run finishes" },
    { name: "Pipeline Approval Required",description: "Fires when a stage requires manual approval" },
    { name: "Artifact Published",        description: "Fires when a build artifact is published" },
  ],

  netlify: [
    { name: "Deploy Succeeded",          description: "Fires when a Netlify deployment completes successfully" },
    { name: "Deploy Failed",             description: "Fires when a deployment fails" },
    { name: "Deploy Started",            description: "Fires when a new build is triggered" },
    { name: "Deploy Locked",             description: "Fires when a deploy is locked/frozen" },
    { name: "Form Submission Received",  description: "Fires when a Netlify form is submitted" },
    { name: "Split Test Started",        description: "Fires when an A/B split test begins" },
    { name: "Function Invocation Error", description: "Fires when a Netlify Function throws an error" },
    { name: "Identity User Registered",  description: "Fires when a user signs up via Netlify Identity" },
    { name: "Identity User Logged In",   description: "Fires on user login via Netlify Identity" },
    { name: "Build Hook Triggered",      description: "Fires when a build hook URL is hit" },
    { name: "Domain Provisioned",        description: "Fires when a custom domain is configured" },
  ],

  producthunt: [
    { name: "New Product Launched",      description: "Fires when a new product is posted on Product Hunt" },
    { name: "Product Reaches N Votes",   description: "Fires when upvotes cross a threshold" },
    { name: "New Comment on Product",    description: "Fires when a comment is added to a product" },
    { name: "Product of the Day",        description: "Fires when a product wins Product of the Day" },
    { name: "Product in Category",       description: "Fires when a product is posted in a specific category" },
    { name: "Maker Replied to Comment",  description: "Fires when the maker replies to a comment" },
    { name: "Featured in Newsletter",    description: "Fires when a product is featured in PH digest" },
    { name: "New Collection Added",      description: "Fires when a product is added to a collection" },
    { name: "Keyword in Description",    description: "Fires when a product description matches a keyword" },
    { name: "New Launch by Maker",       description: "Fires when a followed maker launches a product" },
    { name: "Product Ship Completed",    description: "Fires when a Ship page becomes a full launch" },
  ],

  mastodon: [
    { name: "New Post (Toot)",           description: "Fires when a new toot is posted on a tracked account" },
    { name: "Mention Received",          description: "Fires when your account is mentioned in a toot" },
    { name: "New Follower",              description: "Fires when someone follows your Mastodon account" },
    { name: "Boost (Reblog) Received",   description: "Fires when someone boosts one of your toots" },
    { name: "Favourite Received",        description: "Fires when a toot receives a favourite" },
    { name: "Direct Message Received",   description: "Fires when a DM is received on Mastodon" },
    { name: "Keyword in Public Timeline",description: "Fires when a keyword appears in the public timeline" },
    { name: "New Post on Hashtag",       description: "Fires when a post matches a tracked hashtag" },
    { name: "New Poll Response",         description: "Fires when votes come in on a Mastodon poll" },
    { name: "Account Suspended",         description: "Fires when a tracked account is suspended" },
    { name: "Report Submitted",          description: "Fires when an abuse report is submitted on your instance" },
  ],

  virustotal: [
    { name: "File Scan Completed",       description: "Fires when a file analysis is finished" },
    { name: "File Detected as Malicious",description: "Fires when engines flag a file as malicious" },
    { name: "URL Scan Completed",        description: "Fires when a URL analysis finishes" },
    { name: "URL Flagged as Phishing",   description: "Fires when a URL is marked as phishing" },
    { name: "Domain Report Ready",       description: "Fires when a domain report is available" },
    { name: "IP Address Flagged",        description: "Fires when an IP is flagged by threat intel" },
    { name: "Hash Already Known",        description: "Fires when submitted hash matches a known sample" },
    { name: "New Threat Feed Entry",     description: "Fires when a new IOC appears in threat feeds" },
    { name: "Reputation Score Changed",  description: "Fires when a resource reputation score changes" },
    { name: "Comment Added to Sample",   description: "Fires when a researcher comments on a sample" },
    { name: "Yara Rule Match",           description: "Fires when a custom YARA rule matches a sample" },
  ],

  onedrive: [
    { name: "New File Created",          description: "Fires when a file is created in a monitored folder" },
    { name: "File Updated",              description: "Fires when a file content is modified" },
    { name: "File Deleted",              description: "Fires when a file is moved to Recycle Bin" },
    { name: "File Shared",               description: "Fires when a sharing link is created" },
    { name: "File Moved",                description: "Fires when a file is moved between folders" },
    { name: "New Folder Created",        description: "Fires when a new folder is added" },
    { name: "File Renamed",              description: "Fires when a file is renamed" },
    { name: "Large File Uploaded",       description: "Fires when a file above a size threshold is added" },
    { name: "File Versioned",            description: "Fires when a new version of a file is saved" },
    { name: "Sync Conflict Detected",    description: "Fires when a OneDrive sync conflict occurs" },
    { name: "External Share Detected",   description: "Fires when a file is shared with an external user" },
  ],

  sharepoint: [
    { name: "New List Item Created",     description: "Fires when a new item is added to a SharePoint list" },
    { name: "List Item Updated",         description: "Fires when a list item field is changed" },
    { name: "List Item Deleted",         description: "Fires when a list item is deleted" },
    { name: "File Added to Library",     description: "Fires when a file is uploaded to a document library" },
    { name: "File Updated in Library",   description: "Fires when a document library file is modified" },
    { name: "File Checked Out",          description: "Fires when a user checks out a document" },
    { name: "Approval Required",         description: "Fires when a list item enters an approval workflow" },
    { name: "Page Created",              description: "Fires when a new SharePoint page is created" },
    { name: "New Site Created",          description: "Fires when a new SharePoint site is provisioned" },
    { name: "Permission Changed",        description: "Fires when site or library permissions are modified" },
    { name: "Column Value Changed",      description: "Fires when a specific column value changes" },
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
  const triggerActions = isTrigger
    ? (TRIGGER_ACTIONS[triggerVariantKey] || TRIGGER_ACTIONS[node?.data.backendType] || [])
    : null;

  let rawSchema;
  if (!isTrigger) {
    const backendType = node?.data.backendType;
    const defaultSchema = backendType ? DEFAULT_SCHEMAS[backendType] : null;
    rawSchema = schemaToRows(defaultSchema, selectedNodeId);
  }
  const groups = rawSchema ? groupSchema(rawSchema) : [];
  const totalCount = isTrigger ? triggerActions.length : (rawSchema?.length ?? 0);

  const updateConfig = (key, value) => updateNodeConfig(selectedNodeId, key, value);
  const config = node?.data.config || {};
  const selectedAction = config.selectedAction || null;
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

            {/* ── Actions / Output section (primary) ── */}
            <div className="px-5 pt-5 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-white">
                  {isTrigger ? "Actions" : "Output Events"}
                  <span className="text-[#555] font-normal ml-2">({totalCount})</span>
                </span>
                <ChevronDown className="w-4 h-4 text-[#555]" />
              </div>
            </div>

            {isTrigger ? (
              <div className="px-5 pb-2">
                {triggerActions.length === 0 ? (
                  <p className="text-[12px] text-[#555] py-4 text-center">No actions configured</p>
                ) : (
                  <div className="flex flex-col">
                    {triggerActions.map((action) => (
                      <ActionRow
                        key={action.name}
                        name={action.name}
                        description={action.description}
                        selected={selectedAction === action.name}
                        onSelect={() => updateConfig("selectedAction", action.name)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              groups.map((group) => (
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
              ))
            )}

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

// ── Action row — trigger event type card ─────────────────────────────────────
function ActionRow({ name, description, selected, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-start gap-3 py-3 border-b border-[#1e1e20] last:border-0 cursor-pointer rounded-lg px-2 -mx-2 transition-all duration-100 ${
        selected ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
      }`}
    >
      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-[2px] shrink-0 transition-all ${
        selected ? "border-emerald-500 bg-emerald-500/20" : "border-[#3a3a3d]"
      }`}>
        {selected && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-semibold leading-snug transition-colors ${selected ? "text-white" : "text-[#d4d4d8]"}`}>{name}</p>
        <p className="text-[11px] text-[#555] mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
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
