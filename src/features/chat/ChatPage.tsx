import { ArrowLeft, Send, Users, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../app/auth-provider";
import { ErrorNotice, Loading } from "../../components/ui/Notice";
import { api } from "../../lib/api/client";
import type { Message } from "../../lib/api/types";
import { ChatSocket, type SocketStatus } from "../../lib/websocket/ChatSocket";
import type { ServerFrame } from "../../lib/websocket/protocol";

export function ChatPage() {
  const { roomId = "" } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("connecting");
  const [socketError, setSocketError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<ChatSocket | null>(null);
  const roomQuery = useQuery({ queryKey: ["rooms"], queryFn: api.rooms });
  const historyQuery = useQuery({ queryKey: ["messages", roomId], queryFn: () => api.messages(roomId), enabled: Boolean(roomId) });
  const room = roomQuery.data?.rooms.find((r) => r.id === roomId);
  const messages = useMemo(() => {
    const rows = historyQuery.data?.messages ?? [];
    return [...rows].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [historyQuery.data]);
  const sendMutation = useMutation({
    mutationFn: (text: string) => api.sendMessage ? api.sendMessage(roomId, text) : Promise.reject(new Error("REST mesaj endpoint'i henüz yapılandırılmadı.")),
    onSuccess: () => { setContent(""); void queryClient.invalidateQueries({ queryKey:["messages", roomId] }); },
    onError: (e: Error) => setSocketError(e.message)
  });
  useEffect(() => {
    if (!token || !roomId) return;
    const socket = new ChatSocket(token);
    socketRef.current = socket;
    const removeStatus = socket.onStatus(setSocketStatus);
    const removeEvent = socket.onEvent((event: ServerFrame) => {
      if (event.type === "authenticated") {
        setSocketStatus("connected");
        setSocketError("");
        try { socket.send({ type: "join_room", roomId }); } catch { /* wait for next connection */ }
      }
      if (event.type === "error") setSocketError(event.error);
      if (event.type === "new_message") {
        queryClient.setQueryData<{ messages: Message[]; nextCursor?: string | null }>(["messages", roomId], (old) => {
          const previous = old?.messages ?? [];
          if (previous.some((m) => m.id === event.message.id)) return old;
          return { ...old, messages: [...previous, event.message] };
        });
      }
    });
    socket.connect();
    return () => {
      removeStatus();
      removeEvent();
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [token, roomId, queryClient]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth", block:"end" }); }, [messages.length]);
  const statusLabel = socketStatus === "connected" ? "Canlı bağlantı" : socketStatus === "connecting" ? "Bağlanıyor..." : socketStatus === "error" ? "Bağlantı hatası" : "Yeniden bağlanıyor";
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 2000) return;
    setSocketError("");
    sendMutation.mutate(trimmed);
  }
  if (historyQuery.isPending || roomQuery.isPending) return <Loading label="Sohbet hazırlanıyor..."/>;
  if (!room) return <div className="mx-auto max-w-xl py-10"><ErrorNotice message="Bu oda bulunamadı veya artık aktif değil."/><Link className="btn-secondary mt-4" to="/rooms"><ArrowLeft size={16}/> Odalara dön</Link></div>;
  return <div className="mx-auto max-w-5xl">
    <div className="mb-6 flex items-center justify-between gap-3"><div><Link to="/rooms" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={15}/> Tüm odalar</Link><h1 className="text-2xl font-black sm:text-3xl">{room.name}</h1><p className="mt-1 text-sm text-slate-500">{room.language_code.toUpperCase()} {room.language_level ? `· ${room.language_level}` : ""} · {room.member_count}/{room.max_members} kişi</p></div><span className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${socketStatus === "connected" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{socketStatus === "connected" ? <Wifi size={14}/> : <WifiOff size={14}/>}<span className="hidden sm:inline">{statusLabel}</span></span></div>
    <section className="panel overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="font-bold">Sohbet</p><p className="mt-1 text-xs text-slate-400">Saygılı ol, merak et, pratik yap.</p></div><span className="flex items-center gap-2 text-xs font-semibold text-slate-400"><Users size={14}/>{room.member_count} katılımcı</span></div>
      <div className="h-[min(60vh,620px)] min-h-[320px] space-y-4 overflow-y-auto bg-slate-50/60 p-4 sm:p-6">
        {historyQuery.isError && <ErrorNotice message={historyQuery.error.message} onRetry={() => void historyQuery.refetch()}/>}
        {messages.length === 0 && !historyQuery.isError && <div className="flex h-full flex-col items-center justify-center text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Send size={22}/></span><h2 className="mt-4 font-extrabold">Sohbeti başlat</h2><p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">İlk mesajını gönder. Herkes burada birlikte öğreniyor.</p></div>}
        {messages.map((message) => <MessageBubble key={message.id} message={message} own={message.user_id === user?.id}/>)}
        <div ref={endRef}/>
      </div>
      {socketError && <div className="border-t border-slate-100 p-3"><ErrorNotice message={socketError}/></div>}
      <form onSubmit={submit} className="flex items-end gap-3 border-t border-slate-100 bg-white p-4 sm:p-5"><textarea className="field max-h-32 min-h-[46px] resize-y !rounded-2xl" rows={1} value={content} maxLength={2000} onChange={(e) => setContent(e.target.value)} placeholder="Mesajını yaz..." aria-label="Mesajını yaz" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); } }}/><button className="btn-primary !h-[46px] !w-[48px] !shrink-0 !p-0" aria-label="Mesaj gönder" disabled={!content.trim() || sendMutation.isPending}><Send size={18}/></button></form>
      <div className="px-5 pb-4 text-[11px] text-slate-400">Enter ile gönder · Shift + Enter ile yeni satır · {content.length}/2000</div>
    </section>
  </div>;
}
function MessageBubble({ message, own }: { message: Message; own: boolean }) {
  const time = new Date(message.created_at);
  return <div className={`flex ${own ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] sm:max-w-[72%] ${own ? "items-end" : "items-start"} flex flex-col`}><div className="mb-1 flex items-center gap-2 px-1"><span className="text-xs font-bold text-slate-600">{own ? "Sen" : message.username}</span><span className="text-[10px] text-slate-400">{Number.isNaN(time.getTime()) ? "" : time.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span></div><p className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${own ? "rounded-tr-md bg-indigo-600 text-white" : "rounded-tl-md border border-slate-100 bg-white text-slate-700"}`}>{message.content}</p></div></div>;
}