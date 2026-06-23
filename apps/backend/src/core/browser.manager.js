/**
 * Browser Cluster Manager — Puppeteer-Cluster Edition
 *
 * Replaces the single global Puppeteer instance with puppeteer-cluster.
 * Each task runs in an isolated browser context — if one page crashes,
 * it doesn't take down other concurrent scraping jobs.
 *
 * Architecture:
 *   - CONCURRENCY_CONTEXT: Each task gets its own browser context (isolated cookies/storage)
 *   - maxConcurrency: 4 simultaneous pages
 *   - retryLimit: 1 (auto-retry failed tasks once)
 *   - timeout: 10 min per task (matches browserAgent.timeoutMs — long ai_goal runs)
 *   - Stealth plugin defeats basic bot detection
 */

import { Cluster } from "puppeteer-cluster";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

class BrowserClusterManager {
  constructor() {
    this.cluster = null;
    this.isInitializing = false;
  }

  async getCluster() {
    if (this.cluster) return this.cluster;

    // Prevent multiple simultaneous launches
    if (this.isInitializing) {
      while (this.isInitializing) {
        await new Promise((res) => setTimeout(res, 100));
      }
      return this.cluster;
    }

    this.isInitializing = true;
    try {
      console.log("[BrowserCluster] Launching pooled browser engine...");

      this.cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: 4,
        puppeteer,
        puppeteerOptions: {
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled",
            "--disable-gpu",
          ],
        },
        timeout: 600_000,
        retryLimit: 1,
        monitor: false,
      });

      this.cluster.on("taskerror", (err, data) => {
        console.error(`[BrowserCluster] Task error:`, err.message);
      });

      console.log("[BrowserCluster] Pool ready (max 4 concurrent contexts)");
      return this.cluster;
    } catch (err) {
      this.cluster = null;
      throw err;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Execute a browser task in an isolated context.
   * The cluster manages page creation, context isolation, and crash recovery.
   *
   * @param {Object} data - Arbitrary data passed to the task function as `data`
   * @param {Function} taskFn - async ({ page, data }) => result
   * @returns {*} Whatever the taskFn returns
   */
  async execute(data, taskFn) {
    const cluster = await this.getCluster();
    return cluster.execute(data, taskFn);
  }

  async shutdown() {
    if (this.cluster) {
      await this.cluster.idle();
      await this.cluster.close();
      this.cluster = null;
      console.log("[BrowserCluster] Shut down cleanly");
    }
  }
}

export const browserCluster = new BrowserClusterManager();
