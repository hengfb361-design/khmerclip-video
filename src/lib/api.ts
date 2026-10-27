import type { GenerateRequest, ServerHealth, TranslateResult, VideoJob } from "../types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface Client {
  baseUrl: string;
  token: string;
}

/** Accepts `xxxx.trycloudflare.com` or a full URL and returns a clean base URL. */
export function normalizeBaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

async function request<T>(client: Client, path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (client.token) headers.set("X-API-Token", client.token);
  if (init?.body) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${client.baseUrl}${path}`, { ...init, headers });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Network error", 0);
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : text.slice(0, 300);
    throw new ApiError(detail || `HTTP ${response.status}`, response.status);
  }

  return data as T;
}

export function getHealth(client: Client): Promise<ServerHealth> {
  return request<ServerHealth>(client, "/api/health");
}

export function translatePrompt(client: Client, text: string): Promise<TranslateResult> {
  return request<TranslateResult>(client, "/api/translate", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function createJob(client: Client, body: GenerateRequest): Promise<VideoJob> {
  return request<VideoJob>(client, "/api/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getJob(client: Client, id: string): Promise<VideoJob> {
  return request<VideoJob>(client, `/api/jobs/${encodeURIComponent(id)}`);
}

/** Absolute URL for a server media path (the token is embedded for <video src>). */
export function mediaUrl(client: Client, path: string): string {
  const url = /^https?:\/\//i.test(path) ? path : `${client.baseUrl}${path}`;
  if (!client.token) return url;
  return `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(client.token)}`;
}
