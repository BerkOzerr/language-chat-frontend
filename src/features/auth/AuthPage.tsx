import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, MailCheck, Waves } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api/client";
import { useAuth } from "../../app/auth-provider";
import { ErrorNotice } from "../../components/ui/Notice";

const schema = z.object({
  username: z.string().trim().min(3, "Kullanıcı adı en az 3 karakter olmalı.").max(24).regex(/^[a-zA-Z0-9_]+$/, "Yalnızca harf, sayı ve alt çizgi kullan."),
  email: z.string().trim().email("Geçerli bir e-posta adresi gir.").max(254),
  password: z.string().min(12, "Şifre en az 12 karakter olmalı.").max(128, "Şifre en fazla 128 karakter olabilir.")
});
const loginSchema = z.object({ email: z.string().trim().email("Geçerli e-posta gir."), password: z.string().min(1, "Şifre gerekli.") });
type Mode = "login" | "register";
export function AuthPage({ mode }: { mode: Mode }) {
  const isRegister = mode === "register";
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const form = useForm<{ username?: string; email: string; password: string }>({
    resolver: zodResolver(isRegister ? schema : loginSchema),
    defaultValues: { username: "", email: "", password: "" }
  });
  const mutation = useMutation({
    mutationFn: (values: { username?: string; email: string; password: string }) =>
      isRegister ? api.register({ username: values.username ?? "", email: values.email, password: values.password }) : api.login({ email: values.email, password: values.password }),
    onSuccess: (result) => { signIn(result); if (isRegister) { navigate("/rooms", { state: { registered: true } }); } else navigate("/rooms"); },
    onError: (e: Error) => setError(e instanceof ApiError ? e.message : "Beklenmeyen bir hata oluştu.")
  });
  const submit = form.handleSubmit((values) => { setError(""); mutation.mutate(values); });
  return <div className="auth-bg flex min-h-screen items-center justify-center px-4 py-10">
    <div className="w-full max-w-md">
      <Link to="/welcome" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16}/> Ana sayfaya dön</Link>
      <div className="panel rounded-[28px] p-7 sm:p-9">
        <Link to="/welcome" className="mb-8 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white"><Waves size={21}/></span><span className="font-extrabold">language<span className="text-indigo-600">chat</span></span></Link>
        <p className="eyebrow">{isRegister ? "Yolculuğuna başla" : "Tekrar hoş geldin"}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{isRegister ? "Hesabını oluştur" : "Giriş yap"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{isRegister ? "Topluluğa katıl, öğrendiğin dili konuşmaya başla." : "Sohbetlerine kaldığın yerden devam et."}</p>
        {error && <div className="mt-5"><ErrorNotice message={error}/></div>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          {isRegister && <label className="block text-sm font-semibold">Kullanıcı adı<input className="field mt-2" autoComplete="username" placeholder="ornek_kullanici" {...form.register("username")}/>{form.formState.errors.username && <span className="mt-1 block text-xs text-rose-600">{form.formState.errors.username.message}</span>}</label>}
          <label className="block text-sm font-semibold">E-posta<input className="field mt-2" autoComplete="email" type="email" placeholder="sen@ornek.com" {...form.register("email")}/>{form.formState.errors.email && <span className="mt-1 block text-xs text-rose-600">{form.formState.errors.email.message}</span>}</label>
          <label className="block text-sm font-semibold">Şifre<input className="field mt-2" autoComplete={isRegister ? "new-password" : "current-password"} type="password" placeholder={isRegister ? "En az 12 karakter" : "Şifren"} {...form.register("password")}/>{form.formState.errors.password && <span className="mt-1 block text-xs text-rose-600">{form.formState.errors.password.message}</span>}</label>
          <button className="btn-primary mt-2 w-full" disabled={mutation.isPending} type="submit">{mutation.isPending ? "İşleniyor..." : isRegister ? "Hesap oluştur" : "Giriş yap"} <ArrowRight size={16}/></button>
        </form>
        {!isRegister && <p className="mt-4 text-right text-sm"><Link className="font-semibold text-indigo-700 hover:underline" to="/forgot-password">Şifremi unuttum</Link></p>}
        {isRegister && <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900"><MailCheck size={16} className="mt-0.5 shrink-0"/> Kayıt sonrası e-posta adresini doğrulaman gerekecek. Doğrulama bağlantısı e-posta kutuna gönderilecek.</p>}
        <p className="mt-6 text-center text-sm text-slate-500">{isRegister ? "Zaten hesabın var mı?" : "Henüz hesabın yok mu?"} <Link className="font-bold text-indigo-700 hover:underline" to={isRegister ? "/login" : "/register"}>{isRegister ? "Giriş yap" : "Kayıt ol"}</Link></p>
      </div>
    </div>
  </div>;
}