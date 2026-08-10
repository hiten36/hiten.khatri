export const prerender = false;

import type { APIRoute } from "astro";
import {
  PROXY_MAX_RESPONSE_BYTES,
  assertPublicHttpUrl,
  fetchWithGuards,
  jsonError,
  jsonOk,
} from "../../server/api-client-proxy";

function extractPostmanCollectionId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    if (!host.includes("postman.com") && !host.includes("getpostman.com")) {
      return null;
    }

    const patterns = [
      /\/collection\/([A-Za-z0-9-]+)/i,
      /\/collections\/([A-Za-z0-9-]+)/i,
      /collectionId=([A-Za-z0-9-]+)/i,
    ];

    for (const pattern of patterns) {
      const match = rawUrl.match(pattern);
      if (match?.[1]) return match[1];
    }
  } catch {
    return null;
  }
  return null;
}

export const POST: APIRoute = async ({ request }) => {
  let payload: {
    url?: string;
    postmanApiKey?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON payload.");
  }

  if (!payload.url || typeof payload.url !== "string") {
    return jsonError(400, "A collection URL is required.");
  }

  try {
    const collectionId = extractPostmanCollectionId(payload.url);
    let fetchUrl = payload.url;
    const headers: Record<string, string> = {
      accept: "application/json",
    };

    if (collectionId) {
      if (!payload.postmanApiKey?.trim()) {
        return jsonError(
          400,
          "This looks like a Postman collection/workspace link. Provide a Postman API key to fetch it. Public collection JSON links are deprecated.",
        );
      }
      fetchUrl = `https://api.getpostman.com/collections/${collectionId}`;
      headers["X-Api-Key"] = payload.postmanApiKey.trim();
    } else {
      await assertPublicHttpUrl(payload.url);
    }

    const result = await fetchWithGuards({
      method: "GET",
      url: fetchUrl,
      headers,
      followRedirects: true,
      timeoutMs: 30_000,
      maxResponseBytes: PROXY_MAX_RESPONSE_BYTES,
    });

    if (result.status < 200 || result.status >= 300) {
      return jsonError(
        400,
        `Failed to fetch collection (${result.status} ${result.statusText}).`,
      );
    }

    if (result.bodyEncoding !== "utf8") {
      return jsonError(400, "Remote resource did not return JSON text.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(result.bodyText);
    } catch {
      return jsonError(400, "Remote resource is not valid JSON.");
    }

    const collection =
      parsed &&
      typeof parsed === "object" &&
      "collection" in parsed &&
      (parsed as { collection: unknown }).collection
        ? (parsed as { collection: unknown }).collection
        : parsed;

    return jsonOk({
      ok: true,
      sourceUrl: result.finalUrl,
      collection,
      warnings: collectionId
        ? [
            "Imported via Postman API using your API key. The key is not stored on the server.",
          ]
        : [],
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "AbortError"
          ? "Import request timed out."
          : error.message
        : "Import failed.";
    return jsonError(400, message);
  }
};
