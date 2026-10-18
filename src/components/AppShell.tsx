import { AlertCircle, BookOpen, CheckCircle2, LogOut, MailCheck, MessageCircle, Moon, Sun, UserRound, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../app/auth-provider";
import { api, ApiError } from "../lib/api/client";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [sendingVerification, setSendingVerification] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    try { return window.localStorage.getItem("languagechat-theme") === "dark"; }
    catch { return false; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    try { window.localStorage.setItem("languagechat-theme", isDark ? "dark" : "light"); } catch { /* storage may be disabled */ }
  }, [isDark]);
  async function logout() {
    await signOut();
    navigate("/welcome", { replace: true });
  }
  return <div className="app-shell min-h-screen bg-[#f7f8fc] text-slate-800">
    <header className="app-header sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <NavLink to="/rooms" className="flex items-center gap-3">
          <span className="brand-mark flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"><Waves size={22} /></span>
          <span><span className="block text-[15px] font-black uppercase tracking-[.12em] text-slate-900">LANGUAGE<span className="text-indigo-600">CHAT</span></span><span className="mt-0.5 block text-[10px] font-extrabold uppercase tracking-[.22em] text-slate-500">PRACTICE TOGETHER <span className="brand-dot">✦</span></span></span>
        </NavLink>
        <nav className="flex items-center gap-1 sm:gap-3">
          <NavLink to="/rooms" className={({ isActive }) => `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}><MessageCircle size={17}/><span className="hidden sm:inline">Odalar</span></NavLink>
          <NavLink to="/profile" className={({ isActive }) => `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}><UserRound size={17}/><span className="hidden sm:inline">Profil</span></NavLink>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setIsDark((current) => !current)}
            aria-label={isDark ? "Açık temaya geç" : "Koyu temaya geç"}
            title={isDark ? "Açık tema" : "Koyu tema"}
          >
            <span className="theme-toggle-icon" key={isDark ? "moon" : "sun"}>{isDark ? <Moon size={18} /> : <Sun size={18} />}</span>
          </button>
          <div className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" />
          <div className="hidden text-right sm:block"><p className="max-w-36 truncate text-base font-extrabold tracking-tight text-slate-900">{user?.username ?? "Kullanıcı"}</p><p className="text-[11px] font-medium text-slate-500">{user?.account_type === "guest" ? "Misafir hesap" : "Dil öğrencisi"}</p></div>
          <button className="btn-secondary !rounded-xl !p-2.5" onClick={() => void logout()} aria-label="Çıkış yap" title="Çıkış yap"><LogOut size={17}/></button>
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
      {user?.account_type === "registered" && !user.email_verified_at && <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
        <div className="flex items-start gap-3"><AlertCircle size={20} className="mt-0.5 shrink-0"/><div><p className="font-bold">E-posta adresini doğrula</p><p className="mt-1 text-sm leading-5">Sohbet odası oluşturabilmek için e-posta adresini doğrulaman gerekiyor. Gelen kutunu ve spam klasörünü kontrol et.</p>{verificationMessage && <p className="mt-2 flex items-center gap-1 text-sm font-semibold"><CheckCircle2 size={15}/>{verificationMessage}</p>}{verificationError && <p className="mt-2 text-sm font-semibold text-rose-700">{verificationError}</p>}</div></div>
        <button type="button" className="btn-primary shrink-0 !bg-amber-700 hover:!bg-amber-800" disabled={sendingVerification} onClick={async () => { setSendingVerification(true); setVerificationError(""); setVerificationMessage(""); try { const result = await api.resendVerification(); setVerificationMessage(result.message || "Doğrulama e-postası gönderildi."); } catch (error) { setVerificationError(error instanceof ApiError ? error.message : "E-posta gönderilemedi. Daha sonra tekrar dene."); } finally { setSendingVerification(false); } }}><MailCheck size={16}/>{sendingVerification ? "Gönderiliyor..." : "E-postayı yeniden gönder"}</button>
      </section>}
      {children}
    </main>
    <footer className="mx-auto max-w-7xl px-6 pb-6 text-center text-xs text-slate-400">Gerçek sohbetler. Daha iyi dil pratiği. <span className="ml-1">·</span> <BookOpen className="ml-1 inline" size={12}/></footer>
  </div>;
}