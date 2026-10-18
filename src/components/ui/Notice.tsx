import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";
export function Loading({ label = "Yükleniyor..." }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18}/>{label}</div>;
}
export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle size={18} className="mt-0.5 shrink-0"/><div className="flex-1">{message}{onRetry && <button className="ml-3 font-bold underline" onClick={onRetry}>Tekrar dene</button>}</div></div>;
}
export function SuccessNotice({ message }: { message: string }) {
  return <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={17}/>{message}</div>;
}