import type { ApiErrorBody, AuthResponse, CreatedRoom, MessagesPage, Room, User } from "./types";

const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
// In development, call the same-origin Vite proxy. This avoids localhost/127.0.0.1 CORS mismatches.
const baseUrl = import.meta.env.DEV ? "/api" : configuredBaseUrl;
const TOKEN_KEY = "language-chat-token";
const USER_KEY = "language-chat-user";

export const sessionStore = {
  getToken: () => sessionStorage.getItem(TOKEN_KEY),
  getUser: (): User | null => {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as User; } catch { return null; }
  },
  save: (token: string, user: User) => {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  updateUser: (user: User) => sessionStorage.setItem(USER_KEY, JSON.stringify(user)),
  clear: () => { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(USER_KEY); }
};

export class ApiError extends Error {
  constructor(public status: number, public code: string | undefined, message: string, public body?: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
  }
}

// Oturum geçersiz olunca (401) arayüzün de çıkış yapması için AuthProvider bunu kaydeder.
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) { unauthorizedHandler = handler; }

function formatWait(seconds: number): string {
  return seconds < 60 ? `${Math.max(1, Math.ceil(seconds))} saniye` : `${Math.ceil(seconds / 60)} dakika`;
}

async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const token = sessionStore.getToken();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers
      }
    });
  } catch {
    throw new ApiError(0, "network_error", "Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.");
  }
  let body: unknown;
  try { body = await response.json(); } catch { body = undefined; }
  if (!response.ok) {
    const data = (body && typeof body === "object" ? body : {}) as ApiErrorBody;
    // Yalnızca oturumlu bir istek 401 aldıysa oturum bitmiştir (yanlış şifreyle giriş 401'i bunu tetiklemez).
    if (response.status === 401 && authenticated && token) {
      sessionStore.clear();
      unauthorizedHandler?.();
    }
    const wait = typeof data.retryAfterSeconds === "number" ? data.retryAfterSeconds : null;
    const message = response.status === 429 && wait !== null
      ? `Çok fazla istek gönderdin. ${formatWait(wait)} sonra tekrar dene.`
      : data.message || `İstek başarısız (${response.status}).`;
    throw new ApiError(response.status, data.error, message, data);
  }
  return body as T;
}
const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  guest: () => request<AuthResponse>("/auth/guest", json({}), false),
  register: (input: { username: string; email: string; password: string }) => request<AuthResponse>("/auth/register", json(input), false),
  login: (input: { email: string; password: string }) => request<AuthResponse>("/auth/login", json(input), false),
  convertGuest: (input: { username: string; email: string; password: string }) => request<{ user: User; message: string }>("/auth/convert-guest", json(input)),
  me: () => request<{ user: User }>("/auth/me"),
  logout: () => request<{ status: string; message: string }>("/auth/logout", json({})),
  verifyEmail: (token: string) => request<{ status: string; message: string }>("/auth/verify-email", json({ token }), false),
  resendVerification: () => request<{ status: string; message: string }>("/auth/resend-verification", json({})),
  forgotPassword: (email: string) => request<{ status: string; message: string }>("/auth/forgot-password", json({ email }), false),
  resetPassword: (input: { token: string; password: string }) => request<{ status: string; message: string }>("/auth/reset-password", json(input), false),
  profile: () => request<{ user: User }>("/users/me"),
  updateProfile: (input: Partial<Pick<User, "username" | "native_language" | "learning_language" | "language_level">>) =>
    request<{ user: User }>("/users/me", { method: "PATCH", body: JSON.stringify(input) }),
  rooms: () => request<{ rooms: Room[]; count: number }>("/rooms"),
  createRoom: (input: { name: string; description?: string; language_code: string; language_level?: string; max_members: number }) =>
    request<{ room: CreatedRoom }>("/rooms", json(input)),
  joinRoom: (roomId: string) => request<{ status: string; message: string }>(`/rooms/${encodeURIComponent(roomId)}/join`, json({})),
  leaveRoom: (roomId: string) => request<{ status: string; message: string }>(`/rooms/${encodeURIComponent(roomId)}/leave`, json({})),
  messages: (roomId: string, cursor?: string | null) =>
    request<MessagesPage>(`/rooms/${encodeURIComponent(roomId)}/messages?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`),
  sendMessage: (roomId: string, content: string) => request<{ message: import("./types").Message }>(`/rooms/${encodeURIComponent(roomId)}/messages`, { method: "POST", body: JSON.stringify({ content }) })
};