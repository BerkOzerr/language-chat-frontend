import { ArrowLeft, LogOut, Send, Users, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../app/auth-provider";
import { ErrorNotice, Loading } from "../../components/ui/Notice";
import { api, ApiError } from "../../lib/api/client";
import type { Message, MessagesPage } from "../../lib/api/types";
import { ChatSocket, type SocketStatus } from "../../lib/websocket/ChatSocket";
import { MAX_MESSAGE_LENGTH, type ServerFrame } from "../../lib/websocket/protocol";

// Sunucunun WebSocket hata kodlarının kullanıcıya gösterilen karşılıkları.
const SOCKET_ERRORS: Record<string, string> = {
  rate_limited: "Çok hızlı yazıyorsun. Birkaç saniye bekleyip tekrar dene.",
  busy: "Şu an çok fazla işlem var. Biraz bekleyip tekrar dene.",
  not_a_member: "Bu odanın üyesi değilsin. Odalar sayfasından katılabilirsin.",
  not_joined: "Odaya bağlantı henüz hazır değil. Birkaç saniye sonra tekrar dene.",
  room_not_found: "Bu oda artık mevcut değil.",
  invalid_content: `Mesaj 1 ile ${MAX_MESSAGE_LENGTH} karakter arasında olmalı.`,
  auth_timeout: "Bağlantı doğrulanamadı. Sayfayı yenile.",
  invalid_token: "Oturumun geçersiz. Tekrar giriş yap."
};
const STATUS_LABELS: Record<SocketStatus, string> = {
  connected: "Canlı bağlantı",
  connecting: "Bağlanıyor...",
  error: "Bağlantı hatası",
  disconnected: "Yeniden bağlanıyor",
  closed: "Bağlantı kapandı"
};
const byDate = (a: Message, b: Message) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

// Oda değişince tüm sohbet durumu (eski mesajlar, bağlantı) sıfırlansın diye key ile sarmalanır.
export function ChatPage() {
  const { roomId = "" } = useParams();
  return <ChatRoom key={roomId} roomId={roomId} />;
}

function ChatRoom({ roomId }: { roomId: string }) {
  const { token, user, endSession } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("connecting");
  const [notice, setNotice] = useState("");
  const [older, setOlder] = useState<Message[]>([]);
  const [olderCursor, setOlderCursor] = useState<string | null | undefined>(undefined);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const authCount = useRef(0);

  const roomQuery = useQuery({ queryKey: ["rooms"], queryFn: api.rooms });
  const historyQuery = useQuery({ queryKey: ["messages", roomId], queryFn: () => api.messages(roomId), enabled: Boolean(roomId), retry: false });
  const room = roomQuery.data?.rooms.find((r) => r.id === roomId);
  const page = historyQuery.data;
  const notMember = historyQuery.error instanceof ApiError && historyQuery.error.status === 403;
  const nextCursor = olderCursor !== undefined ? olderCursor : page?.pagination.nextCursor ?? null;

  const messages = useMemo(() => {
    const unique = new Map<string, Message>();
    for (const message of [...older, ...(page?.messages ?? [])]) unique.set(message.id, message);
    return [...unique.values()].sort(byDate);
  }, [older, page]);

  const addToCache = (message: Message) =>
    queryClient.setQueryData<MessagesPage>(["messages", roomId], (old) => {
      if (!old || old.messages.some((m) => m.id === message.id)) return old;
      return { ...old, messages: [...old.messages, message] };
    });

  // Mesaj REST ile gönderilir; sunucu odadaki herkese (gönderen dahil) canlı yayınlar.
  // Soket kopuksa bile mesajın kaybolmaması için yanıt doğrudan önbelleğe de eklenir.
  const sendMutation = useMutation({
    mutationFn: (text: string) => api.sendMessage(roomId, text),
    onSuccess: ({ message }) => { setContent(""); addToCache(message); },
    onError: (e: Error) => setNotice(e.message)
  });
  const leaveMutation = useMutation({
    mutationFn: () => api.leaveRoom(roomId),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ["messages", roomId] });
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
      navigate("/rooms", { replace: true });
    },
    onError: (e: Error) => setNotice(e.message)
  });
  const joinMutation = useMutation({
    mutationFn: () => api.joinRoom(roomId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
      await historyQuery.refetch();
    },
    onError: (e: Error) => setNotice(e.message)
  });

  const canConnect = Boolean(token) && historyQuery.isSuccess;
  useEffect(() => {
    if (!token || !canConnect) return;
    const socket = new ChatSocket(token);
    const removeStatus = socket.onStatus(setSocketStatus);
    const removeEvent = socket.onEvent((event: ServerFrame) => {
      switch (event.type) {
        case "authenticated":
          setNotice("");
          // Yeniden bağlanıldıysa kopukken kaçırılan mesajlar için geçmişi tazele.
          if (authCount.current++ > 0) void queryClient.invalidateQueries({ queryKey: ["messages", roomId] });
          try { socket.send({ type: "join_room", roomId }); } catch { /* sonraki bağlantıda denenir */ }
          break;
        case "new_message":
          if (event.message.room_id === roomId) addToCache(event.message);
          break;
        case "error":
          setNotice(SOCKET_ERRORS[event.error] ?? "Bir sorun oluştu. Sayfayı yenilemeyi dene.");
          break;
        case "removed_from_room":
          if (!event.roomId || event.roomId === roomId) {
            void queryClient.invalidateQueries({ queryKey: ["rooms"] });
            navigate("/rooms", { replace: true });
          }
          break;
        case "session_closed":
          endSession(); // oturum sunucuda kapandı: ProtectedLayout giriş sayfasına yönlendirir
          break;
      }
    });
    socket.connect();
    return () => { removeStatus(); removeEvent(); socket.close(); };
    // addToCache her render'da yeniden oluşur; yalnızca kimlik/oda değişince yeniden bağlanılır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, roomId, canConnect, queryClient, navigate, endSession]);

  // Yalnızca yeni bir son mesaj geldiğinde (eski sayfa yüklemede değil) listenin altına kaydır.
  // scrollIntoView sayfanın tamamını kaydırıp oda başlığını gizlediği için kapsayıcı kaydırılır.
  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [lastId]);

  async function loadOlder() {
    if (!nextCursor || loadingOlder) return;
    const el = listRef.current;
    const previousHeight = el?.scrollHeight ?? 0;
    const previousTop = el?.scrollTop ?? 0;
    setLoadingOlder(true);
    try {
      const result = await api.messages(roomId, nextCursor);
      setOlder((current) => [...result.messages, ...current]);
      setOlderCursor(result.pagination.nextCursor);
      requestAnimationFrame(() => { if (el) el.scrollTop = previousTop + (el.scrollHeight - previousHeight); });
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : "Eski mesajlar yüklenemedi.");
    } finally { setLoadingOlder(false); }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return;
    setNotice("");
    sendMutation.mutate(trimmed);
  }

  if (historyQuery.isPending || roomQuery.isPending) return <Loading label="Sohbet hazırlanıyor..." />;
  if (notMember) {
    return <div className="mx-auto max-w-xl py-10">
      <ErrorNotice message="Bu odanın üyesi değilsin. Mesajları görmek için önce odaya katılmalısın." />
      {notice && <div className="mt-3"><ErrorNotice message={notice} /></div>}
      <div className="mt-4 flex gap-3">
        <button className="btn-primary" disabled={joinMutation.isPending} onClick={() => { setNotice(""); joinMutation.mutate(); }}>{joinMutation.isPending ? "Katılıyor..." : "Odaya katıl"}</button>
        <Link className="btn-secondary" to="/rooms"><ArrowLeft size={16} /> Odalara dön</Link>
      </div>
    </div>;
  }
  if (!room) return <div className="mx-auto max-w-xl py-10"><ErrorNotice message="Bu oda bulunamadı veya artık aktif değil." /><Link className="btn-secondary mt-4" to="/rooms"><ArrowLeft size={16} /> Odalara dön</Link></div>;

  return <div className="mx-auto max-w-5xl">
    <div className="mb-6 flex items-center justify-between gap-3">
      <div>
        <Link to="/rooms" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={15} /> Tüm odalar</Link>
        <h1 className="text-2xl font-black sm:text-3xl">{room.name}</h1>
        <p className="mt-1 text-sm text-slate-500">{room.language_code.toUpperCase()} {room.language_level ? `· ${room.language_level}` : ""} · {room.member_count}/{room.max_members} kişi</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${socketStatus === "connected" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {socketStatus === "connected" ? <Wifi size={14} /> : <WifiOff size={14} />}<span className="hidden sm:inline">{STATUS_LABELS[socketStatus]}</span>
        </span>
        <button type="button" className="btn-secondary !px-3 !py-2 text-sm" disabled={leaveMutation.isPending}
          onClick={() => { if (window.confirm("Bu odadan ayrılmak istiyor musun? Yerin başkasına açılır.")) leaveMutation.mutate(); }}>
          <LogOut size={15} /><span className="hidden sm:inline">Odadan ayrıl</span>
        </button>
      </div>
    </div>
    <section className="panel overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div><p className="font-bold">Sohbet</p><p className="mt-1 text-xs text-slate-400">Saygılı ol, merak et, pratik yap.</p></div>
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-400"><Users size={14} />{room.member_count} katılımcı</span>
      </div>
      <div ref={listRef} className="h-[min(60vh,620px)] min-h-[320px] space-y-4 overflow-y-auto bg-slate-50/60 p-4 sm:p-6">
        {historyQuery.isError && <ErrorNotice message={historyQuery.error.message} onRetry={() => void historyQuery.refetch()} />}
        {nextCursor && <div className="text-center"><button type="button" className="btn-secondary !py-2 text-xs" onClick={() => void loadOlder()} disabled={loadingOlder}>{loadingOlder ? "Yükleniyor..." : "Daha eski mesajları yükle"}</button></div>}
        {messages.length === 0 && !historyQuery.isError && <div className="flex h-full flex-col items-center justify-center text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Send size={22} /></span><h2 className="mt-4 font-extrabold">Sohbeti başlat</h2><p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">İlk mesajını gönder. Herkes burada birlikte öğreniyor.</p></div>}
        {messages.map((message, index) => <MessageBubble key={message.id} message={message} own={message.user_id === user?.id} showDate={index === 0 || !sameDay(messages[index - 1].created_at, message.created_at)} />)}
      </div>
      {notice && <div className="border-t border-slate-100 p-3"><ErrorNotice message={notice} /></div>}
      <form onSubmit={submit} className="flex items-end gap-3 border-t border-slate-100 bg-white p-4 sm:p-5">
        <textarea className="field max-h-32 min-h-[46px] resize-y !rounded-2xl" rows={1} value={content} maxLength={MAX_MESSAGE_LENGTH} onChange={(e) => setContent(e.target.value)} placeholder="Mesajını yaz..." aria-label="Mesajını yaz"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); } }} />
        <button className="btn-primary !h-[46px] !w-[48px] !shrink-0 !p-0" aria-label="Mesaj gönder" disabled={!content.trim() || sendMutation.isPending}><Send size={18} /></button>
      </form>
      <div className="px-5 pb-4 text-[11px] text-slate-400">Enter ile gönder · Shift + Enter ile yeni satır · {content.length}/{MAX_MESSAGE_LENGTH}</div>
    </section>
  </div>;
}

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function MessageBubble({ message, own, showDate }: { message: Message; own: boolean; showDate: boolean }) {
  const time = new Date(message.created_at);
  const valid = !Number.isNaN(time.getTime());
  return <>
    {showDate && valid && <div className="py-1 text-center text-[11px] font-semibold text-slate-400">{time.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</div>}
    <div className={`flex ${own ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] sm:max-w-[72%] ${own ? "items-end" : "items-start"} flex flex-col`}>
        <div className="mb-1 flex items-center gap-2 px-1">
          <span className="text-xs font-bold text-slate-600">{own ? "Sen" : message.username}</span>
          <span className="text-[10px] text-slate-400">{valid ? time.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
        </div>
        <p className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${own ? "rounded-tr-md bg-indigo-600 text-white" : "rounded-tl-md border border-slate-100 bg-white text-slate-700"}`}>{message.content}</p>
      </div>
    </div>
  </>;
}
