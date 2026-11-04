/**
 * Gestión de códigos de verificación por correo electrónico (D1).
 */

import type { Database } from "@/lib/database/types";
import { query, mutate, nowISO, uid } from "@/lib/database/index";
import { sendEmail, generateVerificationCode, verificationCodeEmail } from "@/lib/email/service";

export type VerificationPurpose = "register" | "reset_password";

export async function sendVerificationCode({
  correo,
  nombre,
  purpose,
}: {
  correo: string;
  nombre: string;
  purpose: VerificationPurpose;
}): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  correo = correo.toLowerCase();
  const ahora = Date.now();

  if (
    query((db) =>
      db.email_verification_codes.find(
        (c) =>
          c.correo === correo &&
          c.purpose === purpose &&
          c.estado === "pendiente" &&
          parseInt(c.expires_at) > ahora
      )
    )
  ) {
    return { ok: false, error: "Ya enviamos un código. Intenta de nuevo más tarde." };
  }

  const code = generateVerificationCode();
  const expiresAt = ahora + 10 * 60 * 1000;
  const id = uid("vcode");

  mutate((db) =>
    db.email_verification_codes.push({
      id,
      correo,
      nombre,
      code,
      purpose,
      estado: "pendiente",
      created_at: String(ahora),
      expires_at: String(expiresAt),
      used_at: null,
      attempts: 0,
    })
  );

  const email = verificationCodeEmail(nombre, code, purpose);
  email.to = correo;
  const resultado = await sendEmail(email);

  if (!resultado.ok) {
    mutate((db) => {
      const c = db.email_verification_codes.find((x) => x.id === id);
      if (c) c.estado = "fallido";
    });
    return { ok: false, error: "No se pudo enviar el correo electrónico. Intenta de nuevo más tarde." };
  }

  return { ok: true, messageId: resultado.messageId };
}

export function verifyCode({
  correo,
  code,
  purpose,
}: {
  correo: string;
  code: string;
  purpose: VerificationPurpose;
}): { ok: boolean; email?: string; nombre?: string; error?: string } {
  correo = correo.toLowerCase();
  const ahora = Date.now();

  const codigo = query((db) =>
    db.email_verification_codes.find(
      (c) =>
        c.correo === correo &&
        c.code === code &&
        c.purpose === purpose &&
        c.estado === "pendiente" &&
        parseInt(c.expires_at) > ahora
    )
  );

  if (!codigo) {
    mutate((db) => {
      const c = db.email_verification_codes.find(
        (x) => x.correo === correo && x.purpose === purpose && x.estado === "pendiente"
      );
      if (c) {
        c.attempts = (c.attempts || 0) + 1;
        if (c.attempts >= 3) c.estado = "bloqueado";
      }
    });
    return { ok: false, error: "Código inválido, expirado o ya fue utilizado." };
  }

  mutate((db) => {
    const c = db.email_verification_codes.find((x) => x.id === codigo.id);
    if (c) {
      c.estado = "usado";
      c.used_at = String(ahora);
    }
  });

  return { ok: true, email: codigo.correo, nombre: codigo.nombre };
}

export function markEmailVerified(correo: string): void {
  mutate((db) => {
    const user = db.users.find((u) => u.correo === correo.toLowerCase());
    if (user) {
      user.email_verified = true;
      user.email_verified_at = nowISO();
    }
  });
}

export function isEmailVerified(correo: string): boolean {
  return query(
    (db) =>
      !!db.users.find((u) => u.correo === correo.toLowerCase())?.email_verified
  );
}

export function cleanupExpiredCodes(): number {
  const ahora = Date.now();
  let eliminados = 0;
  mutate((db) => {
    const antes = db.email_verification_codes.length;
    db.email_verification_codes = db.email_verification_codes.filter((c) => {
      const expirado = c.expires_at && parseInt(c.expires_at) < ahora;
      const usado = c.estado === "usado" || c.estado === "bloqueado";
      const muyAntiguo = c.created_at && parseInt(c.created_at) < ahora - 24 * 60 * 60 * 1000;
      if (expirado || usado || muyAntiguo) {
        eliminados++;
        return false;
      }
      return true;
    });
  });
  return eliminados;
}
