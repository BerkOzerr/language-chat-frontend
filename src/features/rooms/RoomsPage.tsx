import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Globe2, LoaderCircle, Plus, Search, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { api, ApiError } from "../../lib/api/client";
import { LANGUAGES, LEVELS, type Room } from "../../lib/api/types";
import { ErrorNotice, Loading } from "../../components/ui/Notice";

const roomSchema = z.object({
  name: z.string().trim().min(3, "En az 3 karakter.").max(80, "En fazla 80 karakter."),
  description: z.string().max(500, "En fazla 500 karakter.").optional(),
  language_code: z.string().min(2),
  language_level: z.string().optional(),
  max_members: z.coerce.number().int().min(2).max(10)
});
type RoomValues = z.infer<typeof roomSchema>;
const flags: Record<string, string> = { tr:"🇹🇷", en:"🇬🇧", de:"🇩🇪", fr:"🇫🇷", es:"🇪🇸", it:"🇮🇹", pt:"🇵🇹", ru:"🇷🇺", ja:"🇯🇵", ko:"🇰🇷", zh:"🇨🇳", ar:"🇸🇦" };

export function RoomsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  const roomsQuery = useQuery({ queryKey: ["rooms"], queryFn: api.rooms });
  const createForm = useForm<RoomValues>({ resolver: zodResolver(roomSchema), defaultValues: { name:"", description:"", language_code:"en", language_level:"B1", max_members:10 } });
  const joinMutation = useMutation({
    mutationFn: (room: Room) => api.joinRoom(room.id),
    onSuccess: (_data, room) => { void queryClient.invalidateQueries({ queryKey:["rooms"] }); navigate(`/rooms/${room.id}`); },
    onError: (e: Error) => setError(e.message)
  });
  const createMutation = useMutation({
    mutationFn: (values: RoomValues) => api.createRoom({ ...values, description: values.description || undefined, language_level: values.language_level || undefined }),
    onSuccess: async ({ room }) => { await queryClient.invalidateQueries({ queryKey:["rooms"] }); setShowCreate(false); createForm.reset(); navigate(`/rooms/${room.id}`); },
    onError: (e: Error) => setError(e instanceof ApiError ? e.message : e.message)
  });
  const rooms = useMemo(() => (roomsQuery.data?.rooms ?? []).filter((room) => `${room.name} ${room.description ?? ""}`.toLowerCase().includes(search.toLowerCase())), [roomsQuery.data, search]);
  return <div>
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">Topluluğu keşfet</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Sohbet odaları</h1><p className="mt-2 text-sm text-slate-500">Dil pratiğine uygun bir odaya katıl veya kendi odanı oluştur.</p></div><button className="btn-primary" onClick={() => { setError(""); setShowCreate(true); }}><Plus size={17}/> Oda oluştur</button></div>
    <div className="panel mt-7 rounded-2xl p-3 sm:p-4"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input className="field !border-0 !bg-transparent !pl-11 !shadow-none" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Oda adı veya açıklama ara..." aria-label="Oda ara"/></div></div>
    {error && <div className="mt-4"><ErrorNotice message={error}/></div>}
    {roomsQuery.isPending ? <Loading label="Odalar yükleniyor..."/> : roomsQuery.isError ? <div className="mt-6"><ErrorNotice message={roomsQuery.error.message} onRetry={() => void roomsQuery.refetch()}/></div> : rooms.length === 0 ? <div className="panel mt-6 rounded-3xl p-12 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Globe2 size={25}/></div><h2 className="mt-4 text-lg font-extrabold">{search ? "Eşleşen oda bulunamadı" : "İlk sohbeti sen başlat"}</h2><p className="mt-2 text-sm text-slate-500">Aramanı değiştirebilir veya yeni bir oda oluşturabilirsin.</p><button className="btn-primary mt-5" onClick={() => setShowCreate(true)}><Plus size={16}/> Oda oluştur</button></div> :
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rooms.map((room) => <RoomCard key={room.id} room={room} busy={joinMutation.isPending} onJoin={() => { setError(""); joinMutation.mutate(room); }}/>)}</div>}
    {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}><section className="my-auto w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="create-room-title"><div className="flex items-start justify-between"><div><p className="eyebrow">Yeni topluluk</p><h2 id="create-room-title" className="mt-1 text-2xl font-black">Oda oluştur</h2></div><button className="btn-secondary !p-2" onClick={() => setShowCreate(false)} aria-label="Kapat"><X size={17}/></button></div>
      {error && <div className="mt-4"><ErrorNotice message={error}/></div>}
      <form className="mt-5 space-y-4" onSubmit={createForm.handleSubmit((v) => { setError(""); createMutation.mutate(v); })}>
        <label className="block text-sm font-semibold">Oda adı<input className="field mt-2" placeholder="English Café" {...createForm.register("name")}/>{createForm.formState.errors.name && <span className="text-xs text-rose-600">{createForm.formState.errors.name.message}</span>}</label>
        <label className="block text-sm font-semibold">Açıklama <span className="font-normal text-slate-400">(isteğe bağlı)</span><textarea className="field mt-2 resize-y" rows={2} placeholder="Bu odada neler konuşacaksınız?" {...createForm.register("description")}/></label>
        <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold">Dil<select className="field mt-2" {...createForm.register("language_code")}>{LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select></label><label className="block text-sm font-semibold">Seviye<select className="field mt-2" {...createForm.register("language_level")}>{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></label></div>
        <label className="block text-sm font-semibold">Maksimum katılımcı<select className="field mt-2" {...createForm.register("max_members")}>{Array.from({length:9},(_,i)=>i+2).map(n=><option key={n} value={n}>{n} kişi</option>)}</select></label>
        <button className="btn-primary w-full" disabled={createMutation.isPending}>{createMutation.isPending ? <LoaderCircle className="animate-spin" size={16}/> : <Plus size={16}/>} Odayı oluştur</button>
      </form></section></div>}
  </div>;
}

function RoomCard({ room, busy, onJoin }: { room: Room; busy: boolean; onJoin: () => void }) {
  const lang = LANGUAGES.find(l => l.code === room.language_code)?.label ?? room.language_code;
  const full = room.member_count >= room.max_members;
  return <article className="panel group rounded-3xl p-5 transition hover:-translate-y-1 hover:shadow-lg sm:p-6"><div className="flex items-start justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">{flags[room.language_code] ?? "🌐"}</span><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${full ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>{full ? "Dolu" : "● Katılıma açık"}</span></div><h2 className="mt-5 text-lg font-extrabold">{room.name}</h2><p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">{room.description || `${lang} konuşma pratiği için bir araya gel.`}</p><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600">{lang}</span>{room.language_level && <span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700">{room.language_level}</span>}</div><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><span className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Users size={15}/>{room.member_count}/{room.max_members} kişi</span><button className="btn-primary !rounded-xl !px-3.5 !py-2.5 text-sm" disabled={busy || full} onClick={onJoin}>{busy ? "Katılıyor..." : "Katıl"} <ArrowRight size={15}/></button></div></article>;
}