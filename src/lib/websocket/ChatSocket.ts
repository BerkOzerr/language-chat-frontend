import type { ServerFrame } from "./protocol";
import { websocketUrl } from "./protocol";

export type SocketStatus = "connecting" | "connected" | "disconnected" | "error";
type Listener = (event: ServerFrame) => void;
type StatusListener = (status: SocketStatus) => void;

/** One room-scoped socket. Connection ownership is explicit; no hidden global singleton. */
export class ChatSocket {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private manuallyClosed = false;
  private reconnectTimer: number | undefined;
  private retry = 0;

  constructor(private readonly token: string) {}
  onEvent(listener: Listener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onStatus(listener: StatusListener): () => void { this.statusListeners.add(listener); return () => this.statusListeners.delete(listener); }
  private setStatus(status: SocketStatus) { this.statusListeners.forEach((fn) => fn(status)); }
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;
    this.manuallyClosed = false;
    this.setStatus("connecting");
    const socket = new WebSocket(websocketUrl());
    this.socket = socket;
    socket.onopen = () => {
      this.retry = 0;
      socket.send(JSON.stringify({ token: this.token }));
    };
    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const frame = JSON.parse(event.data) as ServerFrame;
        this.listeners.forEach((listener) => listener(frame));
      } catch { /* Ignore malformed server frames, never crash the UI. */ }
    };
    socket.onerror = () => this.setStatus("error");
    socket.onclose = () => {
      this.setStatus("disconnected");
      if (!this.manuallyClosed) {
        const delay = Math.min(1000 * 2 ** this.retry, 10_000);
        this.retry += 1;
        this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
      }
    };
  }
  send(frame: { type: "join_room"; roomId: string } | { type: "send_message"; roomId: string; content: string }) {
    if (this.socket?.readyState !== WebSocket.OPEN) throw new Error("WebSocket bağlantısı hazır değil.");
    this.socket.send(JSON.stringify(frame));
  }
  close() {
    this.manuallyClosed = true;
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    this.socket?.close(1000, "Client closed");
    this.socket = null;
  }
}