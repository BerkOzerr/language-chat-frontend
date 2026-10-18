# Frontend Architecture

## Purpose and verified backend contract

This repository is a standalone React client for `language-chat-api-v2`. The backend repository was inspected at `https://github.com/BerkOzerr/language-chat-api-v2`; frontend code does not modify backend files.

Verified REST routes from `src/routes/auth.js`, `src/routes/users.js`, and `src/routes/rooms.js`:

| Method | Path | Auth | Frontend use |
|---|---|---|---|
| POST | `/auth/guest` | No | Create a guest session |
| POST | `/auth/register` | No | Create a registered account |
| POST | `/auth/login` | No | Sign in |
| POST | `/auth/convert-guest` | Bearer | Convert guest to registered account |
| GET | `/auth/me` | Bearer | Read current auth user |
| POST | `/auth/logout` | Bearer | Revoke current session |
| GET | `/users/me` | Bearer | Read profile |
| PATCH | `/users/me` | Bearer | Update allowed profile fields |
| GET | `/rooms` | Bearer | List active rooms |
| POST | `/rooms` | Usually registered; backend config can allow guests | Create room |
| POST | `/rooms/:roomId/join` | Bearer | Join room |
| POST | `/rooms/:roomId/leave` | Bearer | Leave room |
| GET | `/rooms/:roomId/messages?limit=&cursor=` | Bearer | Fetch paginated messages |
| POST | `/rooms/:roomId/messages` | Bearer | Send a message over REST; backend broadcasts it |

The room endpoints return wrapped shapes such as `{ rooms, count }`, `{ room }`, and `{ user }`. Auth creation/login return `{ user, session, token, tokenType: "Bearer" }`. Guest conversion returns `{ user, message }` and does not promise a new token. The client therefore keeps the existing guest token after conversion and refreshes the current user.

Validation mirrored from backend:
- Account username/email/password required; password length 12–128.
- Profile language codes: `tr`, `en`, `de`, `fr`, `es`, `it`, `pt`, `ru`, `ja`, `ko`, `zh`, `ar`.
- CEFR levels: `A1` through `C2`.
- Room name 3–80 chars; description up to 500 chars; `max_members` 2–10 (default 10).
- Message content trimmed, 1–2000 chars.
- Room IDs are UUIDs.

WebSocket contract verified in `src/routes/webSocket.js`:
1. Connect to `/ws`.
2. First frame must be `{ "token": "<64-hex-character bearer token>" }`.
3. Wait for `{ "type": "authenticated", "user": { "id", "username" } }`.
4. Subscribe with `{ "type": "join_room", "roomId": "<UUID>" }`.
5. Send with `{ "type": "send_message", "roomId": "<UUID>", "content": "..." }`.
6. Handle `room_joined`, `new_message` (contains `message`), and `error` events. A socket can only subscribe/send for rooms where the user is an active member.
7. The server enforces 4 KB frames, 2,000 character messages, rate limits, origin restrictions and auth timeout.

`GET /rooms/:roomId/messages` is used for initial history; WebSocket events are used for live delivery. The full room route should be rechecked whenever the backend changes. This client deliberately does not invent typing indicators, read receipts, direct messages, search, or delete/edit-message endpoints.

## Technology choices

- **React + TypeScript strict + Vite**: component model, static type checking, fast development and optimized static build. Vite transpilation alone is not type checking; `npm run build` includes `tsc -b`.
- **Tailwind CSS**: consistent utility styling and responsive layouts.
- **React Router**: URL-based navigation and guarded app pages.
- **TanStack Query**: remote API cache, invalidation and mutation lifecycle.
- **React Hook Form + Zod**: typed forms and client-side feedback; server validation remains authoritative.
- **Vitest + React Testing Library**: fast unit/component tests.
- **Playwright**: browser-level smoke test.
- **ESLint + Prettier**: static rules and formatting.
- **Redux Toolkit is not installed**: current app state is adequately handled by the auth provider, TanStack Query and local React state. Reconsider only if complex cross-feature client-only workflows appear.

## Feature-based structure

```text
src/
  app/              router, providers, auth guard
  components/ui/    shared primitives and application shell
  features/
    auth/            login, register, guest, conversion
    rooms/           room listing, create, membership actions
    chat/            history, composer, WebSocket integration
    profile/         profile editing
  lib/
    api/              typed fetch client and normalized errors
    websocket/        connection lifecycle and protocol types
  test/               test setup and component tests
docs/
  ARCHITECTURE.md
```

Features may depend on `lib` and shared UI, but shared UI must not import feature modules. API and WebSocket protocol types live centrally.

## Authentication and security

The backend uses bearer tokens returned in JSON. This starter stores the session in `sessionStorage` to limit persistence to a browser tab/session and attaches tokens through one API client. This is still accessible to JavaScript and is not an HttpOnly-cookie design; protect against XSS and do not log tokens. A production security review should evaluate the backend's session lifecycle and possible cookie-based alternatives before changing the API contract. Never put secrets in `VITE_*` variables.

Logout calls the backend before clearing client state. A 401 clears the stale local session and sends the user to sign in. The WebSocket token is sent as the first application frame, not as a URL query parameter.

## Environment and deployment

Set `VITE_API_BASE_URL` to the backend origin and configure backend `CLIENT_ORIGIN` to the deployed frontend origin. Set `VITE_WS_URL` only when a nonstandard WebSocket endpoint is needed. Frontend environment variables are public build-time values, never secrets. Deploy the generated `dist/` directory to any static host with SPA fallback enabled. Configure HTTPS so the WebSocket uses `wss://`. The backend and frontend deploy independently.

## Known caveats / next verification

- No live production endpoint or database credentials were provided; end-to-end API behavior cannot be confirmed from this starter archive.
- Backend CORS `CLIENT_ORIGIN` must include the exact deployed origin.
- Validate message history cursor semantics against the latest `rooms.js` implementation before extending pagination UX.
- Run the backend's `test/test-api.mjs`, `test/test-ws.mjs`, and this frontend's test suite against a local/staging backend before production.
- The GitHub repository must be created by its owner before this project can be pushed; the archive contains the complete initial project files.
