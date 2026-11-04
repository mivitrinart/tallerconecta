"use client";
import Link from "next/link";
import { useState } from "react";
import TallerRegistroForm from "@/components/auth/TallerRegistroForm";
import CuentaRegistroForm from "@/components/auth/CuentaRegistroForm";

export const dynamic = "force-dynamic";

export default function RegistroPage() {
  const [rol, setRol] = useState<"taller" | "cliente" | null>(null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      {rol ? (
        rol === "taller" ? (
          <TallerRegistroForm />
        ) : (
          <CuentaRegistroForm />
        )
      ) : (
        <div className="card p-10 mx-auto max-w-md text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Regístrate</h1>
          <p className="mt-2 text-slate-500">
            Elige quién eres para crear tu cuenta.
          </p>

          <div className="mt-10 flex flex-col gap-3">
              <button
                onClick={() => setRol("taller")}
                className="btn-primary px-6! py-3! text-base! w-full"
              >
                Registrar taller
              </button>
            <button
              onClick={() => setRol("cliente")}
              className="btn px-6! py-3! text-base! border border-slate-300 bg-white text-slate-900 w-full hover:bg-slate-50"
            >
              Cliente
            </button>
          </div>

          <p className="mt-10 text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
