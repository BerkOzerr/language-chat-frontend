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
  | { type: "removed_from_room"; roomId?: string };

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