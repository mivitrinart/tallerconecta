"use client";
/**
 * SessionActions: renderiza botones diferentes según si hay sesión activa.
 * Se usa en la página raíz estática para evitar getSession() en el servidor.
 */
import { useSession } from "@/components/shared/SessionGate";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SessionActionsProps {
  /** Cuando hay sesión */
  authedHref: string;
  authedLabel: string;
  /** Cuando no hay sesión */
  guestHref: string;
  guestLabel: string;
  guestSecondaryHref?: string;
  guestSecondaryLabel?: string;
  className?: string;
}

export function SessionActions({
  authedHref,
  authedLabel,
  guestHref,
  guestLabel,
  guestSecondaryHref,
  guestSecondaryLabel,
  className,
}: SessionActionsProps) {
  const { session } = useSession();
  const isAuthed = !!session;

  if (isAuthed) {
    return (
      <Link href={authedHref} className={`btn-action px-8! py-3! text-base! inline-flex items-center gap-2 shadow-glow ${className ?? ""}`}>
        {authedLabel} <ArrowRight className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <>
      <Link href={guestHref} className={`btn-action px-8! py-3! text-base! inline-flex items-center gap-2 shadow-glow ${className ?? ""}`}>
        {guestLabel} <ArrowRight className="h-4 w-4" />
      </Link>
      {guestSecondaryHref && guestSecondaryLabel && (
        <Link
          href={guestSecondaryHref}
          className={`btn-secondary px-8! py-3! text-base! border-white/20 bg-white/10 text-white hover:bg-white/20 ${className ?? ""}`}
        >
          {guestSecondaryLabel}
        </Link>
      )}
    </>
  );
}
