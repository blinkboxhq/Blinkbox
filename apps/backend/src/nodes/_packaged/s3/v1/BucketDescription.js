/**
 * S3 — Bucket resource. listBuckets (service root), createBucket, deleteBucket,
 * getBucketLocation and bucketExists. New parity additions over the monolith
 * (which was object-only). Handlers receive (config, ctx).
 */
import axios from "axios";
import { signRequest, xmlValues } from "../GenericFunctions.js";

function serviceRoot(region, customEndpoint) {
  return customEndpoint || `https://s3.${region}.amazonaws.com`;
}

async function opListBuckets(_config, ctx) {
  const { accessKey, secretKey, region, customEndpoint } = ctx;
  const url = `${serviceRoot(region, customEndpoint)}/`;
  const signed = signRequest("GET", url, {}, "", accessKey, secretKey, region);
  const { data } = await axios.get(url, { headers: signed, timeout: 120000, responseType: "text" });
  const names = xmlValues(data, "Name");
  const dates = xmlValues(data, "CreationDate");
  const buckets = names.map((n, i) => ({ name: n, creationDate: dates[i] }));
  return { success: true, buckets, count: buckets.length };
}

async function opCreateBucket(config, ctx) {
  const { accessKey, secretKey, region, bucket, base } = ctx;
  const url = `${base}/`;
  let body = "";
  const extraHeaders = {};
  if (region && region !== "us-east-1") {
    body = `<?xml version="1.0" encoding="UTF-8"?><CreateBucketConfiguration><LocationConstraint>${region}</LocationConstraint></CreateBucketConfiguration>`;
    extraHeaders["content-type"] = "application/xml";
  }
  const signed = signRequest("PUT", url, extraHeaders, body, accessKey, secretKey, region);
  await axios.put(url, body, { headers: signed, timeout: 120000 });
  return { success: true, created: true, bucket, region };
}

async function opDeleteBucket(config, ctx) {
  const { accessKey, secretKey, region, bucket, base } = ctx;
  const url = `${base}/`;
  const signed = signRequest("DELETE", url, {}, "", accessKey, secretKey, region);
  await axios.delete(url, { headers: signed, timeout: 120000 });
  return { success: true, deleted: true, bucket };
}

async function opGetBucketLocation(config, ctx) {
  const { accessKey, secretKey, region, bucket, base } = ctx;
  const url = `${base}/?location`;
  const signed = signRequest("GET", url, {}, "", accessKey, secretKey, region);
  const { data } = await axios.get(url, { headers: signed, timeout: 120000, responseType: "text" });
  const loc = xmlValues(data, "LocationConstraint")[0] || "us-east-1";
  return { success: true, bucket, location: loc };
}

async function opBucketExists(config, ctx) {
  const { accessKey, secretKey, region, bucket, base } = ctx;
  const url = `${base}/`;
  const signed = signRequest("HEAD", url, {}, "", accessKey, secretKey, region);
  try {
    await axios.head(url, { headers: signed, timeout: 120000 });
    return { exists: true, bucket };
  } catch (e) {
    if (e.response?.status === 404) return { exists: false, bucket };
    throw e;
  }
}

export const bucketOperations = {
  listBuckets: opListBuckets,
  createBucket: opCreateBucket,
  deleteBucket: opDeleteBucket,
  getBucketLocation: opGetBucketLocation,
  bucketExists: opBucketExists,
};
