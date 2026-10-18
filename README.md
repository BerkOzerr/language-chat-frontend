# Language Chat Frontend

React + TypeScript strict + Vite frontend for [language-chat-api-v2](https://github.com/BerkOzerr/language-chat-api-v2).

## Requirements

- Node.js 20.19+ (or a supported newer LTS release)
- npm
- A running instance of the backend API

## Local development

```bash
cp .env.example .env.local
# Edit VITE_API_BASE_URL to point at your backend.
npm install
npm run dev
```

On Windows PowerShell, copy the environment template with:

```powershell
Copy-Item .env.example .env.local
```

## Quality checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

## Backend configuration

Set `VITE_API_BASE_URL` to the backend origin, e.g. `http://localhost:3000`. The backend's `CLIENT_ORIGIN` must contain the exact frontend origin. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for verified routes, WebSocket protocol, security notes and deployment.

## Current scope

- Guest session, registration and login
- Room list and room creation
- Join/leave rooms
- Initial message history plus live WebSocket messages
- Profile language/level updates
- Responsive layout and error/loading states

No Redux Toolkit is included. The architecture uses TanStack Query for remote data, React context for authentication, and local React state for component-level state.


## E-posta doğrulama ve hesap kurtarma

Frontend şu sayfaları içerir ve backend v3 kimlik doğrulama uçlarına bağlanır:

- `/verify-email?token=...`: kullanıcı e-postadaki bağlantıyı açtıktan sonra açık bir butona basarak doğrulamayı başlatır. Böylece e-posta güvenlik tarayıcılarının bağlantıyı otomatik açması tek başına token tüketmez. Token, sayfa belleğine alındıktan sonra adres çubuğundan kaldırılır.
- `/forgot-password`: e-posta ile sıfırlama bağlantısı ister. Arayüz, e-postanın kayıtlı olup olmadığını açıklamaz; backend'in genel yanıtını gösterir.
- `/reset-password?token=...`: tek kullanımlık bağlantı üzerinden yeni şifre belirler; şifre en az 12 karakter olmalıdır.
- Kayıtlı ancak doğrulanmamış kullanıcılar, oturum açınca oda ekranında doğrulama uyarısı ve e-postayı yeniden gönderme düğmesi görür.

**Dağıtım notu:** Backend'de `APP_URL`, frontend'in herkese açık HTTPS adresine ayarlanmalı ve SMTP ayarları yapılmalıdır. E-posta bağlantılarının `/verify-email` ve `/reset-password` yolları SPA uygulamasına yönlenmelidir (hosting sağlayıcısında SPA fallback/rewrite). Canlı ortam API adresi `VITE_API_BASE_URL` ile ayarlanmalıdır. Bu frontend tek başına e-posta göndermez; gönderim backend/SMTP tarafından yapılır.
