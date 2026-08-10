import type { HttpMethod } from "../components/api-client/types";
import {
  buildTryInApiClientHref,
  type TryRequestPayload,
} from "./api-client-share";

const METHOD_RE =
  /`(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+([^`]+)`/gi;

const HEADING_RE = /^(#{2,4})\s+(.+)$/;

function detectBaseUrl(markdown: string): string {
  const production = markdown.match(
    /\*\*Production API\*\*\s*\|\s*`([^`]+)`/i,
  );
  if (production?.[1]) return production[1].replace(/\/$/, "");

  const local = markdown.match(/\*\*Local API\*\*\s*\|\s*`([^`]+)`/i);
  if (local?.[1]) return local[1].replace(/\/$/, "");

  return "{{baseUrl}}";
}

function mapMethod(value: string): HttpMethod {
  const method = value.toUpperCase();
  switch (method) {
    case "POST":
    case "PUT":
    case "PATCH":
    case "DELETE":
    case "HEAD":
    case "OPTIONS":
      return method;
    default:
      return "GET";
  }
}

function splitPathAndQuery(rawPath: string): {
  path: string;
  params: Array<{ key: string; value: string }>;
} {
  const trimmed = rawPath.trim();
  const qIndex = trimmed.indexOf("?");
  if (qIndex === -1) {
    return { path: trimmed, params: [] };
  }

  const path = trimmed.slice(0, qIndex);
  const query = trimmed.slice(qIndex + 1);
  const params: Array<{ key: string; value: string }> = [];
  for (const part of query.split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq === -1) {
      params.push({ key: decodeURIComponent(part), value: "" });
    } else {
      params.push({
        key: decodeURIComponent(part.slice(0, eq)),
        value: decodeURIComponent(part.slice(eq + 1)),
      });
    }
  }
  return { path, params };
}

function extractRequestBody(section: string, method: HttpMethod): string | null {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  const fenceRe = /```json\s*([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(section))) {
    const before = section.slice(Math.max(0, match.index - 160), match.index);
    if (/response\s*[`:]|response\s*`data`|\*\*\d{3}\s+response/i.test(before)) {
      continue;
    }
    const body = match[1]?.trim() ?? "";
    if (!body) continue;
    // Prefer object/array payloads that look like requests
    if (/^[{\[]/.test(body)) return body;
  }
  return null;
}

function sectionNeedsAuth(headingLine: string, section: string): boolean {
  if (/🔓/.test(headingLine) || /🔓/.test(section.slice(0, 200))) return false;
  if (/🔐/.test(headingLine) || /🔐/.test(section.slice(0, 280))) return true;
  // Auth routes in this handbook are public; everything else typically needs JWT
  if (/\/api\/auth\b/i.test(headingLine)) return false;
  if (/\/api\//i.test(headingLine)) return true;
  return false;
}

function buildPayload(options: {
  method: HttpMethod;
  rawPath: string;
  baseUrl: string;
  headingText: string;
  section: string;
}): TryRequestPayload {
  const { path, params } = splitPathAndQuery(options.rawPath);
  const absolute =
    path.startsWith("http://") || path.startsWith("https://")
      ? path
      : `${options.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;

  const bodyText = extractRequestBody(options.section, options.method);
  const headers: TryRequestPayload["headers"] = [
    { key: "Accept", value: "application/json" },
  ];

  if (bodyText) {
    headers.push({ key: "Content-Type", value: "application/json" });
  }

  const auth = sectionNeedsAuth(options.headingText, options.section)
    ? {
        type: "bearer" as const,
        bearerToken: "{{accessToken}}",
      }
    : { type: "none" as const };

  return {
    v: 1,
    name: `${options.method} ${path}`,
    method: options.method,
    url: absolute,
    params,
    headers,
    auth,
    body: bodyText
      ? {
          mode: "json",
          json: (() => {
            try {
              return JSON.stringify(JSON.parse(bodyText), null, 2);
            } catch {
              return bodyText;
            }
          })(),
        }
      : { mode: "none" },
  };
}

function renderTryBlock(payloads: TryRequestPayload[]): string {
  if (!payloads.length) return "";
  const links = payloads
    .map((payload) => {
      const href = buildTryInApiClientHref(payload);
      const label =
        payloads.length > 1
          ? `Try ${payload.method} in API Client`
          : "Try in API Client";
      // Use markdown links so Comark always renders them; MdLink forces new-tab.
      return `[${label} ↗](${href})`;
    })
    .join(" · ");

  return `\n\n${links}\n`;
}

/**
 * Inject "Try in API Client" links under detected API endpoint headings.
 * Preview-only transform — does not alter the editor source.
 */
export function enhanceMarkdownWithApiTryLinks(markdown: string): string {
  if (!markdown.trim()) return markdown;

  const baseUrl = detectBaseUrl(markdown);
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    output.push(line);

    const heading = line.match(HEADING_RE);
    if (!heading) continue;

    // Skip if a try link was already authored under this heading
    const nextUseful = lines.slice(i + 1, i + 6).join("\n");
    if (/\/api-client#try=/.test(nextUseful)) continue;

    METHOD_RE.lastIndex = 0;
    const methods: Array<{ method: HttpMethod; path: string }> = [];
    let methodMatch: RegExpExecArray | null;
    while ((methodMatch = METHOD_RE.exec(heading[2] ?? ""))) {
      methods.push({
        method: mapMethod(methodMatch[1]!),
        path: methodMatch[2]!.trim(),
      });
    }
    if (!methods.length) continue;

    let end = i + 1;
    while (end < lines.length) {
      const candidate = lines[end]!;
      if (/^#{1,4}\s+/.test(candidate)) break;
      end += 1;
    }
    const section = lines.slice(i, end).join("\n");

    const payloads = methods.map(({ method, path }) =>
      buildPayload({
        method,
        rawPath: path,
        baseUrl,
        headingText: line,
        section,
      }),
    );

    output.push(renderTryBlock(payloads));
  }

  return output.join("\n");
}

export function countApiTryTargets(markdown: string): number {
  METHOD_RE.lastIndex = 0;
  let count = 0;
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    if (!HEADING_RE.test(line)) continue;
    METHOD_RE.lastIndex = 0;
    while (METHOD_RE.exec(line)) count += 1;
  }
  return count;
}
