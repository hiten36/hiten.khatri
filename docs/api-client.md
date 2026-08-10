# API Client

Local-first Postman-style workspace available at `/api-client`.

## Features

- Request builder with params, headers, auth, body modes, and settings
- Collections, environments, history, multi-tab editing
- Postman Collection v2 / v2.1 import + export
- Import from file, pasted JSON, raw JSON URL, or Postman collection link + API key
- Light theme by default, dark mode supported
- IndexedDB persistence for workspace data

## Proxy

Browser requests are relayed through:

- `POST /api-client/execute`
- `POST /api-client/import-url`

No access key is required. The proxy:

- allows any publicly routable `http` / `https` URL
- blocks localhost, private/reserved IPs, link-local addresses, and cloud metadata hosts
- re-validates redirect targets
- enforces timeouts and body size limits
- strips hop-by-hop / cookie headers

### Privacy note

Request credentials and bodies transit your Vercel serverless function for proxying. Do not log them.

## Markdown → API Client

Markdown Studio auto-detects API headings like `` `POST /api/...` `` and injects **Try in API Client ↗** links in the preview (not in the source editor).

- Opens `/api-client` in a **new tab**
- Prefills method, URL, headers, auth, params, and JSON body via `#try=...`
- Uses **Production API** from the doc when present (falls back to `{{baseUrl}}`)
- Adds Bearer `{{accessToken}}` for JWT-style endpoints

Import a handbook like `api_test_payloads.md` into `/markdown`, then click any try link.

