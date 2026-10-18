import { zodResolver } from "@hookform/resolvers/zod";
import { Check, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "../../app/auth-provider";
import { ErrorNotice, Loading, SuccessNotice } from "../../components/ui/Notice";
import { api, ApiError } from "../../lib/api/client";
import { LANGUAGES, LEVELS, type User } from "../../lib/api/types";

const schema = z.object({ username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/), native_language: z.string(), learning_language: z.string(), language_level: z.string() });
type Values = z.infer<typeof schema>;
export function ProfilePage() {
  const queryClient = useQueryClient();
  const { user: authUser, refreshUser } = useAuth();
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const query = useQuery({ queryKey:["profile"], queryFn: api.profile });
  const form = useForm<Values>({ resolver:zodResolver(schema), defaultValues:{ username:"", native_language:"tr", learning_language:"en", language_level:"A1" } });
  useEffect(() => { if (query.data?.user) form.reset(toValues(query.data.user)); }, [query.data, form]);
  const mutation = useMutation({
    mutationFn: (values: Values) => api.updateProfile(values as Partial<Pick<User, "username" | "native_language" | "learning_language" | "language_level">>),
    onSuccess: async ({ user }) => { await queryClient.invalidateQueries({queryKey:["profile"]}); await refreshUser().catch(() => user); setSuccess("Profilin güncellendi."); setError(""); },
    onError: (e: Error) => { setSuccess(""); setError(e instanceof ApiError ? e.message : e.message); }
  });
  if (query.isPending) return <Loading label="Profil yükleniyor..."/>;
  if (query.isError) return <ErrorNotice message={query.error.message} onRetry={() => void query.refetch()}/>;
  const profile = query.data.user;
  return <div className="mx-auto max-w-3xl"><div><p className="eyebrow">Kişisel alanın</p><h1 className="mt-2 text-3xl font-black tracking-tight">Profil ayarları</h1><p className="mt-2 text-sm text-slate-500">Dil hedeflerini güncelle, sana uygun sohbetleri keşfet.</p></div>
    <section className="panel mt-7 rounded-3xl p-5 sm:p-8"><div className="flex items-center gap-4 border-b border-slate-100 pb-6"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><UserRound size={25}/></div><div><h2 className="font-extrabold">{profile.username}</h2><p className="mt-1 text-sm text-slate-500">{profile.email ?? "Misafir hesabı"} · {profile.account_type === "guest" ? "Misafir" : "Kayıtlı hesap"}</p></div></div>
      {success && <div className="mt-5"><SuccessNotice message={success}/></div>}{error && <div className="mt-5"><ErrorNotice message={error}/></div>}
      <form className="mt-6 space-y-5" onSubmit={form.handleSubmit((v) => { setError(""); setSuccess(""); mutation.mutate(v); })}>
        <label className="block text-sm font-semibold">Kullanıcı adı<input className="field mt-2" {...form.register("username")}/>{form.formState.errors.username && <span className="text-xs text-rose-600">3–24 karakter; harf, sayı ve alt çizgi kullan.</span>}</label>
        <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-semibold">Ana dil<select className="field mt-2" {...form.register("native_language")}>{LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}</select></label><label className="block text-sm font-semibold">Öğrendiğin dil<select className="field mt-2" {...form.register("learning_language")}>{LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}</select></label></div>
        <label className="block text-sm font-semibold">Dil seviyen<select className="field mt-2" {...form.register("language_level")}>{LEVELS.map(l=><option key={l} value={l}>{l}</option>)}</select></label>
        <div className="flex justify-end border-t border-slate-100 pt-5"><button className="btn-primary" disabled={mutation.isPending}><Check size={16}/>{mutation.isPending ? "Kaydediliyor..." : "Değişiklikleri kaydet"}</button></div>
      </form>
    </section>
    {authUser?.account_type === "guest" && <GuestConversion/>}
  </div>;
}
function toValues(user: User): Values {
  return { username:user.username, native_language:user.native_language ?? "tr", learning_language:user.learning_language ?? "en", language_level:user.language_level ?? "A1" };
}
function GuestConversion() {
  const { refreshUser } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const schema = z.object({ username:z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/), email:z.string().email(), password:z.string().min(12).max(128) });
  const form = useForm<{username:string;email:string;password:string}>({resolver:zodResolver(schema),defaultValues:{username:"",email:"",password:""}});
  const mutation = useMutation({mutationFn: api.convertGuest, onSuccess: async (r) => { await refreshUser(); setMessage(r.message); setExpanded(false); }, onError: (e: Error) => setMessage(e.message) });
  return <section className="panel mt-5 rounded-3xl p-6"><h2 className="font-extrabold">Hesabını kalıcı hale getir</h2><p className="mt-2 text-sm leading-6 text-slate-500">Misafir oturumunu e-posta ve şifreyle kayıtlı hesaba dönüştür.</p>{message && <p role="status" className="mt-3 text-sm text-indigo-700">{message}</p>}
    {!expanded ? <button className="btn-secondary mt-4" onClick={() => setExpanded(true)}>Hesabı dönüştür</button> : <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={form.handleSubmit(v => mutation.mutate(v))}><input className="field" placeholder="Kullanıcı adı" {...form.register("username")}/><input className="field" placeholder="E-posta" type="email" {...form.register("email")}/><input className="field sm:col-span-2" placeholder="En az 12 karakterlik şifre" type="password" {...form.register("password")}/><button className="btn-primary sm:col-span-2" disabled={mutation.isPending}>Hesabı kaydet</button></form>}
  </section>;
}