import { useState, type FormEvent } from "react";
import { ArrowLeft, Mail, Waves } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { api, ApiError } from "../../lib/api/client";

const emailSchema = z.string().trim().email("Geçerli bir e-posta adresi gir.").max(254);
export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Geçerli bir e-posta adresi gir."); return; }
    setLoading(true);
    try {
      const result = await api.forgotPassword(parsed.data);
      setMessage(result.message || "Bu e-posta adresi kayıtlıysa sıfırlama bağlantısı gönderildi.");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "İstek gönderilemedi. Lütfen tekrar dene.");
    } finally { setLoading(false); }
  }
  return <div className="auth-bg flex min-h-screen items-center justify-center px-4 py-10"><div className="w-full max-w-md">
    <Link to="/login" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16}/> Giriş sayfasına dön</Link>
    <section className="panel rounded-[28px] p-7 sm:p-9"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><Mail size={23}/></div>
      <Link to="/welcome" className="mt-5 inline-flex items-center gap-2 font-extrabold"><Waves size={19} className="text-indigo-600"/>language<span className="-ml-2 text-indigo-600">chat</span></Link>
      <p className="eyebrow mt-6">Hesap kurtarma</p><h1 className="mt-2 text-3xl font-black tracking-tight">Şifreni sıfırla</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">Hesabına bağlı e-posta adresini yaz. Adres kayıtlıysa sana şifre yenileme bağlantısı göndereceğiz.</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm leading-5 text-emerald-800">{message}</p>}
      <form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-semibold">E-posta adresi<input className="field mt-2" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="sen@ornek.com"/></label><button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? "Gönderiliyor..." : "Sıfırlama bağlantısı gönder"}</button></form>
      <p className="mt-6 text-center text-sm text-slate-500">Şifreni hatırladın mı? <Link className="font-bold text-indigo-700 hover:underline" to="/login">Giriş yap</Link></p>
    </section></div></div>;
}
