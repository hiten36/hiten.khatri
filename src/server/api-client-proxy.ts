import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const PROXY_MAX_BODY_BYTES = 2_000_000;
export const PROXY_MAX_RESPONSE_BYTES = 2_000_000;
export const PROXY_DEFAULT_TIMEOUT_MS = 30_000;
export const PROXY_MAX_TIMEOUT_MS = 60_000;
export const PROXY_MAX_REDIRECTS = 5;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
  "metadata",
]);

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

export function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function jsonOk(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  const ranges: Array<[number, number]> = [
    [ipv4ToInt("0.0.0.0"), ipv4ToInt("0.255.255.255")],
    [ipv4ToInt("10.0.0.0"), ipv4ToInt("10.255.255.255")],
    [ipv4ToInt("100.64.0.0"), ipv4ToInt("100.127.255.255")],
    [ipv4ToInt("127.0.0.0"), ipv4ToInt("127.255.255.255")],
    [ipv4ToInt("169.254.0.0"), ipv4ToInt("169.254.255.255")],
    [ipv4ToInt("172.16.0.0"), ipv4ToInt("172.31.255.255")],
    [ipv4ToInt("192.0.0.0"), ipv4ToInt("192.0.0.255")],
    [ipv4ToInt("192.168.0.0"), ipv4ToInt("192.168.255.255")],
    [ipv4ToInt("198.18.0.0"), ipv4ToInt("198.19.255.255")],
    [ipv4ToInt("224.0.0.0"), ipv4ToInt("255.255.255.255")],
  ];
  return ranges.some(([start, end]) => value >= start && value <= end);
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80")) return true;
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice(7);
    if (isIP(mapped) === 4) return isPrivateIpv4(mapped);
  }
  return false;
}

export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  if (host === "metadata.google.internal") return true;
  const version = isIP(host);
  if (version) return isBlockedIp(host);
  return false;
}

export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("URLs with embedded credentials are not allowed.");
  }

  if (isBlockedHostname(parsed.hostname)) {
    throw new Error("Private or reserved hosts are not allowed.");
  }

  const version = isIP(parsed.hostname);
  if (version) {
    if (isBlockedIp(parsed.hostname)) {
      throw new Error("Private or reserved IP addresses are not allowed.");
    }
    return parsed;
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(parsed.hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("Unable to resolve hostname.");
  }

  if (!addresses.length) {
    throw new Error("Unable to resolve hostname.");
  }

  for (const entry of addresses) {
    if (isBlockedIp(entry.address)) {
      throw new Error("Hostname resolves to a private or reserved address.");
    }
  }

  return parsed;
}

export function sanitizeOutgoingHeaders(
  headers: Record<string, string> | undefined,
): Headers {
  const next = new Headers();
  if (!headers) return next;

  for (const [key, value] of Object.entries(headers)) {
    const name = key.trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) continue;
    if (lower.startsWith("proxy-")) continue;
    if (lower === "cookie") continue;
    if (typeof value !== "string") continue;
    try {
      next.set(name, value);
    } catch {
      // skip invalid header names/values
    }
  }

  return next;
}

export function pickResponseHeaders(headers: Headers): Array<{ key: string; value: string }> {
  const result: Array<{ key: string; value: string }> = [];
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) return;
    result.push({ key, value });
  });
  return result;
}

export async function readLimitedBody(
  response: Response,
  maxBytes: number,
): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  if (!response.body) {
    return { bytes: new Uint8Array(), truncated: false };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    if (total + value.byteLength > maxBytes) {
      const remaining = Math.max(0, maxBytes - total);
      if (remaining > 0) chunks.push(value.slice(0, remaining));
      total = maxBytes;
      truncated = true;
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
      break;
    }

    chunks.push(value);
    total += value.byteLength;
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, truncated };
}

export function bytesToTextOrBase64(bytes: Uint8Array, mimeType: string): {
  bodyText: string;
  bodyEncoding: "utf8" | "base64";
} {
  const lower = mimeType.toLowerCase();
  const looksText =
    lower.startsWith("text/") ||
    lower.includes("json") ||
    lower.includes("xml") ||
    lower.includes("javascript") ||
    lower.includes("svg") ||
    lower.includes("csv") ||
    lower.includes("urlencoded");

  if (looksText || bytes.length === 0) {
    try {
      return {
        bodyText: new TextDecoder("utf-8", { fatal: false }).decode(bytes),
        bodyEncoding: "utf8",
      };
    } catch {
      // fall through
    }
  }

  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return {
    bodyText: btoa(binary),
    bodyEncoding: "base64",
  };
}

export async function fetchWithGuards(options: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  followRedirects?: boolean;
  timeoutMs?: number;
  maxResponseBytes?: number;
}): Promise<{
  status: number;
  statusText: string;
  headers: Array<{ key: string; value: string }>;
  mimeType: string;
  bodyText: string;
  bodyEncoding: "utf8" | "base64";
  truncated: boolean;
  durationMs: number;
  sizeBytes: number;
  finalUrl: string;
}> {
  const timeoutMs = Math.min(
    Math.max(options.timeoutMs ?? PROXY_DEFAULT_TIMEOUT_MS, 1_000),
    PROXY_MAX_TIMEOUT_MS,
  );
  const maxResponseBytes = options.maxResponseBytes ?? PROXY_MAX_RESPONSE_BYTES;
  const followRedirects = options.followRedirects !== false;

  let currentUrl = await assertPublicHttpUrl(options.url);
  let redirectCount = 0;
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    while (true) {
      const response = await fetch(currentUrl, {
        method: options.method,
        headers: sanitizeOutgoingHeaders(options.headers),
        body: options.body ?? undefined,
        redirect: "manual",
        signal: controller.signal,
      });

      const location = response.headers.get("location");
      const isRedirect =
        [301, 302, 303, 307, 308].includes(response.status) && Boolean(location);

      if (followRedirects && isRedirect && location) {
        redirectCount += 1;
        if (redirectCount > PROXY_MAX_REDIRECTS) {
          throw new Error("Too many redirects.");
        }
        const nextUrl = new URL(location, currentUrl);
        currentUrl = await assertPublicHttpUrl(nextUrl.toString());
        continue;
      }

      const { bytes, truncated } = await readLimitedBody(response, maxResponseBytes);
      const mimeType = response.headers.get("content-type") ?? "application/octet-stream";
      const encoded = bytesToTextOrBase64(bytes, mimeType);

      return {
        status: response.status,
        statusText: response.statusText,
        headers: pickResponseHeaders(response.headers),
        mimeType,
        bodyText: encoded.bodyText,
        bodyEncoding: encoded.bodyEncoding,
        truncated,
        durationMs: Date.now() - started,
        sizeBytes: bytes.byteLength,
        finalUrl: currentUrl.toString(),
      };
    }
  } finally {
    clearTimeout(timer);
  }
}
