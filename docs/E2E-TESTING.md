# Gerçek backend ile E2E testleri

Bu testler mock API kullanmaz; gerçek backend ve veritabanıyla tarayıcı akışlarını doğrular. Kullanıcı ve oda kayıtları oluştururlar. Yalnızca geliştirme/test veritabanında çalıştır.

## Ön koşullar

- Node.js 20.19+
- Backend `http://localhost:3000` üzerinde çalışıyor.
- Veritabanı bağlı; `http://localhost:3000/health/db` `200` döndürüyor.
- `npm install` ve `npx playwright install chromium` çalıştırılmış.

## Çalıştırma

1. Backend terminalini açık tut.
2. Frontend klasöründe `.env.local` içindeki `VITE_API_BASE_URL` değerini boş bırak veya kaldır. Geliştirme modunda Vite, `/api/*` isteklerini `localhost:3000` backend'ine proxy eder ve `/api` önekini kaldırır. Bu ayrı önek, frontend'in `/rooms` sayfalarının yanlışlıkla backend'e yönlendirilmesini önler. WebSocket de `/api/ws` üzerinden proxy edilir. Böylece `localhost` ile `127.0.0.1` arasındaki CORS origin uyuşmazlığı azaltılır.
3. Çalıştır:

```bash
npm run test:e2e
```

Playwright Vite'ı otomatik başlatır. Testler tek worker ile sıralı çalışır; backend rate limitlerine çarpma ve testler arası yarış durumu azaltılır.

## Kapsam

- Backend + veritabanı sağlık kontrolü (`/health/db`)
- Kayıt, giriş ve çıkış
- Misafir oturumu
- Oda oluşturma ve ikinci hesapla odaya katılma
- REST mesaj gönderimi ve mesaj geçmişi
- Profil güncelleme

Bir kimlik doğrulama/oda ekranı açılmazsa test, yalnızca 15 saniyelik locator timeout vermek yerine UI'daki gerçek `role=alert` hata metnini raporlar.

## Üretim

WebSocket sunucusu Origin başlığını ayrıca doğrular. Backend `.env` dosyasında `CLIENT_ORIGIN=http://localhost:5173` olduğundan emin ol ve backend'i yeniden başlat. Deploy ortamında Vite proxy bulunmayacağından `VITE_API_BASE_URL` ve gerekiyorsa `VITE_WS_URL` değerlerini gerçek API adresine ayarla; backend `CLIENT_ORIGIN` ayarında dağıtılmış frontend origin'ine izin ver.
