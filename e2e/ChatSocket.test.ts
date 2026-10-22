import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatSocket } from "./ChatSocket";
import type { ServerFrame } from "./protocol";

class FakeWebSocket {
  static CONNECTING = 0; static OPEN = 1; static CLOSED = 3;
  static instances: FakeWebSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;
  constructor(public url: string) { FakeWebSocket.instances.push(this); }
  send(data: string) { this.sent.push(data); }
  close() { this.readyState = 3; }
  open() { this.readyState = 1; this.onopen?.(); }
  receive(frame: unknown) { this.onmessage?.({ data: JSON.stringify(frame) } as MessageEvent<string>); }
  drop(code: number, reason = "") { this.readyState = 3; this.onclose?.({ code, reason } as CloseEvent); }
}

const TOKEN = "a".repeat(64);
const authenticated = { type: "authenticated", user: { id: "u1", username: "ali" } };

describe("ChatSocket", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.stubGlobal("WebSocket", FakeWebSocket);
    vi.stubEnv("VITE_WS_URL", "ws://test/ws");
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  const start = () => {
    const socket = new ChatSocket(TOKEN);
    const frames: ServerFrame[] = [];
    socket.onEvent((f) => frames.push(f));
    socket.connect();
    return { socket, frames, ws: () => FakeWebSocket.instances.at(-1)! };
  };

  it("bağlanınca ilk mesaj olarak yalnızca token'ı gönderir", () => {
    const { ws } = start();
    ws().open();
    expect(JSON.parse(ws().sent[0])).toEqual({ token: TOKEN });
  });

  it("beklenmedik kopmada yeniden bağlanır; geri çekilme yalnızca kimlik doğrulanınca sıfırlanır", () => {
    const { ws } = start();
    ws().open(); ws().drop(1006);                 // 1. kopma: 1 sn sonra
    vi.advanceTimersByTime(999); expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1); expect(FakeWebSocket.instances).toHaveLength(2);

    ws().open(); ws().drop(1006);                 // açıldı ama kimlik DOĞRULANMADI: bekleme 2 sn olmalı
    vi.advanceTimersByTime(1999); expect(FakeWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1); expect(FakeWebSocket.instances).toHaveLength(3);

    ws().open(); ws().receive(authenticated);     // kimlik doğrulandı: sayaç sıfırlanır
    ws().drop(1006);
    vi.advanceTimersByTime(1000); expect(FakeWebSocket.instances).toHaveLength(4);
  });

  it("4001 ile kapanınca yeniden DENEMEZ ve session_closed bildirir", () => {
    const { ws, frames } = start();
    ws().open(); ws().drop(4001, "Session closed");
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(frames).toEqual([{ type: "session_closed" }]);
  });

  it("session_closed çerçevesinden sonra kopma yeniden denenmez ve bildirim tekrarlanmaz", () => {
    const { ws, frames } = start();
    ws().open(); ws().receive({ type: "session_closed" }); ws().drop(4001);
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(frames.filter((f) => f.type === "session_closed")).toHaveLength(1);
  });

  it("1008 kimlik reddi oturum bitişi sayılır, izinsiz Origin sayılmaz; ikisi de yeniden denenmez", () => {
    let s = start(); s.ws().open(); s.ws().drop(1008, "Invalid authentication");
    expect(s.frames).toEqual([{ type: "session_closed" }]);
    vi.advanceTimersByTime(60_000); expect(FakeWebSocket.instances).toHaveLength(1);

    FakeWebSocket.instances = [];
    s = start(); s.ws().open(); s.ws().drop(1008, "Origin not allowed");
    expect(s.frames).toEqual([]);
    vi.advanceTimersByTime(60_000); expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("1013 (çok fazla bağlantı) için 30 sn bekler", () => {
    const { ws } = start();
    ws().open(); ws().drop(1013);
    vi.advanceTimersByTime(29_999); expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1); expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("bilinmeyen veya bozuk çerçeveleri yutar", () => {
    const { ws, frames } = start();
    ws().open();
    ws().receive({ type: "execute_script" });
    ws().receive({ type: "new_message", message: { id: 1 } });
    ws().onmessage?.({ data: "{bozuk json" } as MessageEvent<string>);
    expect(frames).toEqual([]);
  });

  it("close() sonrası yeniden bağlanmaz", () => {
    const { socket, ws } = start();
    ws().open(); socket.close();
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
