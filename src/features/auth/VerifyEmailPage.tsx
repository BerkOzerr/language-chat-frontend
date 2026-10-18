import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, MailCheck, Waves } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError, sessionStore } from "../../lib/api/client";
import { useAuth } from "../../app/auth-provider";

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const { token: sessionToken, refreshUser } = useAuth();
  const [verificationToken] = useState(() => new URLSearchParams(window.location.search).get("token") ?? "");
  const [status, setStatus] = useState<"ready" | "loading" | "success" | "error">("ready");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Remove the one-time token from the address bar while keeping it in component memory.
    if (window.location.search.includes("token=")) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, []);

  async function verify() {
    if (!/^[a-f0-9]{64}$/i.test(verificationToken)) {
      setStatus("error");
      setMessage("Doğrulama bağlantısı eksik veya hatalı. E-postandaki bağlantıyı yeniden aç.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const result = await api.verifyEmail(verificationToken);
      setStatus("success");
      setMessage(result.message || "E-posta adresin doğrulandı.");
      if (sessionToken) {
        try { await refreshUser(); } catch { /* Verification succeeded; profile refresh can be retried later. */ }
      }
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof ApiError ? error.message : "Doğrulama sırasında bağlantı hatası oluştu.");
    }
  }

  return <div className="auth-bg flex min-h-screen items-center justify-center px-4 py-10">
    <div className="w-full max-w-md">
      <Link to="/welcome" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16}/> Ana sayfaya dön</Link>
      <section className="panel rounded-[28px] p-7 text-center sm:p-9">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"}`}>{status === "success" ? <CheckCircle2 size={27}/> : <MailCheck size={27}/>}</div>
        <Link to="/welcome" className="mt-5 inline-flex items-center gap-2 font-extrabold"><Waves size={19} className="text-indigo-600"/>language<span className="-ml-2 text-indigo-600">chat</span></Link>
        <p className="eyebrow mt-6">Hesap güvenliği</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">{status === "success" ? "E-posta doğrulandı" : "E-posta adresini doğrula"}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{status === "success" ? "Hesabın hazır. Artık e-posta doğrulaması gerektiren özellikleri kullanabilirsin." : "Devam etmek için e-postana gönderilen tek kullanımlık doğrulama bağlantısını onayla."}</p>
        {message && <p role="status" aria-live="polite" className={`mt-5 rounded-xl p-3 text-sm leading-5 ${status === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{message}</p>}
        {status !== "success" ? <button type="button" className="btn-primary mt-6 w-full" onClick={() => void verify()} disabled={status === "loading"}>{status === "loading" ? "Doğrulanıyor..." : "E-postamı doğrula"}</button> : <button type="button" className="btn-primary mt-6 w-full" onClick={() => navigate(sessionStore.getToken() ? "/rooms" : "/login", { replace: true })}>{sessionStore.getToken() ? "Sohbet odalarına dön" : "Giriş yap"}</button>}
        {status === "error" && <p className="mt-4 text-sm text-slate-500">Bağlantının süresi dolmuş olabilir. Giriş yaptıktan sonra doğrulama e-postasını yeniden isteyebilirsin.</p>}
        <p className="mt-6 text-sm text-slate-500">Sorun mu yaşıyorsun? <Link className="font-bold text-indigo-700 hover:underline" to="/login">Giriş sayfasına dön</Link></p>
      </section>
    </div>
  </div>;
}
