import type { ServerFrame } from "./protocol";
import { FATAL_CLOSE_CODES, isServerFrame, websocketUrl } from "./protocol";

export type SocketStatus = "connecting" | "connected" | "disconnected" | "error" | "closed";
type Listener = (event: ServerFrame) => void;
type StatusListener = (status: SocketStatus) => void;

const MAX_BACKOFF_MS = 10_000;
const TOO_MANY_CONNECTIONS_DELAY_MS = 30_000; // 1013

/**
 * Tek odaya ait soket. Bağlantı sahipliği açıktır; gizli bir global yoktur.
 *
 * Yeniden bağlanma kuralları:
 *  - Beklenmedik kopmalarda üstel geri çekilme (1 sn, 2 sn, 4 sn, en fazla 10 sn) + küçük rastgelelik.
 *  - Geri çekilme yalnızca kimlik DOĞRULANINCA sıfırlanır. Bağlantı açılır açılmaz sıfırlanırsa
 *    kimliği reddedilen bir soket saniyede bir sunucuya saldırır.
 *  - 1008 / 1009 / 4001 ile kapanma veya `session_closed` kalıcıdır: yeniden denenmez.
 */
export class ChatSocket {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private manuallyClosed = false;
  private fatal = false;
  private reconnectTimer: number | undefined;
  private retry = 0;

  constructor(private readonly token: string) {}
  onEvent(listener: Listener): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onStatus(listener: StatusListener): () => void { this.statusListeners.add(listener); return () => this.statusListeners.delete(listener); }
  private setStatus(status: SocketStatus) { this.statusListeners.forEach((fn) => fn(status)); }
  private emit(frame: ServerFrame) { this.listeners.forEach((listener) => listener(frame)); }

  connect() {
    if (this.fatal) return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;
    this.manuallyClosed = false;
    this.setStatus("connecting");
    const socket = new WebSocket(websocketUrl());
    this.socket = socket;
    socket.onopen = () => {
      socket.send(JSON.stringify({ token: this.token }));
    };
    socket.onmessage = (event: MessageEvent<string>) => {
      let frame: unknown;
      try { frame = JSON.parse(event.data); } catch { return; /* bozuk çerçeve arayüzü çökertmez */ }
      if (!isServerFrame(frame)) return;
      if (frame.type === "authenticated") { this.retry = 0; this.setStatus("connected"); }
      if (frame.type === "session_closed") this.fatal = true;
      this.emit(frame);
    };
    socket.onerror = () => this.setStatus("error");
    socket.onclose = (event: CloseEvent) => {
      if (this.socket !== socket) return; // close() veya yeni bağlantı sonrası eski soketin gecikmiş kapanışı
      this.socket = null;
      if (this.manuallyClosed) { this.setStatus("disconnected"); return; }
      if (this.fatal || FATAL_CLOSE_CODES.has(event.code)) {
        const alreadyNotified = this.fatal;
        this.fatal = true;
        this.setStatus("closed");
        const sessionEnded = event.code === 4001 || (event.code === 1008 && /authentication/i.test(event.reason));
        if (sessionEnded && !alreadyNotified) this.emit({ type: "session_closed" });
        return;
      }
      this.setStatus("disconnected");
      const base = event.code === 1013 ? TOO_MANY_CONNECTIONS_DELAY_MS : Math.min(1000 * 2 ** this.retry, MAX_BACKOFF_MS);
      this.retry += 1;
      this.reconnectTimer = window.setTimeout(() => this.connect(), base + Math.random() * 500);
    };
  }
  send(frame: { type: "join_room"; roomId: string } | { type: "send_message"; roomId: string; content: string }) {
    if (this.socket?.readyState !== WebSocket.OPEN) throw new Error("WebSocket bağlantısı hazır değil.");
    this.socket.send(JSON.stringify(frame));
  }
  close() {
    this.manuallyClosed = true;
    if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000, "Client closed");
  }
}
