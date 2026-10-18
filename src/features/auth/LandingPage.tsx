import { ArrowRight, Globe2, MessageCircle, ShieldCheck, Sparkles, Waves } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../lib/api/client";
import { useAuth } from "../../app/auth-provider";
import { ErrorNotice } from "../../components/ui/Notice";

export function LandingPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const guest = useMutation({ mutationFn: api.guest, onSuccess: (response) => { signIn(response); navigate("/rooms"); }, onError: (e: Error) => setError(e.message) });
  return <div className="auth-bg min-h-screen overflow-hidden">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
      <Link to="/welcome" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white"><Waves size={21}/></span><span className="font-extrabold tracking-tight">language<span className="text-indigo-600">chat</span></span></Link>
      <div className="flex items-center gap-3"><Link className="hidden text-sm font-semibold text-slate-600 hover:text-indigo-700 sm:block" to="/login">Giriş yap</Link><Link className="btn-secondary !rounded-full !px-5 !py-2.5 text-sm" to="/register">Hesap oluştur <ArrowRight size={15}/></Link></div>
    </header>
    <main className="mx-auto grid min-h-[calc(100vh-100px)] max-w-7xl items-center gap-12 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
      <section className="max-w-2xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-2 text-xs font-bold text-indigo-700"><Sparkles size={14}/> Dil öğrenmenin daha sosyal yolu</div>
        <h1 className="text-5xl font-black leading-[1.06] tracking-[-.055em] text-slate-900 sm:text-6xl lg:text-[72px]">Dil pratiği<br/>yap. <span className="text-indigo-600">Bağlantı</span><br/>kur.</h1>
        <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">Gerçek insanlarla, kendi seviyene uygun sohbet odalarında konuşarak öğren. Küçük adımlar, gerçek ilerleme.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button className="btn-primary !rounded-full !px-6 !py-3.5" onClick={() => guest.mutate()} disabled={guest.isPending}>{guest.isPending ? "Hazırlanıyor..." : "Misafir olarak başla"} <ArrowRight size={17}/></button>
          <Link className="btn-secondary !rounded-full !px-6 !py-3.5" to="/register">Ücretsiz hesap oluştur</Link>
        </div>
        {error && <div className="mt-4"><ErrorNotice message={error}/></div>}
        <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500"><span className="flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-600"/> Hızlı başlangıç</span><span className="flex items-center gap-2"><Globe2 size={15} className="text-indigo-600"/> 12 dil seçeneği</span><span className="flex items-center gap-2"><MessageCircle size={15} className="text-indigo-600"/> Canlı sohbet</span></div>
      </section>
      <section className="relative mx-auto w-full max-w-lg">
        <div className="absolute -inset-5 rounded-[36px] bg-gradient-to-br from-indigo-200/50 to-emerald-100/60 blur-2xl"/>
        <div className="panel relative rounded-[30px] p-5 sm:p-7">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5"><div><p className="eyebrow">Keşfet</p><h2 className="mt-1 text-xl font-extrabold">Bugünün sohbetleri</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Canlı pratik</span></div>
          <div className="mt-5 space-y-3">
            {[
              {emoji:"🇬🇧",title:"English Café",sub:"Günlük İngilizce · B1",count:"6/10",color:"bg-indigo-50"},
              {emoji:"🇩🇪",title:"Deutsch für alle",sub:"Almanca · A2",count:"4/8",color:"bg-amber-50"},
              {emoji:"🇪🇸",title:"Español sin miedo",sub:"İspanyolca · A1",count:"3/10",color:"bg-rose-50"}
            ].map((room) => <div key={room.title} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${room.color}`}>{room.emoji}</div><div className="min-w-0 flex-1"><p className="truncate font-bold">{room.title}</p><p className="mt-1 text-xs text-slate-500">{room.sub}</p></div><span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-500">{room.count}</span></div>)}
          </div>
          <div className="mt-5 rounded-2xl bg-indigo-600 p-5 text-white"><div className="flex items-center gap-2 text-sm font-bold"><Sparkles size={16}/> Her konuşma bir adımdır</div><p className="mt-2 text-sm leading-6 text-indigo-100">Hata yapmaktan korkma. Pratik yapmak, öğrenmenin kendisidir.</p></div>
        </div>
      </section>
    </main>
  </div>;
}