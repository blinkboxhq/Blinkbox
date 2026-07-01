/**
 * Linear — Comment resource. Handlers receive `(config, apiKey)`.
 */
import { gql } from "../GenericFunctions.js";

async function opCreateComment(config, apiKey) {
  if (!config.issueId || !config.body) return { success: false, error: "Linear createComment: 'issueId' and 'body' are required.", skipped: true };
  const data = await gql(`mutation($input: CommentCreateInput!) { commentCreate(input: $input) { success comment { id url } } }`, { input: { issueId: config.issueId, body: config.body } }, apiKey);
  return { id: data.commentCreate.comment.id, url: data.commentCreate.comment.url, created: true };
}

async function opListComments(config, apiKey) {
  if (!config.issueId) return { success: false, error: "Linear listComments: 'issueId' is required.", skipped: true };
  const data = await gql(`query($id: String!) { issue(id: $id) { comments(first: 50) { nodes { id body user { name } createdAt } } } }`, { id: config.issueId }, apiKey);
  const c = data.issue.comments.nodes;
  return { comments: c.map((x) => ({ id: x.id, body: x.body, author: x.user?.name, createdAt: x.createdAt })), count: c.length };
}

export const commentOperations = {
  createComment: opCreateComment,
  addComment: opCreateComment,
  listComments: opListComments,
};
