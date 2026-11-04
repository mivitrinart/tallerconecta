import Link from "next/link";
import { Wrench, ArrowLeft } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(37,99,235,0.25),transparent_55%)]" />
      <header className="relative z-10 px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Volver al sitio
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 pb-16 sm:items-center">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
              <Wrench className="h-6 w-6" />
            </span>
            <p className="mt-3 text-xl font-bold text-white">
              Taller<span className="text-brand-400">Conecta</span>
            </p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
