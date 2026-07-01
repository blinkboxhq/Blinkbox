/**
 * Zendesk — Help Center (Guide).
 */
import { need, lim, enc, num } from "../GenericFunctions.js";

async function opListArticles(config, { api }) {
  const { data } = await api.get(`/help_center/articles.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, articles: data.articles || [], count: data.count };
}
async function opGetArticle(config, { api }) {
  const a = need(config, "articleId", "getArticle"); if (a) return a;
  const { data } = await api.get(`/help_center/articles/${enc(config.articleId)}.json`);
  return data.article;
}
async function opCreateArticle(config, { api }) {
  const s = need(config, "sectionId", "createArticle"); if (s) return s;
  const t = need(config, "title", "createArticle"); if (t) return t;
  const article = { title: config.title, body: config.body || "", locale: config.locale || "en-us" };
  if (config.permissionGroupId) article.permission_group_id = num(config.permissionGroupId);
  if (config.userSegmentId) article.user_segment_id = num(config.userSegmentId);
  const { data } = await api.post(`/help_center/sections/${enc(config.sectionId)}/articles.json`, { article });
  return data.article;
}
async function opUpdateArticle(config, { api }) {
  const a = need(config, "articleId", "updateArticle"); if (a) return a;
  const article = {};
  if (config.title) article.title = config.title;
  if (config.body) article.body = config.body;
  const { data } = await api.put(`/help_center/articles/${enc(config.articleId)}.json`, { article });
  return data.article;
}
async function opDeleteArticle(config, { api }) {
  const a = need(config, "articleId", "deleteArticle"); if (a) return a;
  await api.delete(`/help_center/articles/${enc(config.articleId)}.json`);
  return { success: true, deleted: config.articleId };
}
async function opListSections(config, { api }) {
  const { data } = await api.get(`/help_center/sections.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, sections: data.sections || [], count: data.count };
}
async function opCreateSection(config, { api }) {
  const c = need(config, "categoryId", "createSection"); if (c) return c;
  const n = need(config, "name", "createSection"); if (n) return n;
  const { data } = await api.post(`/help_center/categories/${enc(config.categoryId)}/sections.json`, {
    section: { name: config.name, description: config.description, locale: config.locale || "en-us" },
  });
  return data.section;
}
async function opListCategories(config, { api }) {
  const { data } = await api.get(`/help_center/categories.json`, { params: { per_page: lim(config.limit) } });
  return { success: true, categories: data.categories || [], count: data.count };
}
async function opCreateCategory(config, { api }) {
  const n = need(config, "name", "createCategory"); if (n) return n;
  const { data } = await api.post(`/help_center/categories.json`, {
    category: { name: config.name, description: config.description, locale: config.locale || "en-us" },
  });
  return data.category;
}

export const helpCenterOperations = {
  listArticles: opListArticles, getArticle: opGetArticle, createArticle: opCreateArticle,
  updateArticle: opUpdateArticle, deleteArticle: opDeleteArticle,
  listSections: opListSections, createSection: opCreateSection,
  listCategories: opListCategories, createCategory: opCreateCategory,
};
