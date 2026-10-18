import { expect, test, type Page } from "@playwright/test";

const apiBaseUrl = (process.env.E2E_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const runId = `${Date.now()}_${Math.floor(Math.random() * 10_000)}`;
const password = "E2eTestPassword_2026!";

async function expectRoomScreen(page: Page, context: string) {
  const heading = page.getByRole("heading", { name: "Sohbet odaları" });
  const alert = page.getByRole("alert").first();
  try {
    await Promise.race([
      heading.waitFor({ state: "visible", timeout: 15_000 }),
      alert.waitFor({ state: "visible", timeout: 15_000 }),
    ]);
  } catch {
    throw new Error(`${context}: oda ekranı açılmadı. URL=${page.url()}. Sayfa başlığı: ${await page.title()}`);
  }
  if (await alert.isVisible().catch(() => false)) {
    const message = (await alert.innerText()).trim();
    throw new Error(`${context}: uygulama hata gösterdi. UI hatası: ${message}. URL=${page.url()}`);
  }
  await expect(heading).toBeVisible();
}

async function assertBackendReady(request: import("@playwright/test").APIRequestContext) {
  let response;
  try {
    response = await request.get(`${apiBaseUrl}/health/db`, { timeout: 5_000 });
  } catch {
    throw new Error(`Backend/DB erişilemiyor: ${apiBaseUrl}/health/db. Backend'i localhost:3000 üzerinde başlat ve veritabanı bağlantısını kontrol et.`);
  }
  if (!response.ok()) {
    throw new Error(`Backend sağlık kontrolü başarısız: HTTP ${response.status()} (${apiBaseUrl}/health/db). Backend loglarını ve veritabanını kontrol et.`);
  }
  const body = await response.json().catch(() => ({}));
  if (body.database && body.database !== "connected") {
    throw new Error(`Backend çalışıyor ancak veritabanı bağlı değil: ${JSON.stringify(body)}`);
  }
}

async function register(page: Page, username: string, email: string) {
  await page.goto("/register");
  await page.getByLabel("Kullanıcı adı").fill(username);
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Şifre").fill(password);
  await page.getByRole("button", { name: /hesap oluştur/i }).click();
  await expectRoomScreen(page, "Kayıt sonrası");
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page.getByRole("heading", { name: /dil pratiği/i })).toBeVisible({ timeout: 10_000 });
}

test("real backend: register, create room, join, chat, profile and login", async ({ browser, request }) => {
  test.setTimeout(120_000);

  await assertBackendReady(request);

  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  const ownerName = `own_${runId.slice(-12)}`;
  const ownerEmail = `${ownerName}@example.com`;
  const roomName = `E2E English Room ${runId}`;
  const ownerMessage = `Owner message ${runId}`;

  const memberContext = await browser.newContext();
  const member = await memberContext.newPage();
  const memberName = `mem_${runId.slice(-12)}`;
  const memberEmail = `${memberName}@example.com`;
  const memberMessage = `Member message ${runId}`;

  try {
    // REGISTER owner and create a real room through the UI/API.
    await register(owner, ownerName, ownerEmail);
    await expect(owner.getByText(ownerName)).toBeVisible();
    await owner.getByRole("button", { name: /oda oluştur/i }).first().click();
    await expect(owner.getByRole("dialog", { name: "Oda oluştur" })).toBeVisible();
    await owner.getByLabel("Oda adı").fill(roomName);
    await owner.getByLabel("Açıklama").fill("Created by the real-backend Playwright E2E test");
    await owner.getByRole("button", { name: /odayı oluştur/i }).click();
    await expect(owner.getByRole("heading", { name: roomName })).toBeVisible({ timeout: 15_000 });

    // Verify REST message sending and that the sent message appears in history.
    await owner.getByRole("textbox", { name: "Mesajını yaz" }).fill(ownerMessage);
    await owner.getByRole("button", { name: "Mesaj gönder" }).click();
    await expect(owner.getByText(ownerMessage)).toBeVisible({ timeout: 15_000 });

    // REGISTER a second account and JOIN the room created by the first account.
    await register(member, memberName, memberEmail);
    const roomCard = member.locator("article").filter({ hasText: roomName });
    await expect(roomCard).toBeVisible({ timeout: 15_000 });
    await roomCard.getByRole("button", { name: "Katıl" }).click();
    await expect(member.getByRole("heading", { name: roomName })).toBeVisible({ timeout: 15_000 });

    // Verify a second participant can read the first message and send a message.
    await expect(member.getByText(ownerMessage)).toBeVisible({ timeout: 15_000 });
    await member.getByRole("textbox", { name: "Mesajını yaz" }).fill(memberMessage);
    await member.getByRole("button", { name: "Mesaj gönder" }).click();
    await expect(member.getByText(memberMessage)).toBeVisible({ timeout: 15_000 });

    // PROFILE endpoint: update a real account field and verify success feedback.
    await member.getByRole("link", { name: "Profil" }).click();
    await expect(member.getByRole("heading", { name: "Profil ayarları" })).toBeVisible();
    const updatedName = `upd_${runId.slice(-12)}`;
    await member.getByLabel("Kullanıcı adı").fill(updatedName);
    await member.getByRole("button", { name: /değişiklikleri kaydet/i }).click();
    await expect(member.getByText("Profilin güncellendi.")).toBeVisible({ timeout: 15_000 });

    // LOGOUT and LOGIN using the account created above.
    await logout(member);
    await member.goto("/login");
    await member.getByLabel("E-posta").fill(memberEmail);
    await member.getByLabel("Şifre").fill(password);
    await member.getByRole("button", { name: "Giriş yap" }).click();
    await expectRoomScreen(member, "Tekrar giriş sonrası");
    await expect(member.getByText(updatedName)).toBeVisible();
  } finally {
    await ownerContext.close();
    await memberContext.close();
  }
});

test("real backend: guest access opens rooms", async ({ page, request }) => {
  test.setTimeout(30_000);
  await assertBackendReady(request);
  await page.goto("/welcome");
  await page.getByRole("button", { name: /misafir olarak başla/i }).click();
  await expectRoomScreen(page, "Misafir oturumu sonrası");
  await expect(page.getByText("Misafir hesap")).toBeVisible();
});
