/**
 * Thin typed client for the Blinkbox control plane, plus the workflow graphs the
 * suite installs. Graph shapes mirror apps/backend/src/schemas.ts
 * (WorkflowDefinitionSchema) — node `data` IS the node config and is
 * expression-resolved by the executor before the handler sees it.
 */
import type http from "node:http";
import { json, request } from "./http-client.js";
import type { RequestResult } from "./types.js";

export interface ApiOptions {
  base: string;
  token: string | null;
  headers: Record<string, string>;
  agent: http.Agent;
  timeoutMs: number;
}

export interface Automation {
  _id: string;
  name: string;
  active?: boolean;
  description?: string;
  nodes?: Array<{ id: string; type: string }>;
}

export interface Execution {
  _id: string;
  status?: string;
  cursors?: Array<{ nodeId: string; status: string }>;
  createdAt?: string;
  events?: Array<{ type: string; message?: string }>;
}

export class BlinkboxApi {
  constructor(private readonly o: ApiOptions) {}

  get base(): string {
    return this.o.base;
  }

  setToken(t: string): void {
    this.o.token = t;
  }

  private authHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return {
      "content-type": "application/json",
      accept: "application/json",
      ...(this.o.token ? { authorization: `Bearer ${this.o.token}` } : {}),
      ...this.o.headers,
      ...extra,
    };
  }

  call(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {},
    opts: { silent?: boolean; timeoutMs?: number } = {},
  ): Promise<RequestResult> {
    return request({
      method,
      url: `${this.o.base}${path}`,
      headers: this.authHeaders(extraHeaders),
      body: body == null ? null : JSON.stringify(body),
      agent: this.o.agent,
      timeoutMs: opts.timeoutMs ?? this.o.timeoutMs,
      silent: opts.silent,
    });
  }

  async health(silent = true): Promise<RequestResult> {
    return request({
      method: "GET",
      url: `${this.o.base}/health`,
      agent: this.o.agent,
      timeoutMs: 5000,
      silent,
    });
  }

  async login(email: string, password: string): Promise<string> {
    const r = await this.call("POST", "/api/auth/login", { email, password }, {}, { silent: true });
    const b = json(r);
    if (r.status !== 200 || !b?.token) {
      throw new Error(
        `Login failed (${r.status ?? r.errorClass}): ${b?.message ?? b?.error ?? r.errorMessage ?? "no token in response"}`,
      );
    }
    this.o.token = b.token as string;
    return b.token as string;
  }

  async createAutomation(def: Record<string, unknown>): Promise<Automation> {
    const r = await this.call("POST", "/api/automation", def, {}, { silent: true });
    const b = json(r);
    if (!b?.automation?._id) {
      throw new Error(
        `createAutomation failed (${r.status ?? r.errorClass}): ${JSON.stringify(b ?? r.errorMessage).slice(0, 400)}`,
      );
    }
    return b.automation as Automation;
  }

  async activate(id: string): Promise<boolean> {
    const r = await this.call("POST", `/api/automation/${id}/activate`, {}, {}, { silent: true });
    return r.status === 200;
  }

  /** PUT /api/automation/:id — used to repoint a caller node once both ends of a loop exist. */
  async updateAutomation(id: string, def: Record<string, unknown>): Promise<boolean> {
    const r = await this.call("PUT", `/api/automation/${id}`, def, {}, { silent: true });
    return r.status === 200 || r.status === 201;
  }

  async deleteAutomation(id: string): Promise<boolean> {
    const r = await this.call("DELETE", `/api/automation/${id}`, undefined, {}, { silent: true });
    return r.status === 200;
  }

  async getAutomation(id: string): Promise<Automation | null> {
    const r = await this.call("GET", `/api/automation/${id}`, undefined, {}, { silent: true });
    return (json(r)?.automation as Automation) ?? null;
  }

  async listExecutions(automationId: string): Promise<Execution[]> {
    const r = await this.call(
      "GET",
      `/api/execution/automation/${automationId}`,
      undefined,
      {},
      { silent: true },
    );
    return (json(r)?.executions as Execution[]) ?? [];
  }

  async getExecution(executionId: string): Promise<Execution | null> {
    const r = await this.call("GET", `/api/execution/${executionId}`, undefined, {}, { silent: true });
    return (json(r)?.execution as Execution) ?? null;
  }

  async getExecutionLogs(executionId: string): Promise<Array<Record<string, unknown>>> {
    const r = await this.call("GET", `/api/execution/${executionId}/logs`, undefined, {}, { silent: true });
    return (json(r)?.logs as Array<Record<string, unknown>>) ?? [];
  }

  webhookUrl(automationId: string): string {
    return `${this.o.base}/webhook/${automationId}`;
  }
}

const pos = (x: number, y: number) => ({ x, y });

/**
 * webhook → set_fields. The terminal node does no I/O, so latency and memory
 * measured against this graph belong to ingest + the engine, not to a network peer.
 */
export function sinkWorkflow(name: string): Record<string, unknown> {
  return {
    name,
    trigger: "webhook",
    description: "chaos-cascade: ingest sink",
    entryNodeId: "trig",
    triggerNodes: [{ nodeId: "trig", type: "webhook" }],
    settings: { maxParallel: 10 },
    nodes: [
      { id: "trig", type: "webhook", data: {}, position: pos(0, 0) },
      {
        id: "sink",
        type: "set_fields",
        data: { mode: "set", fields: [{ key: "chaos", value: "sunk" }] },
        position: pos(260, 0),
      },
    ],
    edges: [{ id: "e1", source: "trig", target: "sink", type: "onSuccess" }],
  };
}

/**
 * webhook → http_request(url). Used both for the loop storm (url points back at
 * another automation's webhook) and for the flaky-peer test (url points at the
 * bundled chaos server). `{{ $json.x }}` in `data` is resolved by the executor.
 */
export function callerWorkflow(name: string, url: string, extraBody: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name,
    trigger: "webhook",
    description: "chaos-cascade: outbound caller",
    entryNodeId: "trig",
    triggerNodes: [{ nodeId: "trig", type: "webhook" }],
    settings: { maxParallel: 10 },
    nodes: [
      { id: "trig", type: "webhook", data: {}, position: pos(0, 0) },
      {
        id: "call",
        type: "http_request",
        data: {
          url,
          method: "POST",
          headers: [{ key: "x-chaos-agent", value: "cascade" }],
          body: { hop: "{{ $json.hop }}", corr: "{{ $json.corr }}", ...extraBody },
        },
        position: pos(260, 0),
      },
    ],
    edges: [{ id: "e1", source: "trig", target: "call", type: "onSuccess" }],
  };
}
