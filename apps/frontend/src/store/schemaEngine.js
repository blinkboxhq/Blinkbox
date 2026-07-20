// ─────────────────────────────────────────────────────────────────────────────
// Schema Engine — Pure utility functions for AST-style variable inference.
//
// Given a target node, traverses the React Flow edge graph *backwards* to
// collect the output schemas of all upstream nodes. Returns a nested tree
// that UI components can render as autocomplete suggestions.
//
// Performance:
//   - Backward DFS is O(N + E) per node — microseconds for typical DAGs.
//   - Visited-set prevents infinite loops if cycles exist.
//   - Results are memoized in the store; only recomputed on edge/schema change.
// ─────────────────────────────────────────────────────────────────────────────

// ── Default Schemas ─────────────────────────────────────────────────────────
// Known output shapes for built-in node types. Used as fallback when a node
// hasn't been tested yet. Users see *something* useful immediately.

export const DEFAULT_SCHEMAS = {
  // Triggers
  manual: { payload: "object" },
  webhook: {
    body: "object",
    query: "object",
    headers: "object",
    method: "string",
  },
  chat_trigger: { message: "string", sessionId: "string", attachments: "array", triggeredAt: "string" },
  cron_trigger: { scheduledAt: "string", cronExpression: "string" },
  rss_trigger: { title: "string", link: "string", guid: "string", description: "string", content: "string", pubDate: "string", isoDate: "string", author: "string", categories: "array", enclosure: "object", thumbnail: "string", feedUrl: "string", feed: { title: "string", description: "string", link: "string", language: "string" } },
  telegram_trigger: { updateId: "number", eventType: "string", messageId: "number", chatId: "number", chatType: "string", chatTitle: "string", text: "string", fromId: "number", fromUsername: "string", fromName: "string", callbackData: "string", newMembers: "array", leftMember: "string", date: "number" },
  slack_trigger: { ts: "string", text: "string", user: "string", channel: "string", isBot: "boolean", threadTs: "string", replyCount: "number", reactionCount: "number", reactions: "array", hasFile: "boolean" },
  discord_trigger: { id: "string", type: "string", channelId: "string", content: "string", authorId: "string", authorName: "string", authorBot: "boolean", attachmentCount: "number", attachmentUrls: "array", embedCount: "number", mentionsEveryone: "boolean", mentionedUserIds: "array", pinned: "boolean", timestamp: "string", url: "string", eventType: "string" },
  whatsapp_trigger: {
    text: "string",
    from: "string",
    phoneNumberId: "string",
    message: { id: "string", type: "string", timestamp: "string" },
    contacts: "array",
  },
  gmail_trigger: {
    id: "string",
    threadId: "string",
    subject: "string",
    from: "string",
    to: "string",
    date: "string",
    snippet: "string",
    bodyText: "string",
    bodyHtml: "string",
    labels: "array",
    attachments: "array",
  },
  airtable_trigger: { id: "string", createdTime: "string", fields: "object" },
  notion_trigger: {
    id: "string",
    url: "string",
    created_time: "string",
    last_edited_time: "string",
    properties: "object",
    archived: "boolean",
    parent: "object",
  },
  hubspot_trigger: { id: "string", properties: "object", createdAt: "string", updatedAt: "string", archived: "boolean" },
  shopify_trigger: { orderId: "string", orderName: "string", email: "string", financialStatus: "string", fulfillmentStatus: "string", totalPrice: "string", currency: "string", itemCount: "number", customerName: "string", ordersCount: "number", tags: "string", note: "string", cancelledAt: "string", createdAt: "string", updatedAt: "string", url: "string" },
  linear_trigger: { id: "string", title: "string", description: "string", url: "string", status: "string", statusType: "string", priority: "number", priorityLabel: "string", assignee: "string", assigneeEmail: "string", team: "string", teamKey: "string", labels: "array", project: "string", creator: "string", createdAt: "string", updatedAt: "string" },
  typeform_trigger: { responseToken: "string", submittedAt: "string", landedAt: "string", completed: "boolean", score: "number", referrer: "string", platform: "string", hidden: "object", answers: "object", answersList: "array", formId: "string" },
  jotform_trigger: { submissionId: "string", formId: "string", formTitle: "string", answers: "object", submittedAt: "string", ip: "string" },

  // Core nodes
  http_request: {
    status: "number",
    statusText: "string",
    headers: "object",
    data: "object",
  },
  web_scraper: { content: "string", metadata: "object" },
  ai_agent: {
    result: "string",
    model: "string",
    tokensUsed: "number",
    provider: "string",
    agentType: "string",
    iterations: "number",
    intermediateSteps: "array",
  },
  data_mapper: { _dynamic: true },
  set_fields: { _dynamic: true },
  logic_router: { _passthrough: true },

  // Supporting nodes
  code: { result: "object" },
  delay: { delayed: "boolean", resumeAfter: "string" },
  loop: { __loopIndex: "number", __loopTotal: "number", _dynamic: true },
  merge: { merged: "object", __mergedFrom: "number" },
  // AI Hub
  openai: { result: "string", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  anthropic: { result: "string", text: "string", model: "string", tokensUsed: "number", stopReason: "string", provider: "string", operation: "string" },
  gemini: { result: "string", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  perplexity: { result: "string", citations: "array", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  xai: { result: "string", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  deepseek: { result: "string", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  nvidia_nim: { result: "string", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  moonshot: { result: "string", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  openrouter: { result: "string", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  zai: { result: "string", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  minimax: { result: "string", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  sakana: { result: "string", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  agent_llm: { result: "string", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  agent_openai: { result: "string", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  agent_anthropic: { result: "string", text: "string", model: "string", tokensUsed: "number", stopReason: "string", provider: "string", operation: "string" },
  agent_gemini: { result: "string", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  agent_xai: { result: "string", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  agent_deepseek: { result: "string", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  agent_moonshot: { result: "string", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  agent_nvidia_nim: { result: "string", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  agent_perplexity: { result: "string", citations: "array", model: "string", tokensUsed: "number", finishReason: "string", provider: "string", operation: "string" },
  agent_groq: { result: "string", code: "string", model: "string", tokensUsed: "number", operation: "string", provider: "string" },
  agent_gemma: { reply: "string", model: "string", tokensUsed: "number", operation: "string" },
  agent_ollama: { status: "string", baseUrl: "string", provider: "string", modelsAvailable: "array", serverSide: "boolean", hint: "string" },
  agent_lmstudio: { status: "string", baseUrl: "string", provider: "string", modelsAvailable: "array", hint: "string" },

  // Comms Hub
  telegram: { ok: "boolean", messageId: "number", chat: "object", pollId: "string", deleted: "boolean", pinned: "boolean" },
  whatsapp: { messageId: "string", contacts: "array", messages: "array", ok: "boolean", status: "string" },
  slack: { ok: "boolean", ts: "string", channel: "string", messageId: "string", fileId: "string", userId: "string", channelId: "string" },
  discord: { ok: "boolean", webhookId: "string", filename: "string" },

  // Data Hub
  airtable: { id: "string", fields: "object", createdTime: "string", records: "array", totalRecords: "number", deleted: "boolean", created: "number", updated: "number" },
  google_sheets: { values: "array", rowCount: "number", range: "string", updatedRange: "string", updatedRows: "number", updatedCells: "number", clearedRange: "string", title: "string", sheets: "array" },
  notion: { pageId: "string", url: "string", title: "string", properties: "object", results: "array", hasMore: "boolean", nextCursor: "string", appended: "number", blockIds: "array", created: "boolean", updated: "boolean" },

  // Email & Messaging
  gmail: { messageId: "string", threadId: "string", from: "string", to: "string", subject: "string", bodyText: "string", bodyHtml: "string", snippet: "string", date: "string", labels: "array", attachments: "array", messages: "array", draftId: "string", marked: "string", trashed: "boolean" },
  twilio: { messageSid: "string", status: "string", to: "string", from: "string", body: "string", price: "string", callSid: "string", direction: "string", phoneNumber: "string", carrier: "object" },
  sendgrid: { sent: "boolean", messageId: "string", statusCode: "number", recipientCount: "number", jobId: "string", added: "boolean" },

  // Dev Tools
  github: { number: "number", url: "string", title: "string", state: "string", id: "string", body: "string", issues: "array", count: "number", author: "string", labels: "array", merged: "boolean", sha: "string" },
  jira: { id: "string", key: "string", url: "string", summary: "string", status: "string", assignee: "string", issues: "array", total: "number", updated: "boolean", created: "boolean" },
  linear: { id: "string", title: "string", url: "string", state: "string", priority: "number", assignee: "string", issues: "array", count: "number", updated: "boolean" },
  // Payments
  stripe: { id: "string", object: "string", status: "string", amount: "number", currency: "string", customer: "object", email: "string", created: "number", charges: "array", invoices: "array", refunded: "boolean" },
  // Social
  twitter: { id: "string", text: "string", url: "string", deleted: "boolean", liked: "boolean", tweets: "array", count: "number", username: "string", name: "string", followers: "number", following: "number" },
  // CRM & E-Commerce
  hubspot: { id: "string", email: "string", found: "boolean", contacts: "array", total: "number", dealName: "string", stage: "string", updated: "boolean", created: "boolean" },
  shopify: { id: "string", title: "string", status: "string", orders: "array", products: "array", count: "number", total_price: "string", financial_status: "string", email: "string", updated: "boolean" },
  // Google Workspace
  google_calendar: { id: "string", summary: "string", url: "string", start: "string", end: "string", location: "string", attendees: "array", calendars: "array", deleted: "boolean", updated: "boolean" },
  google_drive: { id: "string", name: "string", mimeType: "string", files: "array", count: "number", content: "string", deleted: "boolean", moved: "boolean", permissionId: "string", shared: "boolean" },
  // Databases
  postgres: { rows: "array", count: "number", total: "number", fields: "array", rowCount: "number", command: "string" },
  // Web Browser
  web_search: { answer: "string", results: "array", query: "string", responseTime: "number" },

  // New Triggers
  // ── Webhook-parse triggers ─────────────────────────────────────────────
  stripe_trigger: { event: "string", eventId: "string", livemode: "boolean", objectType: "string", id: "string", amount: "number", amountDecimal: "string", currency: "string", status: "string", customer: "string", email: "string", description: "string", metadata: "object", createdAt: "string", paymentMethod: "string", invoiceId: "string", subscriptionId: "string" },
  github_trigger: { event: "string", action: "string", repoName: "string", repoUrl: "string", repoOwner: "string", sender: "string", branch: "string", tag: "string", afterSha: "string", commitMessage: "string", commitAuthor: "string", commitUrl: "string", commits: "array", pushedAt: "string", forced: "boolean", prNumber: "number", prTitle: "string", prState: "string", prUrl: "string", prAuthor: "string", baseBranch: "string", headBranch: "string", merged: "boolean", draft: "boolean", issueNumber: "number", issueTitle: "string", issueState: "string", issueUrl: "string", releaseName: "string", tagName: "string" },
  gitlab_trigger: { id: "string", type: "string", author: "string", url: "string", createdAt: "string", projectId: "string", title: "string", state: "string", status: "string", ref: "string", sha: "string", branch: "string", tag: "string", sourceBranch: "string", targetBranch: "string", message: "string", labels: "array" },
  jira_trigger: { key: "string", summary: "string", status: "string", priority: "string", issueType: "string", assignee: "string", reporter: "string", labels: "array", created: "string", updated: "string", url: "string" },
  trello_trigger: { actionId: "string", type: "string", cardId: "string", cardName: "string", listId: "string", listName: "string", listBefore: "string", listAfter: "string", memberName: "string", targetMember: "string", comment: "string", label: "string" },
  asana_trigger: { gid: "string", name: "string", completed: "boolean", completedAt: "string", assignee: "string", dueOn: "string", notes: "string", createdAt: "string", modifiedAt: "string", parentGid: "string", tags: "array", section: "string", projectId: "string", url: "string" },
  pipedrive_trigger: { id: "string", title: "string", name: "string", value: "number", currency: "string", stage: "number", status: "string", ownerName: "string", personName: "string", orgName: "string", email: "string", phone: "string", subject: "string", dueDate: "string", content: "string", addTime: "string", wonTime: "string", lostReason: "string" },
  sentry_trigger: { issueId: "string", shortId: "string", title: "string", culprit: "string", level: "string", status: "string", substatus: "string", count: "number", userCount: "number", project: "string", assignedTo: "string", isUnhandled: "boolean", firstSeen: "string", lastSeen: "string", url: "string" },
  vercel_trigger: { deploymentId: "string", name: "string", state: "string", target: "string", branch: "string", commitMessage: "string", creator: "string", url: "string", inspectorUrl: "string", buildSeconds: "number", createdAt: "string", projectId: "string" },
  netlify_trigger: { deployId: "string", state: "string", context: "string", branch: "string", url: "string", title: "string", commitRef: "string", deployTime: "string", errorMessage: "string", createdAt: "string", updatedAt: "string", siteId: "string" },
  pagerduty_trigger: { incidentId: "string", number: "number", title: "string", status: "string", urgency: "string", priority: "string", service: "string", serviceId: "string", assignees: "string", escalationLevel: "number", url: "string", createdAt: "string", lastChangeAt: "string" },
  datadog_trigger: { id: "string", title: "string", text: "string", alertType: "string", priority: "string", date_happened: "string", tags: "array", url: "string", host: "string", source: "string" },
  zendesk_trigger: { ticketId: "string", subject: "string", status: "string", priority: "string", type: "string", channel: "string", requesterId: "string", assigneeId: "string", tags: "string", satisfaction: "string", createdAt: "string", updatedAt: "string" },
  calendly_trigger: { eventId: "string", eventUri: "string", name: "string", status: "string", startTime: "string", endTime: "string", locationType: "string", location: "string", inviteesActive: "number", inviteesLimit: "number", eventTypeUri: "string", createdAt: "string", updatedAt: "string" },
  mailchimp_trigger: { memberId: "string", email: "string", status: "string", rating: "number", openRate: "number", vip: "boolean", tags: "string", source: "string", country: "string", firstName: "string", lastName: "string", signupAt: "string", lastChanged: "string", listId: "string" },
  clickup_trigger: { taskId: "string", name: "string", url: "string", status: "string", priority: "string", assignees: "string", tags: "string", dueDate: "string", createdAt: "string", updatedAt: "string" },
  monday_trigger: { itemId: "string", name: "string", state: "string", group: "string", status: "string", assignee: "string", columns: "object", createdAt: "string", updatedAt: "string" },
  figma_trigger: { event: "string", fileKey: "string", fileName: "string", fileUrl: "string", versionId: "string", versionLabel: "string", description: "string", commentId: "string", commentText: "string", commentAuthor: "string", commentCreatedAt: "string", resolvedAt: "string", timestamp: "string", triggeredBy: "string" },
  intercom_trigger: { conversationId: "string", state: "string", priority: "string", assigneeId: "string", teamId: "string", source: "string", author: "string", subject: "string", tags: "string", waitingSince: "string", createdAt: "string", updatedAt: "string" },
  woocommerce_trigger: { orderId: "string", orderNumber: "string", status: "string", total: "string", currency: "string", email: "string", customerName: "string", customerId: "string", paymentMethod: "string", itemCount: "number", createdAt: "string", updatedAt: "string" },
  azure_devops_trigger: { eventType: "string", organization: "string", project: "string", id: "string", publisherId: "string", message: "object", detailedMessage: "object", resource: "object", resourceVersion: "string", createdDate: "string" },
  instagram_trigger: { mediaId: "string", caption: "string", mediaType: "string", mediaUrl: "string", thumbnailUrl: "string", permalink: "string", likes: "number", comments: "number", timestamp: "string" },
  tiktok_trigger: { videoId: "string", title: "string", description: "string", likes: "number", comments: "number", shares: "number", views: "number", embedLink: "string", createTime: "string" },
  mastodon_trigger: { id: "string", type: "string", createdAt: "string", accountName: "string", accountDisplayName: "string", accountUrl: "string", statusId: "string", statusContent: "string", statusUrl: "string", statusVisibility: "string", favouritesCount: "number", reblogsCount: "number", repliesCount: "number", tags: "array" },
  producthunt_trigger: { id: "string", name: "string", slug: "string", tagline: "string", description: "string", votesCount: "number", commentsCount: "number", thumbnail: "string", website: "string", maker: "string", makerUsername: "string", topics: "array", url: "string", createdAt: "string" },
  sharepoint_trigger: { itemId: "string", webUrl: "string", createdTime: "string", lastModified: "string", createdByEmail: "string", createdByName: "string", deleted: "boolean", fields: "object" },
  virustotal_trigger: { id: "string", type: "string", name: "string", sha256: "string", malicious: "number", suspicious: "number", harmless: "number", undetected: "number", totalEngines: "number", detectionRate: "number", isMalicious: "boolean", lastAnalysisDate: "string", analysedAt: "string" },

  // ── Polling triggers ───────────────────────────────────────────────────
  youtube_trigger: { videoId: "string", title: "string", description: "string", publishedAt: "string", channelId: "string", channelTitle: "string", thumbnailUrl: "string", url: "string", viewCount: "number", likeCount: "number", commentCount: "number", durationSec: "number" },
  reddit_trigger: { id: "string", title: "string", selftext: "string", url: "string", score: "number", numComments: "number", author: "string", subreddit: "string", created: "string", permalink: "string", thumbnail: "string", isNSFW: "boolean", flair: "string" },
  hackernews_trigger: { id: "string", title: "string", url: "string", author: "string", points: "number", numComments: "number", createdAt: "string", onFrontPage: "boolean", isAsk: "boolean", isShow: "boolean", isJob: "boolean", isPoll: "boolean" },
  price_alert_trigger: { coinId: "string", symbol: "string", name: "string", currentPrice: "number", currency: "string", eventType: "string", threshold: "number", high: "number", low: "number", triggeredAt: "string" },
  google_calendar_trigger: { eventId: "string", title: "string", description: "string", startTime: "string", endTime: "string", allDay: "boolean", location: "string", attendees: "array", organizer: "string", meetLink: "string", status: "string", created: "string", updated: "string", recurringEventId: "string", selfResponse: "string", htmlLink: "string" },
  google_sheets_trigger: { _dynamic: true },
  google_drive_trigger: { fileId: "string", name: "string", mimeType: "string", kind: "string", modifiedTime: "string", createdTime: "string", size: "string", webViewLink: "string", owner: "string", trashed: "boolean", shared: "boolean", starred: "boolean", ownedByMe: "boolean" },
  google_docs_trigger: { docId: "string", docName: "string", revisionId: "string", modifiedTime: "string", modifiedBy: "string", webViewLink: "string", owner: "string", wordCount: "number", headingCount: "number", linkCount: "number" },
  google_forms_trigger: { responseId: "string", submittedAt: "string", respondentEmail: "string", answers: "object", answersByTitle: "object", fileCount: "number" },
  onedrive_trigger: { itemId: "string", name: "string", webUrl: "string", size: "number", lastModified: "string", createdBy: "string", lastModifiedBy: "string", isFolder: "boolean", kind: "string", ext: "string", shared: "boolean", deleted: "boolean" },
  outlook_trigger: { id: "string", subject: "string", from: "string", fromName: "string", receivedAt: "string", preview: "string", hasAttachments: "boolean", importance: "string", flagged: "boolean", folder: "string" },
  teams_trigger: { id: "string", text: "string", subject: "string", author: "string", authorEmail: "string", importance: "string", mentionCount: "number", attachmentCount: "number", reactionCount: "number", isReply: "boolean", messageType: "string", createdAt: "string" },

  // ── System monitor triggers ───────────────────────────────────────────
  github_issue_trigger: { id: "string", number: "number", title: "string", body: "string", state: "string", url: "string", author: "string", labels: "array", assignees: "array", milestone: "string", comments: "number", reactions: "number", createdAt: "string", type: "string" },
  http_monitor_trigger: { url: "string", status: "number", ok: "boolean", responseTime: "number", state: "string", previousState: "string", reason: "string", location: "string", eventType: "string", checkedAt: "string" },
  ssl_trigger: { hostname: "string", port: "number", isValid: "boolean", isExpired: "boolean", daysRemaining: "number", expiresWithinAlertDays: "boolean", subject: "string", issuer: "string", issuerCN: "string", fingerprint: "string", serialNumber: "string", validFrom: "string", validTo: "string", protocol: "string", cipher: "string", authorized: "boolean", authorizationError: "string", checkedAt: "string" },
  dns_trigger: { domain: "string", eventType: "string", A: "string", AAAA: "string", MX: "string", TXT: "string", CNAME: "string", NS: "string", previous: "object", changedAt: "string" },
  port_monitor_trigger: { host: "string", port: "number", state: "string", previousState: "string", responseTime: "number", reason: "string", flips: "number", eventType: "string", checkedAt: "string" },
  ssh_trigger: { stdout: "string", stderr: "string", exitCode: "number", host: "string", command: "string", eventType: "string" },
  docker_trigger: { type: "string", action: "string", actor: "string", name: "string", image: "string", attributes: "object", timestamp: "string", raw: "object" },
  db_trigger: { dbType: "string", collection: "string", table: "string", documents: "array", rows: "array", columns: "array", count: "number", latestDocument: "object", latestRow: "object", triggeredAt: "string" },
  imap_trigger: { folder: "string", emails: "array", count: "number", triggeredAt: "string", uid: "number", subject: "string", from: "string", fromName: "string", to: "array", cc: "array", date: "string", messageId: "string", body: "string", isRead: "boolean", isFlagged: "boolean", hasAttachments: "boolean" },
  wait_for_event: { body: "object", headers: "object", query: "object", receivedAt: "string" },

  // New Utility Nodes
  qr_code: { dataUrl: "string", content: "string", size: "number", format: "string" },
  text_splitter: { chunks: "array", chunkCount: "number", totalLength: "number" },
  template_renderer: { rendered: "string", templateLength: "number", outputLength: "number" },
  json_validator: { valid: "boolean", data: "object", errors: "array", errorCount: "number" },
  image_resize: { dataUrl: "string", format: "string", width: "number", height: "number", sizeBytes: "number" },
  aggregate: { items: "array", count: "number", sessionId: "string", completedAt: "string" },
  filter_array: { items: "array", filteredCount: "number", totalCount: "number" },
  sort_array: { items: "array", count: "number" },
  deduplicate: { items: "array", count: "number", removedCount: "number" },
  json_transform: { _meta: "object", _dynamic: true },
  pdf_generator: { pdf: "string", filename: "string", sizeBytes: "number", mimeType: "string" },
  data_diff: { hasChanges: "boolean", changeCount: "number", summary: "object", operation: "string", changes: "array", newItems: "array", removedItems: "array", changedItems: "array" },

  // AI Innovated Nodes
  email_parser: { _meta: "object", _dynamic: true },
  vector_memory: { memories: "array", count: "number", namespace: "string", query: "string", memoryId: "string", memoryKey: "string", text: "string" },
  ai_decision: { decision: "string", confidence: "number", reasoning: "string", scores: "object", factors: "array", recommended_action: "string", risks: "array", alternatives: "array" },
  notification_hub: { sent: "number", failed: "number", total: "number", results: "array", fallbackUsed: "boolean", deduped: "boolean", message: "string" },

  // New Integrations
  elevenlabs: { audioBase64: "string", mimeType: "string", voiceId: "string", model: "string", characterCount: "number" },
  pinecone: { matches: "array", upsertedCount: "number", namespace: "string" },
  zoom: { meetingId: "string", topic: "string", joinUrl: "string", startUrl: "string", password: "string", startTime: "string", duration: "number" },
  resend: { id: "string", from: "string", to: "array", subject: "string", createdAt: "string", status: "string" },
  openai_assistant: { threadId: "string", runId: "string", lastMessage: "string", messages: "array", status: "string", usage: "object" },
  virtual_computer: { stdout: "string", stderr: "string", exitCode: "number", language: "string", executionTimeMs: "number", timedOut: "boolean" },
  claude_code:    { result: "string", code: "string", model: "string", tokensUsed: "number", operation: "string", provider: "string" },
  codex:          { result: "string", code: "string", model: "string", tokensUsed: "number", operation: "string", provider: "string" },
  gemini_cli:     { result: "string", code: "string", model: "string", tokensUsed: "number", operation: "string", provider: "string" },
  groq:           { result: "string", code: "string", model: "string", tokensUsed: "number", operation: "string", provider: "string" },
  ollama:         { result: "string", code: "string", model: "string", operation: "string", provider: "string" },
  lm_studio:      { result: "string", code: "string", model: "string", tokensUsed: "number", operation: "string", provider: "string" },
  github_copilot: { result: "string", code: "string", model: "string", tokensUsed: "number", operation: "string", provider: "string" },

  // Databases (Part C)
  supabase:   { rows: "array", count: "number", table: "string", inserted: "array", updated: "array", deleted: "array", result: "object" },
  mongodb:    { documents: "array", count: "number", document: "object", found: "boolean", insertedId: "string", insertedCount: "number", modifiedCount: "number", deletedCount: "number", collection: "string" },
  redis_node: { value: "any", raw: "string", items: "array", members: "array", hash: "object", keys: "array", found: "boolean", set: "boolean", key: "string", length: "number" },
  firebase:   { document: "object", documents: "array", count: "number", docId: "string", found: "boolean", user: "object", uid: "string", messageId: "string", collection: "string" },
};

/**
 * Infer a schema tree from an actual runtime value.
 * Called when the user tests a node — replaces the default schema with real shape.
 *
 * @param {unknown} value — The runtime output of a node
 * @returns {object} — Schema tree (keys → type strings or nested objects)
 */
export function inferSchemaFromValue(value) {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "array";
    // Infer from first element for homogeneous arrays
    return { _type: "array", _items: inferSchemaFromValue(value[0]) };
  }
  if (typeof value === "object") {
    const schema = {};
    for (const [key, val] of Object.entries(value)) {
      schema[key] = inferSchemaFromValue(val);
    }
    return schema;
  }
  return typeof value; // "string", "number", "boolean"
}

/**
 * Get the default or stored schema for a node.
 *
 * @param {object} node — React Flow node
 * @param {Record<string, object>} nodeOutputSchemas — Stored schemas
 * @returns {object|null}
 */
function getNodeSchema(node, nodeOutputSchemas) {
  // Prefer stored schema (from test execution)
  if (nodeOutputSchemas[node.id]) return nodeOutputSchemas[node.id];

  return schemaForNode(node.data?.backendType, node.data?.config);
}

// Branch labels become output keys — must match slugifyLabel in
// apps/backend/src/nodes/merge.node.js.
function slugifyLabel(label, index) {
  const slug = String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || `input_${index + 1}`;
}

/**
 * Default schema for a node, refined by its config where the config determines
 * the output shape (merge names one output field per input branch).
 */
export function schemaForNode(backendType, config) {
  if (!backendType) return null;

  if (backendType === "merge") {
    const branches = Array.isArray(config?.branches) ? config.branches : [];
    const named = {};
    branches.forEach((b, i) => {
      named[slugifyLabel(b?.label, i)] = "object";
    });
    return { ...named, ...DEFAULT_SCHEMAS.merge };
  }

  return DEFAULT_SCHEMAS[backendType] || null;
}

/**
 * Calculate all variables available to a target node by traversing upstream.
 *
 * Walks backwards through edges, collecting output schemas from every ancestor.
 * Returns a nested tree keyed by source node ID:
 *
 *   {
 *     "node-1": { _label: "Webhook Trigger", _type: "webhook", body: { user: { email: "string" } } },
 *     "node-2": { _label: "HTTP Request",    _type: "http_request", status: "number", data: "object" },
 *   }
 *
 * @param {string} targetNodeId
 * @param {Array} nodes — React Flow nodes array
 * @param {Array} edges — React Flow edges array
 * @param {Record<string, object>} nodeOutputSchemas — Per-node stored schemas
 * @returns {Record<string, object>}
 */
export function calculateAvailableVariables(
  targetNodeId,
  nodes,
  edges,
  nodeOutputSchemas,
) {
  const result = {};
  const visited = new Set();

  // Build O(1) lookup maps
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const incomingByTarget = new Map();
  for (const edge of edges) {
    if (!incomingByTarget.has(edge.target)) {
      incomingByTarget.set(edge.target, []);
    }
    incomingByTarget.get(edge.target).push(edge);
  }

  function traverse(nodeId) {
    if (visited.has(nodeId)) return; // cycle guard
    visited.add(nodeId);

    const incoming = incomingByTarget.get(nodeId);
    if (!incoming) return;

    for (const edge of incoming) {
      const sourceId = edge.source;
      const sourceNode = nodeById.get(sourceId);
      if (!sourceNode) continue;

      // Collect this ancestor's schema
      const schema = getNodeSchema(sourceNode, nodeOutputSchemas);
      if (schema) {
        result[sourceId] = {
          _label:
            sourceNode.data?.label ||
            sourceNode.data?.backendType ||
            sourceId,
          _type: sourceNode.data?.backendType || "unknown",
          ...schema,
        };
      }

      // Continue upstream
      traverse(sourceId);
    }
  }

  traverse(targetNodeId);
  return result;
}

// ── Expected Input Schemas ────────────────────────────────────────────────
// Declares what each config field expects as its input type.
// Used by validateNodeMapping to flag type mismatches.

const EXPECTED_INPUT_TYPES = {
  http_request: { body: "object", headers: "object", url: "string" },
  data_mapper: { mappings: "object" },
  set_fields: { fields: "array" },
  code: { input: "object" },
  ai_agent: { prompt: "string", systemPrompt: "string" },
  logic_router: { conditions: "array" },
  email_parser: { emailText: "string" },
  vector_memory: { text: "string" },
  ai_decision: { scenario: "string" },
  notification_hub: { message: "string" },
  data_diff: { before: "object", after: "object" },
};

/**
 * Extract `{{nodeId.path.to.field}}` expressions from a config value.
 * Returns an array of { raw, nodeId, path[] }.
 */
function extractExpressions(value) {
  if (typeof value !== "string") return [];
  const matches = [...value.matchAll(/\{\{([^}]+)\}\}/g)];
  return matches.map((m) => {
    const parts = m[1].trim().split(".");
    return { raw: m[0], nodeId: parts[0], path: parts.slice(1) };
  });
}

/**
 * Resolve a dot-path against a schema tree to get the terminal type.
 * Returns the type string ("string", "number", "object", etc.) or null.
 */
function resolveType(schema, path) {
  let current = schema;
  for (const key of path) {
    if (current === null || current === undefined) return null;
    if (typeof current === "string") return null; // leaf type, can't descend
    if (current._type === "array" && key === "*") {
      current = current._items;
      continue;
    }
    current = current[key];
  }
  if (current === null || current === undefined) return null;
  if (typeof current === "string") return current; // "string", "number", etc.
  if (typeof current === "object" && current._type) return current._type;
  if (typeof current === "object") return "object";
  return null;
}

/**
 * Validate that a node's config mappings match the types of upstream schemas.
 *
 * @param {string} nodeId
 * @param {Record<string, object>} availableVars — upstream variables for this node
 * @param {object} nodeConfig — the node's config object
 * @param {string} backendType — the node's backend type
 * @returns {{ hasMappingWarning: boolean, warnings: string[] }}
 */
export function validateNodeMapping(nodeId, availableVars, nodeConfig, backendType) {
  const warnings = [];
  const expected = EXPECTED_INPUT_TYPES[backendType];
  if (!expected || !nodeConfig) return { hasMappingWarning: false, warnings };

  for (const [configKey, configValue] of Object.entries(nodeConfig)) {
    const expectedType = expected[configKey];
    if (!expectedType) continue;

    const expressions = extractExpressions(
      typeof configValue === "string" ? configValue : JSON.stringify(configValue),
    );

    for (const expr of expressions) {
      const sourceSchema = availableVars[expr.nodeId];
      if (!sourceSchema) continue;

      const sourceType = resolveType(sourceSchema, expr.path);
      if (!sourceType) continue;

      // Flag mismatch: mapping a scalar into a compound type or vice versa
      const isScalar = (t) => ["string", "number", "boolean", "null"].includes(t);
      const isCompound = (t) => ["object", "array"].includes(t);

      if (isScalar(sourceType) && isCompound(expectedType)) {
        warnings.push(
          `Type mismatch: You mapped a ${sourceType} (${expr.raw}) into "${configKey}" which expects ${expectedType}.`,
        );
      } else if (isCompound(sourceType) && isScalar(expectedType)) {
        warnings.push(
          `Type mismatch: You mapped an ${sourceType} (${expr.raw}) into "${configKey}" which expects ${expectedType}.`,
        );
      }
    }
  }

  return { hasMappingWarning: warnings.length > 0, warnings };
}

/**
 * Validate mappings for ALL nodes in the graph.
 *
 * @param {Array} nodes
 * @param {Record<string, object>} allAvailableVariables
 * @returns {Record<string, { hasMappingWarning: boolean, warnings: string[] }>}
 */
export function validateAllNodeMappings(nodes, allAvailableVariables) {
  const result = {};
  for (const node of nodes) {
    result[node.id] = validateNodeMapping(
      node.id,
      allAvailableVariables[node.id] || {},
      node.data?.config || {},
      node.data?.backendType,
    );
  }
  return result;
}

/**
 * Recalculate available variables for ALL nodes in the graph.
 * Returns a map: { nodeId → availableVariables }.
 *
 * @param {Array} nodes
 * @param {Array} edges
 * @param {Record<string, object>} nodeOutputSchemas
 * @returns {Record<string, object>}
 */
export function calculateAllAvailableVariables(
  nodes,
  edges,
  nodeOutputSchemas,
) {
  const result = {};
  for (const node of nodes) {
    result[node.id] = calculateAvailableVariables(
      node.id,
      nodes,
      edges,
      nodeOutputSchemas,
    );
  }
  return result;
}
