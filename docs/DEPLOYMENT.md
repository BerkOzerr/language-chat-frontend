# Deployment checklist

1. Create a separate GitHub repository named `language-chat-frontend` and push this project.
2. Configure `VITE_API_BASE_URL` in the static host's build environment.
3. Configure backend `CLIENT_ORIGIN` to the exact frontend origin (scheme + hostname + optional port).
4. Build command: `npm ci && npm run build` (use `npm install` until a lockfile has been generated locally).
5. Publish directory: `dist`.
6. Configure SPA fallback so routes such as `/rooms/<uuid>` serve `index.html`.
7. Use HTTPS in production; the app derives `wss://` from an `https://` API URL.
8. Validate login, guest flow, room join/leave, history and WebSocket messages against staging before production.
9. Do not commit `.env.local`, access tokens, database credentials or any secret. `VITE_*` values are public.
