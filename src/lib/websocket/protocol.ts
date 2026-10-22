import type { Message, User } from "../api/types";

export type ClientFrame =
  | { token: string }
  | { type: "join_room"; roomId: string }
  | { type: "send_message"; roomId: string; content: string };

export type ServerFrame =
  | { type: "authenticated"; user: Pick<User, "id" | "username"> }
  | { type: "room_joined"; roomId: string }
  | { type: "new_message"; message: Message }
  | { type: "error"; error: string }
  | { type: "removed_from_room"; roomId?: string }
  | { type: "session_closed" };

export const MAX_MESSAGE_LENGTH = 2000;

/**
 * Bu kodlarla kapanan bağlantı yeniden DENENMEZ:
 * 1008 kimlik/izin (geçersiz token, izinsiz Origin, kimlik zaman aşımı, aşırı mesaj),
 * 1009 çerçeve çok büyük, 4001 oturum kapandı.
 */
export const FATAL_CLOSE_CODES: ReadonlySet<number> = new Set([1008, 1009, 4001]);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === "string";

function isMessage(value: unknown): value is Message {
  return isObject(value)
    && isString(value.id) && isString(value.room_id) && isString(value.user_id)
    && isString(value.username) && isString(value.created_at)
    && isString(value.content) && value.content.length <= MAX_MESSAGE_LENGTH;
}

/** Sunucudan gelen çerçeveyi doğrular: bilinmeyen veya bozuk çerçeveler arayüze ulaşmaz. */
export function isServerFrame(value: unknown): value is ServerFrame {
  if (!isObject(value) || !isString(value.type)) return false;
  switch (value.type) {
    case "authenticated": return isObject(value.user) && isString(value.user.id) && isString(value.user.username);
    case "room_joined": return isString(value.roomId);
    case "new_message": return isMessage(value.message);
    case "error": return isString(value.error);
    case "removed_from_room": return value.roomId === undefined || isString(value.roomId);
    case "session_closed": return true;
    default: return false;
  }
}

export function websocketUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined;
  if (explicit) return explicit;
  if (import.meta.env.DEV) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/api/ws`;
  }
  const base = (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/+$/, "");
  return base.replace(/^https:/, "wss:").replace(/^http:/, "ws:") + "/ws";
}
