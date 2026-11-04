/**
 * Hash de contraseñas para el modo demo/local de la aplicación.
 *
 * - Usa SHA-256 real (FIPS 180-4) implementada de forma síncrona, por lo que
 *   funciona en Cloudflare Workers, Node.js y el navegador sin dependencias.
 * - Aplica estiramiento de clave (iteraciones) para resistir fuerza bruta.
 * - Comparación en tiempo constante para resistir ataques de temporización.
 * - Formato almacenado: salt(hex, 16 bytes) + "." + hash(hex, 32 bytes).
 *
 * Nota: en producción la autenticación la maneja Supabase Auth; este módulo es
 * el respaldo para el modo demo/local.
 */

const encoder = new TextEncoder();
const ITERATIONS = 100000;
const SALT_BYTES = 16;
const KEY_LEN = 32;

/** SHA-256 (FIPS 180-4), síncrona. */
function sha256(data: Uint8Array): Uint8Array {
  const blockSize = 64;
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const k = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  const bitLen = data.length * 8;
  const paddedLen = Math.ceil((data.length + 1 + 8) / blockSize) * blockSize;
  const padded = new Uint8Array(paddedLen);
  padded.set(data);
  padded[data.length] = 0x80;
  new DataView(padded.buffer, padded.length - 8, 8).setUint32(4, bitLen, false);

  const words = new Uint32Array(paddedLen / 4);
  for (let i = 0; i < words.length; i++) {
    words[i] =
      (padded[i * 4] << 24) | (padded[i * 4 + 1] << 16) | (padded[i * 4 + 2] << 8) | padded[i * 4 + 3];
  }

  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  const bsig0 = (x: number) => rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
  const bsig1 = (x: number) => rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
  const ssig0 = (x: number) => rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
  const ssig1 = (x: number) => rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10);
  const choose = (e: number, f: number, g: number) => (e & f) ^ (~e & g);
  const maj = (a: number, b: number, c: number) => (a & b) ^ (a & c) ^ (b & c);

  for (let i = 0; i < words.length; i += 16) {
    const w = new Uint32Array(64);
    w.set(words.subarray(i, i + 16));
    for (let t = 16; t < 64; t++) {
      w[t] = (ssig1(w[t - 2]) + w[t - 7] + ssig0(w[t - 15]) + w[t - 16]) | 0;
    }
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
    for (let t = 0; t < 64; t++) {
      const t1 = (hh + bsig1(e) + choose(e, f, g) + k[t] + w[t]) | 0;
      const t2 = (bsig0(a) + maj(a, b, c)) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
  }

  const out = new Uint8Array(32);
  const view = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) view.setUint32(i * 4, h[i], false);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function saltToHex(salt: Uint8Array): string {
  return Array.from(salt, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
}

/** Deriva una clave estirando password + salt con SHA-256 iterado. */
function deriveKey(password: string, salt: Uint8Array, iterations: number): Uint8Array {
  const p = encoder.encode(password);
  let u = sha256(concat(p, salt));
  const out = new Uint8Array(u);
  for (let i = 1; i < iterations; i++) {
    u = sha256(concat(u, p));
    for (let j = 0; j < KEY_LEN; j++) out[j] ^= u[j];
  }
  return out.slice(0, KEY_LEN);
}

/** Comparación en tiempo constante de dos strings. */
function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function hashPassword(password: string): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = deriveKey(password, salt, ITERATIONS);
  return saltToHex(salt) + "." + Array.from(derived, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function comparePassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(".");
  if (!saltHex || !hashHex) return false;
  const salt = hexToBytes(saltHex);
  const derived = deriveKey(password, salt, ITERATIONS);
  const derivedHex = Array.from(derived, (b) => b.toString(16).padStart(2, "0")).join("");
  return constantTimeEq(derivedHex, hashHex);
}

export function isHashed(value: string | undefined): boolean {
  return Boolean(value && /^[0-9a-f]+\.[0-9a-f]+$/.test(value));
}
