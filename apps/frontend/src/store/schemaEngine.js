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
  imap_trigger: { subject: "string", from: "string", to: "string", body: "string", date: "string", messageId: "string", attachments: "array" },
  rss_trigger: { title: "string", link: "string", guid: "string", description: "string", content: "string", pubDate: "string", isoDate: "string", author: "string", categories: "array", enclosure: "object", thumbnail: "string", feedUrl: "string", feed: { title: "string", description: "string", link: "string", language: "string" } },
  db_trigger: { row: "object", table: "string", operation: "string", timestamp: "string" },
  telegram_trigger: {
    text: "string",
    from: { id: "number", first_name: "string", last_name: "string", username: "string", is_bot: "boolean", language_code: "string" },
    chat: { id: "number", type: "string", first_name: "string", last_name: "string", username: "string", title: "string" },
    date: "number",
    messageId: "number",
    updateId: "number",
    hasMedia: "boolean",
    mediaType: "string",
    attachments: "array",
  },
  slack_trigger: {
    text: "string",
    user: "string",
    channel: "string",
    ts: "string",
    eventType: "string",
    subtype: "string",
    threadTs: "string",
    teamId: "string",
    resolvedUser: { id: "string", name: "string", realName: "string", displayName: "string", email: "string", isBot: "boolean" },
    resolvedChannel: { id: "string", name: "string", isPrivate: "boolean", topic: "string", purpose: "string", memberCount: "number" },
    hasMedia: "boolean",
    event: { type: "string", user: "string", text: "string", channel: "string", ts: "string" },
  },
  discord_trigger: {
    content: "string",
    username: "string",
    userId: "string",
    channelId: "string",
    guildId: "string",
    messageId: "string",
    attachments: "array",
    embeds: "array",
    author: { id: "string", username: "string", discriminator: "string" },
    message: "object",
  },
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
  airtable_trigger: {
    id: "string",
    createdTime: "string",
    tableId: "string",
    fields: "object",
    record: { id: "string", createdTime: "string", fields: "object" },
  },
  notion_trigger: {
    id: "string",
    url: "string",
    created_time: "string",
    last_edited_time: "string",
    properties: "object",
    archived: "boolean",
    parent: "object",
  },
  hubspot_trigger: {
    objectId: "string",
    objectType: "string",
    changeSource: "string",
    portalId: "string",
    event: { eventId: "string", subscriptionType: "string", objectId: "string" },
  },
  shopify_trigger: {
    id: "string",
    email: "string",
    total_price: "string",
    financial_status: "string",
    fulfillment_status: "string",
    line_items: "array",
    customer: { id: "string", email: "string", first_name: "string", last_name: "string" },
  },
  linear_trigger: {
    id: "string",
    title: "string",
    priority: "number",
    state: { id: "string", name: "string", type: "string" },
    assignee: { id: "string", name: "string", email: "string" },
    team: { id: "string", name: "string", key: "string" },
  },
  typeform_trigger: {
    form_id: "string",
    token: "string",
    submitted_at: "string",
    answers: "array",
    form_response: { form_id: "string", token: "string", submitted_at: "string" },
  },

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
  delay: { delayed: "boolean" },
  loop: { items: "array", index: "number", item: "object" },
  merge: { _passthrough: true },
  // AI Hub
  openai: { result: "string", model: "string", tokensUsed: "number", provider: "string" },
  anthropic: { result: "string", model: "string", tokensUsed: "number", provider: "string" },
  gemini: { result: "string", model: "string", tokensUsed: "number", provider: "string" },
  perplexity: { result: "string", model: "string", tokensUsed: "number", provider: "string" },
  xai: { result: "string", model: "string", tokensUsed: "number", provider: "string" },
  deepseek: { result: "string", model: "string", tokensUsed: "number", provider: "string" },

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
  gitlab_trigger: { event: "string", projectName: "string", projectUrl: "string", namespace: "string", branch: "string", sha: "string", commits: "array", pusher: "string", mrId: "number", mrTitle: "string", mrState: "string", mrUrl: "string", action: "string", sourceBranch: "string", targetBranch: "string", issueId: "number", issueTitle: "string", pipelineId: "number", status: "string", duration: "number" },
  jira_trigger: { event: "string", action: "string", issueKey: "string", issueId: "string", summary: "string", description: "string", status: "string", statusCategory: "string", priority: "string", issueType: "string", project: "string", projectKey: "string", reporter: "string", reporterEmail: "string", assignee: "string", assigneeEmail: "string", labels: "array", components: "array", created: "string", updated: "string", dueDate: "string", changelog: "array", user: "string", userEmail: "string" },
  trello_trigger: { event: "string", actionId: "string", boardId: "string", boardName: "string", cardId: "string", cardName: "string", cardShortUrl: "string", cardDesc: "string", listId: "string", listName: "string", fromList: "string", toList: "string", memberName: "string", memberUsername: "string", checklistName: "string", checkItemName: "string", checkItemState: "string", text: "string", date: "string" },
  asana_trigger: { event: "string", action: "string", resourceType: "string", resourceGid: "string", resourceName: "string", parentType: "string", parentGid: "string", parentName: "string", user: "string", createdAt: "string", count: "number", allEvents: "array" },
  pipedrive_trigger: { event: "string", action: "string", objectType: "string", objectId: "number", dealId: "number", dealTitle: "string", dealValue: "number", dealCurrency: "string", dealStatus: "string", stageId: "number", pipelineId: "number", ownerId: "number", personId: "number", orgId: "number", wonTime: "string", lostTime: "string", lostReason: "string", addTime: "string", updateTime: "string", changes: "array" },
  sentry_trigger: { action: "string", trigger: "string", issueId: "string", issueTitle: "string", issueLevel: "string", issuePlatform: "string", issueStatus: "string", issueUrl: "string", project: "string", projectId: "string", projectSlug: "string", organization: "string", environment: "string", culprit: "string", errorType: "string", errorValue: "string", errorFilename: "string", firstSeen: "string", lastSeen: "string", timesSeenCount: "number", actor: "string", actorType: "string" },
  vercel_trigger: { event: "string", deploymentId: "string", deploymentName: "string", url: "string", inspectorUrl: "string", projectId: "string", projectName: "string", teamId: "string", state: "string", target: "string", branch: "string", commitSha: "string", commitMessage: "string", authorName: "string", createdAt: "string", readyAt: "string", error: "string", regions: "array" },
  netlify_trigger: { event: "string", deployId: "string", deployState: "string", errorMessage: "string", siteId: "string", siteName: "string", siteUrl: "string", deployUrl: "string", branch: "string", commitRef: "string", committer: "string", title: "string", deployTime: "number", publishedAt: "string", createdAt: "string" },
  pagerduty_trigger: { event: "string", incidentId: "string", incidentNumber: "number", incidentKey: "string", title: "string", status: "string", urgency: "string", priority: "string", serviceName: "string", serviceId: "string", serviceUrl: "string", assigneeName: "string", assigneeEmail: "string", escalationPolicy: "string", teamName: "string", body: "string", resolvedAt: "string", acknowledgedAt: "string", createdAt: "string", incidentUrl: "string" },
  datadog_trigger: { event: "string", alertId: "string", alertName: "string", alertStatus: "string", alertMetric: "string", alertQuery: "string", alertType: "string", alertTransition: "string", monitorId: "number", monitorName: "string", monitorType: "string", monitorGroups: "array", orgId: "string", orgName: "string", hostname: "string", tags: "array", metric: "string", priority: "string", body: "string", date: "string" },
  zendesk_trigger: { event: "string", ticketId: "number", ticketUrl: "string", subject: "string", description: "string", status: "string", priority: "string", type: "string", channel: "string", tags: "array", requesterName: "string", requesterEmail: "string", requesterId: "number", assigneeName: "string", assigneeEmail: "string", assigneeId: "number", groupName: "string", groupId: "number", organizationId: "number", satisfactionRating: "string", customFields: "array", createdAt: "string", updatedAt: "string" },
  calendly_trigger: { event: "string", eventUri: "string", eventName: "string", eventStatus: "string", eventStart: "string", eventEnd: "string", eventDuration: "number", eventType: "string", location: "string", locationType: "string", joinUrl: "string", inviteeName: "string", inviteeEmail: "string", inviteeTimezone: "string", cancelReason: "string", canceledBy: "string", rescheduleUrl: "string", cancelUrl: "string", questions: "array", createdAt: "string" },
  mailchimp_trigger: { event: "string", listId: "string", email: "string", emailId: "string", memberId: "string", mergeFields: "object", firstName: "string", lastName: "string", fullName: "string", status: "string", oldStatus: "string", reason: "string", campaignId: "string", ip: "string", source: "string", firedAt: "string" },
  clickup_trigger: { event: "string", webhookId: "string", taskId: "string", taskName: "string", taskUrl: "string", taskStatus: "string", taskStatusColor: "string", taskPriority: "string", taskAssignees: "array", taskDueDate: "string", taskStartDate: "string", listId: "string", listName: "string", folderId: "string", folderName: "string", spaceId: "string", fieldChanged: "string", oldValue: "string", newValue: "string", changedBy: "string", createdAt: "string" },
  monday_trigger: { event: "string", boardId: "number", boardName: "string", groupId: "string", groupName: "string", itemId: "number", itemName: "string", columnId: "string", columnTitle: "string", columnType: "string", newValue: "string", oldValue: "string", userId: "number", userName: "string", userEmail: "string", createdAt: "string" },
  figma_trigger: { event: "string", fileKey: "string", fileName: "string", fileUrl: "string", versionId: "string", versionLabel: "string", description: "string", commentId: "string", commentText: "string", commentAuthor: "string", commentCreatedAt: "string", resolvedAt: "string", timestamp: "string", triggeredBy: "string" },
  intercom_trigger: { event: "string", appId: "string", objectType: "string", objectId: "string", userId: "string", userName: "string", userEmail: "string", userType: "string", conversationId: "string", conversationState: "string", conversationUrl: "string", messageBody: "string", messageType: "string", assigneeId: "string", assigneeName: "string", teamId: "string", tags: "array", createdAt: "string", updatedAt: "string" },
  woocommerce_trigger: { event: "string", topic: "string", objectType: "string", action: "string", orderId: "number", orderNumber: "number", orderKey: "string", orderStatus: "string", orderTotal: "string", orderSubtotal: "string", currency: "string", paymentMethod: "string", paymentTitle: "string", billingName: "string", billingEmail: "string", billingPhone: "string", billingAddress: "string", shippingName: "string", shippingAddress: "string", lineItems: "array", itemCount: "number", customerId: "number", couponCodes: "array", notes: "string", createdAt: "string", updatedAt: "string" },
  azure_devops_trigger: { event: "string", eventId: "string", projectId: "string", workItemId: "number", workItemType: "string", title: "string", state: "string", assignedTo: "string", createdBy: "string", areaPath: "string", iterationPath: "string", teamProject: "string", priority: "number", url: "string", revision: "number", buildId: "number", buildNumber: "string", buildStatus: "string", buildResult: "string", repoName: "string", branch: "string", commitId: "string", prId: "number", prTitle: "string", prStatus: "string", createdAt: "string" },
  instagram_trigger: { event: "string", object: "string", accountId: "string", mediaId: "string", mediaType: "string", mediaUrl: "string", permalink: "string", caption: "string", commentId: "string", commentText: "string", commentFrom: "string", commentFromId: "string", likeCount: "number", senderId: "string", recipientId: "string", messageText: "string", messageAttachments: "array", isEcho: "boolean" },
  tiktok_trigger: { event: "string", videoId: "string", videoTitle: "string", videoDesc: "string", videoUrl: "string", coverUrl: "string", duration: "number", likeCount: "number", commentCount: "number", shareCount: "number", viewCount: "number", authorId: "string", authorName: "string", authorUsername: "string", authorFollowers: "number", hashtags: "array", mentions: "array", musicTitle: "string", isAd: "boolean", createTime: "string" },
  mastodon_trigger: { event: "string", statusId: "string", uri: "string", url: "string", content: "string", visibility: "string", language: "string", spoilerText: "string", isSensitive: "boolean", isReblog: "boolean", reblogId: "string", reblogsCount: "number", favouritesCount: "number", repliesCount: "number", accountId: "string", accountUsername: "string", accountDisplayName: "string", accountUrl: "string", accountFollowers: "number", mediaAttachments: "array", tags: "array", mentions: "array", createdAt: "string" },
  producthunt_trigger: { posts: "array", count: "number", tag: "string", triggeredAt: "string", id: "string", name: "string", tagline: "string", description: "string", url: "string", thumbnailUrl: "string", votes: "number", comments: "number", topics: "array", makers: "array", createdAt: "string" },
  sharepoint_trigger: { event: "string", subscriptionId: "string", resourceType: "string", siteId: "string", driveId: "string", itemId: "string", itemName: "string", itemPath: "string", itemType: "string", mimeType: "string", fileSize: "number", webUrl: "string", createdBy: "string", lastModifiedBy: "string", createdAt: "string", lastModifiedAt: "string" },
  virustotal_trigger: { id: "string", type: "string", name: "string", sha256: "string", md5: "string", sha1: "string", size: "number", mimeType: "string", malicious: "number", suspicious: "number", undetected: "number", harmless: "number", totalEngines: "number", detectionRate: "string", isMalicious: "boolean", isSuspicious: "boolean", reputation: "number", tags: "array", analysedAt: "string" },

  // ── Polling triggers ───────────────────────────────────────────────────
  youtube_trigger: { items: "array", count: "number", channelId: "string", triggeredAt: "string", videoId: "string", title: "string", description: "string", channelTitle: "string", thumbnailUrl: "string", url: "string", views: "string", likes: "string", comments: "string", publishedAt: "string" },
  reddit_trigger: { subreddit: "string", sort: "string", posts: "array", count: "number", triggeredAt: "string", id: "string", title: "string", selftext: "string", url: "string", permalink: "string", score: "number", upvoteRatio: "number", numComments: "number", author: "string", thumbnail: "string", flair: "string", isVideo: "boolean", isNsfw: "boolean", awards: "number", createdAt: "string" },
  hackernews_trigger: { storyType: "string", stories: "array", count: "number", triggeredAt: "string", id: "number", storyTitle: "string", storyUrl: "string", hnUrl: "string", score: "number", author: "string", numComments: "number", domain: "string", text: "string", storyCreatedAt: "string" },
  price_alert_trigger: { symbol: "string", currency: "string", price: "number", change24h: "number", changePercent24h: "number", high24h: "number", low24h: "number", volume24h: "number", marketCap: "number", source: "string", threshold: "number", alertType: "string", triggered: "boolean", priceFormatted: "string", checkedAt: "string" },
  google_calendar_trigger: { calendarId: "string", events: "array", count: "number", triggeredAt: "string", id: "string", summary: "string", description: "string", location: "string", status: "string", url: "string", startTime: "string", endTime: "string", isAllDay: "boolean", organizer: "string", attendees: "array", attendeeCount: "number", recurrence: "array", conferenceLink: "string", created: "string", updated: "string" },
  google_sheets_trigger: { spreadsheetId: "string", range: "string", sheetName: "string", headers: "array", totalRows: "number", newRows: "array", triggeredAt: "string" },
  google_drive_trigger: { files: "array", count: "number", folderId: "string", triggeredAt: "string", changeType: "string", id: "string", name: "string", mimeType: "string", isFolder: "boolean", isGoogleDoc: "boolean", size: "number", webViewLink: "string", downloadLink: "string", owner: "string", createdAt: "string", modifiedAt: "string" },
  google_docs_trigger: { documentId: "string", title: "string", url: "string", wordCount: "number", charCount: "number", revisionId: "string", inlineObjects: "number", locale: "string", triggeredAt: "string" },
  google_forms_trigger: { formId: "string", formTitle: "string", totalResponses: "number", responses: "array", triggeredAt: "string", responseId: "string", email: "string", submitTime: "string", answers: "object" },
  onedrive_trigger: { folderId: "string", files: "array", count: "number", triggeredAt: "string", id: "string", name: "string", isFolder: "boolean", mimeType: "string", size: "number", webUrl: "string", downloadUrl: "string", parentPath: "string", createdBy: "string", modifiedBy: "string", createdAt: "string", modifiedAt: "string" },
  outlook_trigger: { folder: "string", emails: "array", count: "number", triggeredAt: "string", id: "string", subject: "string", preview: "string", from: "string", fromName: "string", to: "array", cc: "array", isRead: "boolean", hasAttachments: "boolean", importance: "string", categories: "array", receivedAt: "string", sentAt: "string" },
  teams_trigger: { teamId: "string", channelId: "string", messages: "array", count: "number", triggeredAt: "string", id: "string", body: "string", bodyType: "string", subject: "string", from: "string", fromEmail: "string", fromId: "string", reactions: "array", attachments: "array", mentions: "array", importance: "string", createdAt: "string" },

  // ── System monitor triggers ───────────────────────────────────────────
  github_issue_trigger: { event: "string", action: "string", repoName: "string", repoUrl: "string", sender: "string", isPR: "boolean", number: "number", title: "string", state: "string", url: "string", author: "string", body: "string", labels: "array", assignees: "array", milestone: "string", commentBody: "string", commentAuthor: "string", closedAt: "string", createdAt: "string", updatedAt: "string", prAuthor: "string", baseBranch: "string", headBranch: "string", merged: "boolean", draft: "boolean", additions: "number", deletions: "number", changedFiles: "number" },
  http_monitor_trigger: { url: "string", method: "string", isUp: "boolean", statusCode: "number", statusText: "string", responseTime: "number", expectedStatus: "number", statusMatch: "boolean", expectedText: "string", contentMatch: "boolean", bodySnippet: "string", redirectUrl: "string", error: "string", ssl: "boolean", checkedAt: "string" },
  ssl_trigger: { hostname: "string", port: "number", isValid: "boolean", isExpired: "boolean", daysRemaining: "number", expiresWithinAlertDays: "boolean", subject: "string", issuer: "string", issuerCN: "string", fingerprint: "string", serialNumber: "string", validFrom: "string", validTo: "string", protocol: "string", cipher: "string", authorized: "boolean", authorizationError: "string", checkedAt: "string" },
  dns_trigger: { hostname: "string", resolvedIp: "string", ipFamily: "string", records: "object", aRecords: "array", mxRecords: "array", nsRecords: "array", txtRecords: "array", cnameRecords: "array", hasSPF: "boolean", hasDMARC: "boolean", hasDKIM: "boolean", spfRecord: "string", hasErrors: "boolean", checkedAt: "string" },
  port_monitor_trigger: { host: "string", ports: "array", openPorts: "array", closedPorts: "array", allOpen: "boolean", anyOpen: "boolean", isUp: "boolean", checkedAt: "string" },
  ssh_trigger: { host: "string", port: "number", username: "string", command: "string", stdout: "string", stderr: "string", exitCode: "number", success: "boolean", lines: "array", executedAt: "string" },
  docker_trigger: { containers: "array", count: "number", running: "number", stopped: "number", runningContainers: "array", stoppedContainers: "array", triggeredAt: "string" },
  db_trigger: { dbType: "string", collection: "string", table: "string", documents: "array", rows: "array", columns: "array", count: "number", latestDocument: "object", latestRow: "object", triggeredAt: "string" },
  imap_trigger: { folder: "string", emails: "array", count: "number", triggeredAt: "string", uid: "number", subject: "string", from: "string", fromName: "string", to: "array", cc: "array", date: "string", messageId: "string", body: "string", isRead: "boolean", isFlagged: "boolean", hasAttachments: "boolean" },
  error_trigger: { event: "string", errorMessage: "string", errorType: "string", errorCode: "string", errorStack: "string", failedNodeId: "string", failedNodeType: "string", failedNodeLabel: "string", workflowId: "string", executionId: "string", workspaceName: "string", triggeredAt: "string" },

  // New Utility Nodes
  qr_code: { dataUrl: "string", content: "string", size: "number", format: "string" },
  text_splitter: { chunks: "array", chunkCount: "number", totalLength: "number" },
  template_renderer: { rendered: "string", templateLength: "number", outputLength: "number" },
  json_validator: { valid: "boolean", data: "object", errors: "array", errorCount: "number" },
  switch: { value: "string", matchedCase: "string", isDefault: "boolean" },
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

  // Fall back to default schema for known types
  const backendType = node.data?.backendType;
  if (backendType && DEFAULT_SCHEMAS[backendType]) {
    return DEFAULT_SCHEMAS[backendType];
  }

  return null;
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
