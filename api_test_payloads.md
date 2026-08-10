# GrowLuv API Reference for Flutter

Practical request/response handbook for the mobile team.  
Synced with the current `growluv_backend` (**WhatsApp-style chat**, groups, calls, notifications WS, 100ms livestream).

> **Not included:** Admin (`/api/admin/*`) — use Swagger at `/swagger` if needed.

---

## Quick start

| | |
|---|---|
| **Local API** | `http://localhost:4000` |
| **Production API** | `https://lobster-app-b3289.ondigitalocean.app` |
| **Swagger** | `{BASE}/swagger` |
| **WebSocket** | `ws://{HOST}/ws/connect?token={accessToken}&deviceId={deviceId}` |
| **WebSocket (alias)** | `ws://{HOST}/api/ws/connect?token=...&deviceId=...` |
| **Auth header** | `Authorization: Bearer <accessToken>` |
| **Content-Type** | `application/json` (unless noted) |

### Response envelope

```json
{ "success": true, "data": {}, "message": "optional", "pagination": {} }
```

```json
{ "success": false, "message": "Error description" }
```

### Pagination (most list endpoints)

| Query | Default | Notes |
|-------|---------|-------|
| `page` | `1` | |
| `perPage` | `20` | Messages often default to `50` |

```json
{
  "pagination": {
    "total": 100,
    "page": 1,
    "perPage": 20,
    "totalPages": 5,
    "hasMore": true
  }
}
```

### Auth legend

| Tag | Meaning |
|-----|---------|
| 🔓 Public | No token |
| 🔐 JWT | Bearer required → `401` if missing |
| 🟡 Optional JWT | Works without token; richer with auth |

### Uploads (important)

There is **no multipart upload** to the API.  
Flow: `POST /api/upload/presigned-url` → `PUT` file to S3 `uploadUrl` → use returned `cdnUrl` in other APIs.

---

## Table of contents

1. [Health](#1-health)
2. [Auth](#2-auth)
3. [Users & profile](#3-users--profile)
4. [Follows](#4-follows)
5. [Friends](#5-friends)
6. [Posts & feed](#6-posts--feed)
7. [Reactions](#7-reactions)
8. [Comments](#8-comments)
9. [Stories](#9-stories)
10. [Messages & chat](#10-messages--chat) ← **updated**
11. [Notifications](#11-notifications)
12. [Search](#12-search)
13. [Events](#13-events)
14. [Clubs](#14-clubs)
15. [Contests](#15-contests)
16. [Classes](#16-classes)
17. [Livestream (100ms)](#17-livestream-100ms)
18. [WebSocket](#18-websocket) ← **updated**
19. [Upload](#19-upload)
20. [Ads & boosts](#20-ads--boosts)
21. [Sponsorship](#21-sponsorship)
22. [Donations](#22-donations)
23. [Nonprofits](#23-nonprofits)
24. [Reports / scams / support](#24-reports--scams--support)
25. [Assessments & testimonials](#25-assessments--testimonials)
26. [CMS / config](#26-cms--config)

---

## 1. Health

### `GET /` 🔓

```json
{ "success": true, "message": "...", "version": "...", "timestamp": "..." }
```

### `GET /api/health` 🔓

```json
{ "success": true, "status": "healthy", "uptime": 123.4, "timestamp": "..." }
```

---

## 2. Auth

Prefix: `/api/auth` · All 🔓 · Rate-limited in production.

### `POST /api/auth/register`

**Required:** `name`, `email`, `password` (min 6), `username` (min 3)

```json
{
  "name": "Kevin Martin",
  "email": "kevin@example.com",
  "password": "Secret123!",
  "username": "kevinm",
  "phone": "+15551234567",
  "referralCode": "OPTIONAL",
  "userType": "individual",
  "gender": "male",
  "dob": "1995-04-12",
  "companyName": "",
  "industryType": "",
  "ngoType": "",
  "tagline": "",
  "location": "Los Angeles, CA",
  "city": "Los Angeles",
  "zipCode": "90001",
  "website": "",
  "registrationNumber": ""
}
```

`userType`: `individual` | `company` | `nonprofit`

**201 response `data`:**

```json
{
  "user": {
    "_id": "...",
    "name": "Kevin Martin",
    "email": "kevin@example.com",
    "username": "kevinm",
    "avatar": null,
    "userType": "individual",
    "role": "user",
    "emailVerified": false
  },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

### `POST /api/auth/login`

```json
{ "email": "kevin@example.com", "password": "Secret123!" }
```

### `POST /api/auth/forgot-password`

```json
{ "email": "kevin@example.com" }
```

### `POST /api/auth/reset-password`

```json
{ "token": "reset-token-from-email", "password": "NewSecret123!" }
```

### `POST /api/auth/verify-email`

```json
{ "token": "verify-token-from-email" }
```

### `POST /api/auth/send-otp`

```json
{ "target": "kevin@example.com", "type": "email" }
```

`type`: `email` | `phone`

### `POST /api/auth/verify-otp`

```json
{ "target": "kevin@example.com", "type": "email", "otp": "123456" }
```

Returns same shape as login (`user`, tokens).

### `POST /api/auth/refresh-token` (alias: `/api/auth/refresh`)

```json
{ "refreshToken": "eyJ..." }
```

```json
{ "success": true, "data": { "accessToken": "eyJ...", "refreshToken": "eyJ..." } }
```

### Social login

```http
POST /api/auth/google
POST /api/auth/facebook
POST /api/auth/apple
```

```json
{ "token": "provider-id-token-or-access-token", "userType": "individual" }
```

Apple may also send optional `name`.

**New user:** `{ "isNewUser": true, "profile": { ... } }`  
**Existing:** `{ "isNewUser": false, "user": {...}, "accessToken": "...", "refreshToken": "..." }`

---

## 3. Users & profile

Prefix: `/api/users` · 🔐

### `GET /api/users/profile`

Current user full profile.

### `PUT /api/users/profile`

All fields optional:

```json
{
  "name": "Kevin Martin",
  "username": "kevinm",
  "bio": "Building community",
  "about": "Longer about text",
  "occupation": "Designer",
  "education": "UCLA",
  "hometown": "LA",
  "website": "https://example.com",
  "location": "Los Angeles, CA",
  "city": "Los Angeles",
  "zipCode": "90001",
  "dob": "1995-04-12",
  "gender": "male",
  "companyName": "",
  "industryType": "",
  "ngoType": "",
  "tagline": "",
  "registrationNumber": "",
  "establishedDate": "",
  "interests": ["community", "health"],
  "causes": ["education"],
  "socialLinks": {
    "facebook": "",
    "instagram": "",
    "twitter": "",
    "linkedin": "",
    "tiktok": ""
  },
  "phone": "+15551234567",
  "safetyMode": false,
  "privateAccount": false
}
```

### `PUT /api/users/avatar`

```json
{ "avatar": "https://cdn.example.com/avatars/me.jpg" }
```

### `PUT /api/users/cover-image`

```json
{ "coverImage": "https://cdn.example.com/covers/me.jpg" }
```

### `GET /api/users/id/:id` · `GET /api/users/u/:username`

Public profile + follow/friend context for the viewer.

### `GET /api/users/search?q=kevin&page=1&perPage=20`

### `GET /api/users/suggestions?page=1&perPage=20`

### `GET /api/users/impact-stats`

### `PUT /api/users/nonprofit-affiliation`

```json
{ "nonprofitId": "64f..." }
```

### `PUT /api/users/change-password`

```json
{ "currentPassword": "old", "newPassword": "NewSecret123!" }
```

`currentPassword` optional for some social-only accounts.

---

## 4. Follows

Prefix: `/api/follows` · 🔐

| Method | Path | Body |
|--------|------|------|
| POST | `/api/follows/:userId` | — |
| DELETE | `/api/follows/:userId` | — |
| GET | `/api/follows/:userId/followers?page=&perPage=` | — |
| GET | `/api/follows/:userId/following?page=&perPage=` | — |
| PUT | `/api/follows/:followId/accept` | — |
| GET | `/api/follows/pending?page=&perPage=` | — |
| GET | `/api/follows/status/:targetUserId` | — |

**Status response:**

```json
{ "success": true, "data": { "isFollowing": true, "status": "accepted" } }
```

`status`: `accepted` | `pending` | `null`  
Private accounts may return pending follow requests.

---

## 5. Friends

Prefix: `/api/friends` · 🔐

| Method | Path |
|--------|------|
| POST | `/api/friends/request/:targetUserId` |
| POST | `/api/friends/accept/:requestId` |
| POST | `/api/friends/decline/:requestId` |
| DELETE | `/api/friends/:targetUserId` |
| GET | `/api/friends/status/:targetUserId` |
| GET | `/api/friends/requests?page=&perPage=` |
| GET | `/api/friends?userId=&page=&perPage=` |

**Status values:** `self` | `none` | `friends` | `pending_sent` | `pending_received` (+ optional `requestId`)

---

## 6. Posts & feed

🔐

### `POST /api/posts`

```json
{
  "content": "Hello GrowLuv! #kindness",
  "media": [
    {
      "url": "https://cdn.example.com/posts/1.jpg",
      "type": "image",
      "thumbnailUrl": "https://cdn.example.com/posts/1-thumb.jpg"
    }
  ],
  "postType": "image",
  "hashtags": ["kindness"],
  "taggedUsers": ["64f..."],
  "taggedCompanies": [],
  "taggedNonprofits": [],
  "clubId": null
}
```

`postType`: `text` | `image` | `video` | `carousel` | `live`  
`media[].type`: `image` | `video`  
`content` max 5000 chars. All fields optional except you should send content and/or media.

### Other post routes

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/posts/:id` | Single post |
| PUT | `/api/posts/:id` | Update `content`, tags |
| DELETE | `/api/posts/:id` | Author or admin |
| GET | `/api/posts/user/:userId?page=&perPage=` | User posts |
| POST | `/api/posts/:id/share` | Increment share |
| GET | `/api/posts/trending-tags` | Hashtags |
| GET | `/api/feed?page=&perPage=&status=active` | Home feed |

---

## 7. Reactions

🔐 · Prefix on posts

### `POST /api/posts/:id/reactions`

```json
{ "type": "like" }
```

`type`: `like` | `love` | `haha` | `wow` | `sad` | `angry` | `prayer`

| Method | Path |
|--------|------|
| DELETE | `/api/posts/:id/reactions` |
| GET | `/api/posts/:id/reactions?page=&perPage=&type=` |
| GET | `/api/posts/:id/reactions/me` |

---

## 8. Comments

🔐

### `POST /api/posts/:id/comments`

```json
{
  "content": "Love this!",
  "parentComment": null,
  "mentions": ["64f..."]
}
```

`content` required, 1–2000 chars. Set `parentComment` for replies.

| Method | Path |
|--------|------|
| PUT | `/api/comments/:id` |
| DELETE | `/api/comments/:id` |
| GET | `/api/posts/:id/comments?page=&perPage=` |
| GET | `/api/comments/:id/replies?page=&perPage=` |

---

## 9. Stories

Prefix: `/api/stories` · 🔐

### `POST /api/stories`

```json
{
  "media": {
    "url": "https://cdn.example.com/stories/1.jpg",
    "type": "image",
    "duration": 5
  },
  "caption": "Good morning"
}
```

`media.type`: `image` | `video` · `caption` max 500

| Method | Path |
|--------|------|
| GET | `/api/stories/feed` |
| GET | `/api/stories/me` |
| POST | `/api/stories/:id/view` |
| GET | `/api/stories/:id/viewers?page=&perPage=` |
| DELETE | `/api/stories/:id` |

---

## 10. Messages & chat

🔐 · Prefixes: `/api/conversations`, `/api/messages`, `/api/calls`, `/api/chat`

**Preferred send path:** REST `POST .../messages` (server also fans out `message:new` over WS).  
Use WS `message:send` mainly for offline/outbox retry. Always send a unique `clientMessageId` (UUID) for idempotent reconcile.

Upload chat media first via [Upload](#19-upload) with `folder: "messages"` (or `"chat_media"`), then pass `cdnUrl` in `media` / `attachments`.

---

### Conversations

### `GET /api/conversations` 🔐

| Query | Notes |
|-------|-------|
| `page`, `perPage` | Default `1` / `20` |
| `archived` | `true` \| `false` |
| `q` | Search by group name |

**Response `data`:** conversation array. Each item includes `unreadCount`, `pinned`, `muted`, `archived`, `type` (`direct` \| `group`), `participants`, `lastMessage`, `lastMessageAt`, `memberMeta`.

### `POST /api/conversations` 🔐

Create or return existing DM:

```json
{ "participantId": "64f..." }
```

### `POST /api/conversations/group` 🔐

```json
{
  "name": "Weekend volunteers",
  "memberIds": ["64f...", "64a..."],
  "avatar": "https://cdn.example.com/messages/.../group.jpg",
  "description": "Optional"
}
```

### `POST /api/conversations/join/:inviteCode` 🔐

Join group via invite code (no body).

### `GET /api/conversations/:id` 🔐

Single conversation (populated).

### `PUT /api/conversations/:id` 🔐

Update group fields (admins):

```json
{
  "name": "New name",
  "avatar": "https://cdn.example.com/...",
  "description": "Updated",
  "onlyAdminsCanSend": false
}
```

### `PUT /api/conversations/:id/preferences` 🔐

```json
{
  "muted": true,
  "mutedUntil": "2026-08-20T00:00:00.000Z",
  "archived": false,
  "pinned": true
}
```

`mutedUntil` may be `null` to clear.

### `PUT /api/conversations/:id/read-all` 🔐

Marks all unread messages in the conversation as read for the current user.

### `DELETE /api/conversations/:id/messages` 🔐

Clear chat for me (`deletedUpToMessageId` cursor) — does not delete for others.

### Group members

| Method | Path | Body |
|--------|------|------|
| PUT | `/api/conversations/:id/members` | `{ "memberIds": ["64f..."] }` |
| DELETE | `/api/conversations/:id/members/:memberId` | — |
| PUT | `/api/conversations/:id/members/:memberId/role` | `{ "role": "admin" }` or `"member"` |
| PUT | `/api/conversations/:id/transfer` | `{ "newOwnerId": "64f..." }` |

---

### Messages

### `GET /api/conversations/:id/messages` 🔐

| Query | Notes |
|-------|-------|
| `page`, `perPage` | Default `1` / `50` |
| `cursor` | Optional message `_id` for cursor pagination |

**Response:** paginated `data` (oldest→newest in page) + optional `nextCursor`.

### `POST /api/conversations/:id/messages` 🔐

Send **content and/or media/attachments/location/contact** (at least one meaningful field):

```json
{
  "clientMessageId": "550e8400-e29b-41d4-a716-446655440000",
  "content": "Hey! https://growluv.com",
  "replyTo": "64f...optionalMessageId",
  "mentions": ["64f..."],
  "media": {
    "url": "https://cdn.example.com/messages/USER_ID/1.jpg",
    "type": "image",
    "mimeType": "image/jpeg",
    "fileName": "1.jpg",
    "size": 120034
  }
}
```

**Multi-attachment:**

```json
{
  "clientMessageId": "...",
  "attachments": [
    { "url": "https://cdn.../a.jpg", "type": "image" },
    { "url": "https://cdn.../note.webm", "type": "voice", "duration": 12 }
  ]
}
```

**Location / contact / emoji / forward:**

```json
{
  "clientMessageId": "...",
  "location": { "latitude": 34.05, "longitude": -118.24, "label": "City Park" }
}
```

```json
{
  "clientMessageId": "...",
  "contact": { "name": "Alex", "phone": "+15551234567", "userId": "64f..." }
}
```

```json
{
  "clientMessageId": "...",
  "media": { "url": "🔥", "type": "emoji" }
}
```

```json
{
  "clientMessageId": "...",
  "forwardedFrom": "64f...originalMessageId",
  "content": "Optional caption"
}
```

`media.type` / attachment `type`:  
`image` | `video` | `audio` | `voice` | `document` | `gif` | `emoji`

Optional `linkPreview` / `encryption` objects are accepted (E2EE flag is currently **off** — see `/api/chat/features`).

### Message actions

| Method | Path | Body / query |
|--------|------|----------------|
| PUT | `/api/messages/:id` | `{ "content": "edited text" }` |
| DELETE | `/api/messages/:id?mode=me` | `mode=me` \| `everyone` |
| PUT | `/api/messages/:id/read` | — |
| POST | `/api/messages/:id/react` | `{ "emoji": "❤️" }` |
| POST | `/api/messages/:id/star` | toggle star |
| GET | `/api/messages/starred?conversationId=` | optional filter |
| GET | `/api/conversations/:id/search?q=hello` | in-chat search |
| GET | `/api/conversations/:id/media?type=image` | media gallery (`image`/`video`/`document`/…) |

---

### Calls (100ms tokens)

| Method | Path | Body |
|--------|------|------|
| POST | `/api/conversations/:id/calls` | `{ "type": "audio" }` or `"video"`, optional `roomId` |
| GET | `/api/conversations/:id/calls` | call history for conversation |
| GET | `/api/calls` | your recent calls |
| PUT | `/api/calls/:id` | `{ "status": "ongoing" \| "ended" \| "missed" \| "rejected" \| "busy" }` |
| GET | `/api/calls/:id/token` | `{ "token", "roomId", "call" }` for 100ms join |

---

### Blocks

| Method | Path | Body |
|--------|------|------|
| GET | `/api/chat/blocks` | — |
| POST | `/api/chat/blocks` | `{ "userId": "64f..." }` |
| DELETE | `/api/chat/blocks/:userId` | — |

---

### Chat extras (`/api/chat`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/chat/features` | Feature flags + E2EE checklist |
| GET | `/api/chat/metrics` | Internal counters |
| GET | `/api/chat/link-preview?url=https://...` | Open-graph style preview |
| POST | `/api/chat/e2ee/keys` | Upload device prekeys (**503** while E2EE off) |
| GET | `/api/chat/e2ee/keys/:userId?deviceId=` | Fetch prekey bundle (**503** while E2EE off) |

Example features response shape:

```json
{
  "success": true,
  "data": {
    "realtimeUnifiedSend": true,
    "groupsEnabled": true,
    "richMediaEnabled": true,
    "callsEnabled": true,
    "offlineOutboxEnabled": true,
    "pushForMessagesEnabled": true,
    "e2eeEnabled": false,
    "disappearingMessagesEnabled": true
  }
}
```

Realtime also via [WebSocket](#18-websocket).

---

## 11. Notifications

Prefix: `/api/notifications` · 🔐

| Method | Path | Body |
|--------|------|------|
| GET | `/api/notifications?page=&perPage=&type=&read=` | — |
| GET | `/api/notifications/unread-count` | → `{ "data": { "count": 3 } }` |
| PUT | `/api/notifications/:id/read` | — |
| PUT | `/api/notifications/read-all` | — |
| DELETE | `/api/notifications/:id` | — |
| PUT | `/api/notifications/fcm-token` | `{ "token": "fcm-device-token" }` |
| DELETE | `/api/notifications/fcm-token` | `{ "token": "fcm-device-token" }` |

**List response:** `{ "data": [ ... ], "pagination": { ... } }`

Common `type` values include: `follow`, `friend_request`, `like` / reaction, `comment`, `message`, `live_started`, etc.

For `type: "message"`, deep-link using `data.conversationId` → `/chats?conversation=...`.

Realtime: WS events `notification:new` and `notification:unread_count` (see [WebSocket](#18-websocket)).

---

## 12. Search

### `GET /api/search` 🟡

| Query | Notes |
|-------|-------|
| `q` | Search text |
| `type` | `users` \| `clubs` \| `contests` \| `events` (omit = all) |
| `city` | |
| `zipCode` | |
| `category` | |
| `page` | default 1 |
| `perPage` | default 10, max 50 |

```json
{
  "success": true,
  "data": {
    "users": { "items": [], "total": 0 },
    "clubs": { "items": [], "total": 0 },
    "contests": { "items": [], "total": 0 },
    "events": { "items": [], "total": 0 }
  }
}
```

---

## 13. Events

Prefix: `/api/events` · 🔐

### `POST /api/events`

**Required:** `title`, `startDate`, `endDate`

```json
{
  "title": "Community Cleanup",
  "description": "Join us downtown",
  "startDate": "2026-09-01T16:00:00.000Z",
  "endDate": "2026-09-01T19:00:00.000Z",
  "type": "physical",
  "location": "City Park",
  "city": "Los Angeles",
  "zipCode": "90012",
  "zoomUrl": "",
  "ticketType": "free",
  "price": 0,
  "rsvpTiers": [{ "name": "General", "price": 0, "capacity": 100 }],
  "coverImage": "https://cdn.example.com/events/cover.jpg",
  "media": [],
  "category": "community",
  "isVolunteer": true,
  "status": "upcoming"
}
```

`type`: `physical` | `virtual` | `hybrid`  
`ticketType`: `free` | `paid`

### `POST /api/events/:id/rsvp`

```json
{
  "status": "going",
  "tier": "General",
  "volunteerDetails": {
    "skills": ["first-aid"],
    "availability": ["weekend"],
    "emergencyContactName": "Alex",
    "emergencyContactPhone": "+15559876543",
    "notes": ""
  }
}
```

`status`: `interested` | `going`

### Other

| Method | Path |
|--------|------|
| GET | `/api/events?page=&perPage=&status=&type=&category=&city=&zipCode=&isVolunteer=&ticketType=&q=` |
| GET | `/api/events/nearby?lat=&lng=&radius=` (`lat`/`lng` required; `radius` km default 50) |
| GET | `/api/events/:id` |
| POST | `/api/events/:id/checkout` body `{ "tier": "General" }` → Stripe URL |
| DELETE | `/api/events/:id/rsvp` |
| GET | `/api/events/:id/attendees?page=&perPage=&status=` |

---

## 14. Clubs

Prefix: `/api/clubs` · 🔐

### `POST /api/clubs`

```json
{
  "name": "Kindness Club",
  "description": "Daily acts of love",
  "type": "public",
  "category": "community",
  "avatar": "https://cdn.example.com/clubs/a.jpg",
  "coverImage": "https://cdn.example.com/clubs/c.jpg",
  "isMembership": false,
  "membershipPrice": 0
}
```

`type`: `public` | `private`

| Method | Path | Body |
|--------|------|------|
| GET | `/api/clubs?page=&perPage=&type=&category=&q=` | — |
| GET | `/api/clubs/:id` | — |
| PUT | `/api/clubs/:id` | same fields optional |
| DELETE | `/api/clubs/:id` | — |
| POST | `/api/clubs/:id/join` | — |
| DELETE | `/api/clubs/:id/leave` | — |
| GET | `/api/clubs/:id/members?page=&perPage=` | — |
| PUT | `/api/clubs/:id/members/:memberId/role` | `{ "role": "moderator" }` |
| GET | `/api/clubs/:id/feed?page=&perPage=` | — |

`role`: `admin` | `moderator` | `member`

---

## 15. Contests

Prefix: `/api/contests` · 🔐

| Method | Path | Body |
|--------|------|------|
| GET | `/api/contests?page=&perPage=&status=&category=&q=` | — |
| GET | `/api/contests/:id` | — |
| POST | `/api/contests/:id/entries` | see below |
| GET | `/api/contests/:id/entries?page=&perPage=&sort=` | — |
| POST | `/api/contests/:id/entries/:entryId/vote` | — |
| DELETE | `/api/contests/:id/entries/:entryId/vote` | — |
| GET | `/api/contests/:id/leaderboard` | — |

### Submit entry

```json
{
  "videoUrl": "https://cdn.example.com/contests/entry.mp4",
  "thumbnailUrl": "https://cdn.example.com/contests/thumb.jpg",
  "title": "My act of kindness",
  "description": "Helped a neighbor"
}
```

`videoUrl` required.

---

## 16. Classes

Prefix: `/api/classes` · 🔐

### `POST /api/classes`

**Required:** `title`

```json
{
  "title": "Intro to Mindfulness",
  "description": "30-minute intro",
  "meetLink": "https://zoom.us/j/...",
  "whatYouWillLearn": ["Breathing", "Focus"],
  "tags": ["wellness"],
  "coverImage": "https://cdn.example.com/classes/c.jpg",
  "capacity": 50,
  "category": "64f...",
  "type": "public",
  "mode": "online",
  "location": "",
  "startDate": "2026-09-10",
  "startTime": "18:00",
  "endTime": "18:30",
  "language": "en"
}
```

`type`: `public` | `private` · `mode`: `online` | `in-person`

| Method | Path | Body |
|--------|------|------|
| GET | `/api/classes?page=&perPage=&q=&hostId=&enrolledUserId=&categoryId=` | — |
| GET | `/api/classes/:id` | — |
| POST | `/api/classes/enroll` | `{ "codeOrId": "ABC123" }` |
| POST | `/api/classes/:id/enroll` | — |
| POST | `/api/classes/:id/leave` | — |
| POST | `/api/classes/:id/interested` | — → `{ "isInterested": true }` |

---

## 17. Livestream (100ms)

Prefix: `/api/livestream` · 🔐 (except webhook)

### Architecture (read this)

| Concern | Where it lives |
|---------|----------------|
| Create / end room, join tokens, active list, viewer sessions | **GrowLuv backend** |
| A/V, in-room peer list, **chat**, **reactions** | **100ms SDK only** — do **not** POST chat/reactions to REST |

**Roles (must match 100ms template):**

| Role | Env default | Who |
|------|-------------|-----|
| Host | `broadcaster` | Go-live host |
| Viewer | `viewer-realtime` | Join as viewer |

Deep Flutter guide: [`docs/FLUTTER_LIVESTREAM_100MS.md`](docs/FLUTTER_LIVESTREAM_100MS.md)

---

### Host: go live

### `POST /api/livestream/go-live` 🔐

```json
{
  "title": "Evening community check-in",
  "description": "Optional description",
  "categoryId": "64f..."
}
```

`title` required. If the host already has a live room, backend ends it first.

**Response `data`:**

```json
{
  "livestream": {
    "_id": "...",
    "host": "...",
    "title": "Evening community check-in",
    "hmsRoomId": "room-id-from-100ms",
    "status": "live",
    "hlsUrl": "",
    "currentViewerCount": 0,
    "startedAt": "2026-08-07T..."
  },
  "token": "eyJ...100ms-auth-token...",
  "roomId": "room-id-from-100ms",
  "hlsUrl": "",
  "host": { "_id": "...", "name": "...", "username": "...", "avatar": "..." },
  "role": "broadcaster"
}
```

**Flutter next step:** join 100ms with `token` as role `broadcaster`.

---

### Host: end live

### `POST /api/livestream/end` 🔐

```json
{ "roomId": "room-id-from-100ms" }
```

Also ends the 100ms room and pushes WS `live_ended` to active viewer sessions.

---

### Viewer: join / heartbeat / leave

Generate a **stable client `sessionId`** (16–128 chars) for the viewing session (UUID is fine). Reuse it for heartbeat + leave.

### `POST /api/livestream/join/:roomId` 🔐

```json
{ "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }
```

**Response `data`:**

```json
{
  "livestream": { "...": "...", "hostRole": "broadcaster" },
  "token": "eyJ...viewer-token...",
  "role": "viewer-realtime",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### `POST /api/livestream/heartbeat/:roomId` 🔐

Call about every **30s** while watching.

```json
{ "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }
```

```json
{ "success": true, "data": { "success": true } }
```

Stale sessions (~2 min without heartbeat) are cleared by cron → viewer count drops.

### `POST /api/livestream/leave/:roomId` 🔐

```json
{ "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }
```

---

### Feed & info

### `GET /api/livestream/active?page=1&limit=20` 🔐

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "...",
      "hmsRoomId": "...",
      "status": "live",
      "currentViewerCount": 3,
      "host": { "name": "...", "username": "...", "avatar": "..." },
      "startedAt": "..."
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

### `GET /api/livestream/info/:roomId` 🔐

Live stream by HMS room id (+ `hostRole`, `peerCount`).

### `GET /api/livestream/:id` 🔐

By MongoDB `_id`.

---

### Co-host

### `POST /api/livestream/cohost/request` 🔐

```json
{ "roomId": "..." }
```

Host receives WS `cohost_request`.

### `POST /api/livestream/cohost/respond` 🔐 (host)

```json
{
  "roomId": "...",
  "targetUserId": "64f...",
  "accept": true
}
```

If accepted, `data.token` is a broadcaster-capable join token for the target (also WS `cohost_response`).

---

### On-demand token

### `POST /api/livestream/token` 🔐

```json
{ "roomId": "...", "role": "viewer-realtime" }
```

```json
{ "success": true, "data": { "token": "eyJ..." } }
```

---

### Webhook (server / 100ms only — not for Flutter)

### `POST /api/livestream/webhook` 🔓 + secret header

Header: `x-100ms-webhook-secret` (or `HM_WEBHOOK_HEADER`).  
Handles HLS started / session close. Do not call from the app.

---

### Recommended Flutter flows

**Host**

1. `POST /go-live` → save `roomId` + `token`
2. Join 100ms as `broadcaster`
3. Chat / reactions via 100ms messages
4. `POST /end` with `roomId` → leave 100ms

**Viewer**

1. `GET /active` → pick `hmsRoomId`
2. Create `sessionId` → `POST /join/:roomId`
3. Join 100ms with returned `token` as `viewer-realtime`
4. Heartbeat every 30s
5. Listen for stream end: 100ms `ROOM_ENDED` / system message `{ "event": "live_ended" }` / WS `live_ended`
6. `POST /leave/:roomId` + leave 100ms

**100ms chat message:** plain text broadcast.  
**100ms reaction message type:** `reaction` with key `heart` | `laugh` | `smile` | `thumbs_up`.

---

## 18. WebSocket

```
ws://{HOST}/ws/connect?token={accessToken}&deviceId={stableDeviceId}
```

Alias: `/api/ws/connect` (same query params).

Envelope shape (client ↔ server):

```json
{
  "v": 1,
  "type": "message:send",
  "requestId": "req_uuid",
  "clientMessageId": "optional-uuid",
  "conversationId": "64f...",
  "data": {}
}
```

Server replies with `ack`, `error`, or event types below. Keepalive: send `{ "v": 1, "type": "ping", "requestId": "..." }` → `pong`.

### Client → server commands

| `type` | `data` (typical) |
|--------|------------------|
| `ping` | — |
| `user:presence` | `{ "conversationId": "64f..." }` or `null` to clear active chat |
| `user:check_online` | `{ "userIds": ["64f..."] }` |
| `message:send` | same fields as REST send (+ `conversationId`) |
| `message:edit` | `{ "messageId", "content" }` |
| `message:delete` | `{ "messageId", "mode": "me" \| "everyone" }` |
| `message:react` | `{ "messageId", "emoji" }` |
| `message:star` | `{ "messageId" }` |
| `message:typing` | `{ "conversationId", "isTyping": true }` |
| `message:delivered` | `{ "messageIds": ["64f..."] }` |
| `message:read` | `{ "conversationId" }` |
| `conversation:sync` | `{ "conversationId", "since": "ISO-or-id" }` |
| `call:invite` | `{ "conversationId", "callType": "audio" \| "video" }` |
| `call:accept` / `call:reject` / `call:end` | `{ "callId" }` |

### Server → client events

| `type` | When |
|--------|------|
| `connected` | Auth OK — includes `userId`, `presenceMode` (`memory` \| `redis`) |
| `pong` | Heartbeat reply |
| `ack` | Command success (`requestId` echo; send ack may include `clientMessageId`) |
| `error` | `{ "error": { "code", "message" } }` |
| `message:new` | New/confirmed message (prefer REST send; still subscribe for others) |
| `message:updated` / `message:reaction` | Edit / reaction |
| `message:deleted` | `{ "messageId", "mode", "conversationId" }` |
| `message:typing` | `{ "conversationId", "userId", "isTyping" }` |
| `message:delivered` | Delivery receipt to sender |
| `message:read_receipt` | Read receipt |
| `conversation:created` / `conversation:updated` | Inbox refresh |
| `user:online_status` | `{ "statuses": { "userId": true }, "lastSeen": { ... } }` |
| `sync:snapshot` | Reply to `conversation:sync` |
| `call:ringing` / `call:accepted` / `call:rejected` / `call:ended` / `call:missed` | Call lifecycle |
| `notification:new` | New in-app notification |
| `notification:unread_count` | `{ "count": 3 }` |
| `live_started` / `live_ended` | Livestream (followers / viewers) |
| `cohost_request` / `cohost_response` | Livestream co-host |

**Mobile tips**

1. On open conversation: `user:presence` + `message:read` + `user:check_online` for DM partner.
2. On receive `message:new` not from self: send `message:delivered` with that `_id`.
3. Prefer REST for sending; queue WS `message:send` only when offline (`offlineOutboxEnabled`).
4. Redis is **optional** — without `REDIS_URL`, presence is in-memory single-instance (`presenceMode: "memory"`).

---

## 19. Upload

Prefix: `/api/upload` · 🔐 · **No multipart**

### `POST /api/upload/presigned-url`

```json
{
  "filename": "photo.jpg",
  "contentType": "image/jpeg",
  "folder": "messages"
}
```

**Response `data`:**

```json
{
  "uploadUrl": "https://s3.../presigned...",
  "cdnUrl": "https://cdn.example.com/messages/USER_ID/photo.jpg",
  "key": "messages/...."
}
```

**Then:** `PUT uploadUrl` with body = file bytes and header `Content-Type: image/jpeg`.  
**Then:** pass `cdnUrl` into posts / avatar / stories / chat `media.url` / etc.

### Allowed `folder`

`avatars`, `covers`, `posts`, `post_media`, `messages`, `chat_media`, `contests`, `contest_entries`, `events`, `event_banners`, `clubs`, `club_covers`, `classes`, `class_covers`, `stories`, `story_media`, `pages`, `ads`, `sponsors`, `testimonials`, `inspirations`, `categories`

Admin-only folders: `ads`, `pages`, `sponsors`, `testimonials`, `inspirations`, `categories`

### Allowed `contentType`

`image/jpeg`, `image/png`, `image/webp`, `image/gif`,  
`video/mp4`, `video/quicktime`, `video/webm`,  
`audio/mpeg`, `audio/mp4`, `audio/webm`, `audio/ogg`, `audio/wav`,  
`application/pdf`, `application/msword`,  
`application/vnd.openxmlformats-officedocument.wordprocessingml.document`,  
`application/vnd.ms-excel`,  
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,  
`text/plain`

### `DELETE /api/upload/file`

```json
{ "key": "posts/...." }
```

---

## 20. Ads & boosts

### Ads 🟡 `/api/ads`

| Method | Path |
|--------|------|
| GET | `/api/ads/feed?limit=3` |
| GET | `/api/ads/preroll` |
| POST | `/api/ads/:id/impression` |
| POST | `/api/ads/:id/click` |

### Boosts

### `GET /api/boosts/tiers` 🔓

### `POST /api/boosts/:postId/checkout` 🔐

```json
{ "tierId": "64f..." }
```

```json
{ "success": true, "data": { "checkoutUrl": "https://checkout.stripe.com/...", "sessionId": "cs_..." } }
```

---

## 21. Sponsorship

### `GET /api/sponsors/tiers` 🔓

### `POST /api/sponsors` 🔐

```json
{
  "name": "Acme Corp",
  "contactEmail": "partner@acme.com",
  "tier": "community",
  "logo": "https://cdn.example.com/sponsors/logo.png",
  "description": "Community sponsor",
  "contactPhone": "+15550001111",
  "website": "https://acme.com"
}
```

`tier`: `visionary` | `courageous` | `compassionate` | `connection` | `community` | `inkind`

### `POST /api/sponsors/checkout` 🔐

```json
{ "tierId": "64f..." }
```

### `GET /api/sponsors?page=&perPage=&tier=` 🔐 · `GET /api/sponsors/:id` 🔐

---

## 22. Donations

Prefix: `/api/donations` · 🔐

### One-time

```json
{ "nonprofitId": "64f...", "amount": 25 }
```

### Recurring

```json
{ "nonprofitId": "64f...", "amount": 10, "interval": "month" }
```

`interval`: `month` | `year` (default `month`)

Both return `{ checkoutUrl, sessionId }`.

| Method | Path |
|--------|------|
| GET | `/api/donations/history?page=&perPage=` |
| GET | `/api/donations/nonprofit/:nonprofitId?page=&perPage=` |
| GET | `/api/donations/session/:sessionId` |

Stripe webhook `POST /api/webhooks/stripe` is server-only.

---

## 23. Nonprofits

Prefix: `/api/nonprofits` · 🔐

### `POST /api/nonprofits/register`

```json
{
  "ein": "12-3456789",
  "organizationName": "Hope Foundation",
  "mission": "Support survivors",
  "fundraisingGoal": 100000
}
```

| Method | Path | Body |
|--------|------|------|
| GET | `/api/nonprofits?page=&perPage=&q=` | — |
| GET | `/api/nonprofits/:id` | — |
| PUT | `/api/nonprofits/:id` | org fields / impact metrics |
| POST | `/api/nonprofits/:id/impact` | `{ "title", "content", "media": [] }` |
| GET | `/api/nonprofits/:id/report` | — |

---

## 24. Reports / scams / support

### Reports 🔐 · `POST /api/reports`

```json
{
  "targetType": "post",
  "targetId": "64f...",
  "reason": "Harassment",
  "details": "Optional details"
}
```

`targetType`: `post` | `user` | `comment`

### Scams 🔐

```http
POST /api/scams
{ "description": "Someone asked me to wire money..." }

GET /api/scams?page=&perPage=
```

### Support tickets 🔐 · `/api/support-tickets`

```json
{
  "subject": "Cannot upload video",
  "message": "Steps to reproduce...",
  "email": "kevin@example.com",
  "attachments": ["https://cdn.example.com/bugs/1.png"]
}
```

`subject` + `message` required.

| Method | Path |
|--------|------|
| GET | `/api/support-tickets?page=&perPage=` |
| GET | `/api/support-tickets/:id` |

---

## 25. Assessments & testimonials

### Assessments 🔐 · `/api/assessments`

| Method | Path | Body |
|--------|------|------|
| GET | `/api/assessments?page=&perPage=` | — |
| GET | `/api/assessments/:id` | — |
| POST | `/api/assessments/:id/submit` | `{ "answers": { "fieldName": "value" } }` |

### Testimonials

### `GET /api/testimonials?page=&perPage=` 🔓

### `POST /api/testimonials` 🔐

```json
{
  "type": "text",
  "content": "GrowLuv changed my community.",
  "mediaUrl": ""
}
```

`type`: `text` | `video` | `text_picture`

---

## 26. CMS / config

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/faqs` | 🔓 | FAQ list |
| GET | `/api/config/options` | 🔓 | `{ ngoTypes, industryTypes }` |
| GET | `/api/categories` | 🔓 | Active categories |
| GET | `/api/intro-slides` | 🔓 | Onboarding slides |
| GET | `/api/type-options?type=industry` | 🔓 | `type` = `industry` \| `ngo` |
| GET | `/api/pages?type=` | 🟡 | Published pages |
| GET | `/api/pages/:slug` | 🟡 | Page by slug |
| GET | `/api/inspiration/today` | 🟡 | Daily inspiration |
| GET | `/api/inspiration?page=&perPage=` | 🟡 | Archive |

---

## Safety note for Flutter UI

Safety & Crisis **content** (hotlines, Survivor Escape Resource, GrowLuv cards) lives in the **app UI**, not as REST resources.  
Profile flags related to privacy: `safetyMode`, `privateAccount` on `PUT /api/users/profile`.

---

## Changelog (Flutter-relevant)

| Area | Change |
|------|--------|
| Livestream | 100ms-only chat/reactions; REST for room lifecycle + viewer sessions |
| Livestream | `join` / `leave` / `heartbeat` require `sessionId` (16–128) |
| Livestream | No REST `/viewers`, `/comments`, `/reactions` for live |
| Livestream | Host `end` notifies viewers via WS `live_ended` |
| Livestream | Roles: `broadcaster` + `viewer-realtime` |
| Upload | Still presigned S3 only (no multipart) |

---

*Generated for Flutter from `growluv_backend` route/controllers. Prefer this file + `/swagger` over older auto-dumped payloads.*
