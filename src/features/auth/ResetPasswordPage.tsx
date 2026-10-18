import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, KeyRound, Waves } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { api, ApiError } from "../../lib/api/client";
import { useAuth } from "../../app/auth-provider";

const passwordSchema = z.string().min(12, "Şifre en az 12 karakter olmalı.").max(128, "Şifre en fazla 128 karakter olabilir.");
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (window.location.search.includes("token=")) window.history.replaceState(window.history.state, "", window.location.pathname); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (!/^[a-f0-9]{64}$/i.test(token)) { setError("Sıfırlama bağlantısı eksik veya hatalı. E-postandaki bağlantıyı yeniden aç."); return; }
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Şifre kurallara uymuyor."); return; }
    if (password !== confirmPassword) { setError("Şifreler eşleşmiyor."); return; }
    setLoading(true);
    try { const result = await api.resetPassword({ token, password }); try { await signOut(); } catch { /* Backend invalidates all sessions; clear any stale local session too. */ } setSuccess(result.message || "Şifren güncellendi. Yeni şifrenle giriş yapabilirsin."); setPassword(""); setConfirmPassword(""); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Şifre sıfırlanamadı. Lütfen yeniden dene."); }
    finally { setLoading(false); }
  }
  return <div className="auth-bg flex min-h-screen items-center justify-center px-4 py-10"><div className="w-full max-w-md">
    <Link to="/login" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16}/> Giriş sayfasına dön</Link>
    <section className="panel rounded-[28px] p-7 sm:p-9"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><KeyRound size={23}/></div>
      <Link to="/welcome" className="mt-5 inline-flex items-center gap-2 font-extrabold"><Waves size={19} className="text-indigo-600"/>language<span className="-ml-2 text-indigo-600">chat</span></Link>
      <p className="eyebrow mt-6">Hesap güvenliği</p><h1 className="mt-2 text-3xl font-black tracking-tight">Yeni şifre belirle</h1><p className="mt-3 text-sm leading-6 text-slate-500">En az 12 karakterlik yeni bir şifre seç.</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}{success && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm leading-5 text-emerald-800">{success}</p>}
      {!success && <form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-semibold">Yeni şifre<input className="field mt-2" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="En az 12 karakter"/></label><label className="block text-sm font-semibold">Yeni şifre (tekrar)<input className="field mt-2" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Şifreni tekrar yaz"/></label><button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? "Güncelleniyor..." : "Şifremi güncelle"}</button></form>}
      {success && <button className="btn-primary mt-6 w-full" type="button" onClick={() => navigate("/login", { replace: true })}>Giriş yap</button>}
    </section></div></div>;
}
