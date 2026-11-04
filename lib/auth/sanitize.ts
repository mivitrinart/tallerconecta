/**
 * Elimina campos sensibles (contraseñas, hashes) antes de enviar objetos
 * User / CustomerAccount a componentes cliente. Nunca serializar secrets
 * en el payload HTML/RSC.
 */
import type { User, CustomerAccount } from "@/lib/database/types";

export function sanitizeUser(user: User): Omit<User, "password_demo" | "password_hash"> & { password_demo?: never; password_hash?: never } {
  const { password_demo, password_hash, ...rest } = user;
  return rest;
}

export function sanitizeAccount(
  account: CustomerAccount
): Omit<CustomerAccount, "password_demo" | "password_hash"> & { password_demo?: never; password_hash?: never } {
  const { password_demo, password_hash, ...rest } = account;
  return rest;
}
