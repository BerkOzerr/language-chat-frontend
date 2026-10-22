import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, sessionStore, setUnauthorizedHandler } from "./client";

const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

describe("api istemcisi", () => {
  const handler = vi.fn();
  beforeEach(() => { sessionStorage.clear(); handler.mockClear(); setUnauthorizedHandler(handler); });
  afterEach(() => { setUnauthorizedHandler(null); vi.unstubAllGlobals(); });

  it("oturumlu istek 401 alırsa oturumu temizler ve arayüzü haberdar eder", async () => {
    sessionStore.save("t".repeat(64), { id: "1", username: "ali", account_type: "registered" });
    vi.stubGlobal("fetch", () => reply(401, { error: "unauthorized", message: "Geçersiz veya süresi dolmuş oturum." }));
    await expect(api.me()).rejects.toMatchObject({ status: 401 });
    expect(sessionStore.getToken()).toBeNull();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("yanlış şifreyle giriş 401'i mevcut oturumu SİLMEZ ve çıkış tetiklemez", async () => {
    sessionStore.save("t".repeat(64), { id: "1", username: "ali", account_type: "registered" });
    vi.stubGlobal("fetch", () => reply(401, { error: "invalid_credentials", message: "E-posta veya şifre hatalı." }));
    await expect(api.login({ email: "a@b.com", password: "x" })).rejects.toBeInstanceOf(ApiError);
    expect(sessionStore.getToken()).not.toBeNull();
    expect(handler).not.toHaveBeenCalled();
  });

  it("ağ hatasını anlaşılır bir ApiError'a çevirir", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
    await expect(api.rooms()).rejects.toMatchObject({ status: 0, code: "network_error", message: expect.stringContaining("Sunucuya ulaşılamadı") });
  });

  it("429'da bekleme süresini söyler", async () => {
    vi.stubGlobal("fetch", () => reply(429, { statusCode: 429, error: "rate_limited", message: "x", retryAfterSeconds: 600 }));
    await expect(api.login({ email: "a@b.com", password: "x" })).rejects.toMatchObject({ message: "Çok fazla istek gönderdin. 10 dakika sonra tekrar dene." });
  });

  it("mesaj geçmişinde cursor'ı sorguya ekler", async () => {
    const fetchMock = vi.fn((_url: string) => reply(200, { messages: [], pagination: { limit: 50, hasMore: false, nextCursor: null } }));
    vi.stubGlobal("fetch", fetchMock);
    await api.messages("r1", "abc/def");
    expect(String(fetchMock.mock.calls[0][0])).toContain("cursor=abc%2Fdef");
  });
});
