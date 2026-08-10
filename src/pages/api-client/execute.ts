export const prerender = false;

import type { APIRoute } from "astro";
import {
  PROXY_MAX_BODY_BYTES,
  fetchWithGuards,
  jsonError,
  jsonOk,
} from "../../server/api-client-proxy";

const ALLOWED_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

export const POST: APIRoute = async ({ request }) => {
  let payload: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: string | null;
    bodyEncoding?: "utf8" | "base64";
    followRedirects?: boolean;
    timeoutMs?: number;
  };

  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON payload.");
  }

  const method = (payload.method ?? "GET").toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    return jsonError(400, "Unsupported HTTP method.");
  }

  if (!payload.url || typeof payload.url !== "string") {
    return jsonError(400, "A target URL is required.");
  }

  let body: BodyInit | null = null;
  if (payload.body != null && payload.body !== "") {
    if (typeof payload.body !== "string") {
      return jsonError(400, "Request body must be a string.");
    }

    if (payload.bodyEncoding === "base64") {
      try {
        const binary = atob(payload.body);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        if (bytes.byteLength > PROXY_MAX_BODY_BYTES) {
          return jsonError(413, "Request body is too large.");
        }
        body = bytes;
      } catch {
        return jsonError(400, "Invalid base64 request body.");
      }
    } else {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(payload.body);
      if (bytes.byteLength > PROXY_MAX_BODY_BYTES) {
        return jsonError(413, "Request body is too large.");
      }
      body = payload.body;
    }
  }

  try {
    const result = await fetchWithGuards({
      method,
      url: payload.url,
      headers: payload.headers,
      body: method === "GET" || method === "HEAD" ? null : body,
      followRedirects: payload.followRedirects,
      timeoutMs: payload.timeoutMs,
    });

    return jsonOk({
      ok: result.status >= 200 && result.status < 400,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "AbortError"
          ? "Request timed out."
          : error.message
        : "Request failed.";
    return jsonError(400, message);
  }
};
