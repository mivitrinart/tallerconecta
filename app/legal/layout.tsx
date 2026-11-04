import Link from "next/link";
import { Wrench, ArrowLeft, Scale, FileText, ShieldCheck } from "lucide-react";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Wrench className="h-4 w-4" />
            </span>
            <span className="font-bold text-slate-900">
              Taller<span className="text-brand-600">Conecta</span>
            </span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </div>
      </header>

      <nav className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 py-2 text-sm">
          <Link href="/legal/privacidad" className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-white">
            <Scale className="h-4 w-4" /> Privacidad (Ley 1581)
          </Link>
          <Link href="/legal/terminos" className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-white">
            <FileText className="h-4 w-4" /> Términos de uso
          </Link>
          <Link href="/legal/seguridad" className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-white">
            <ShieldCheck className="h-4 w-4" /> Seguridad
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <article className="prose-legal">{children}</article>
      </main>

      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        Taller Conecta · Documentos de referencia del MVP — revísalos con asesoría jurídica antes de operar comercialmente.
      </footer>
    </div>
  );
}
