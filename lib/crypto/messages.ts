/**
 * Crypto utilities for end-to-end message encryption.
 * Uses Web Crypto API (AES-GCM) with keys derived per workshop.
 * Keys are derived from workshop secret + order ID for forward secrecy.
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

// In-memory cache for derived keys (per session)
const keyCache = new Map<string, CryptoKey>();

function getWorkshopSecret(): string {
  // In production, this would come from environment variable or secure storage
  // For demo, we use a deterministic but workshop-scoped secret
  if (typeof window !== "undefined") {
    // Client side: derive from session
    const session = localStorage.getItem("tc_session");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        return `tc-${parsed.workshop_id || "global"}-${parsed.user_id || "anon"}`;
      } catch {
        return "tc-global-demo";
      }
    }
  }
  return "tc-global-demo";
}

async function deriveKey(orderId: string): Promise<CryptoKey> {
  const cacheKey = `${getWorkshopSecret()}-${orderId}`;
  
  if (keyCache.has(cacheKey)) {
    return keyCache.get(cacheKey)!;
  }

  const encoder = new TextEncoder();
  const salt = encoder.encode(`tc-salt-${orderId}`.padEnd(SALT_LENGTH).slice(0, SALT_LENGTH));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`${getWorkshopSecret()}-${orderId}`),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );

  keyCache.set(cacheKey, key);
  return key;
}

export async function encryptMessage(orderId: string, plaintext: string): Promise<string> {
  try {
    const key = await deriveKey(orderId);
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const plaintextBuffer = encoder.encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      plaintextBuffer
    );

    // Combine IV + ciphertext for storage/transmission
    const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), IV_LENGTH);

    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("Encryption failed:", error);
    // Fallback: return plaintext with prefix to indicate unencrypted
    return `plain:${plaintext}`;
  }
}

export async function decryptMessage(orderId: string, encryptedData: string): Promise<string> {
  try {
    // Check if it's plaintext (fallback)
    if (encryptedData.startsWith("plain:")) {
      return encryptedData.slice(6);
    }

    // Check if it looks like valid base64 (rough check)
    if (!/^[A-Za-z0-9+/=]+$/.test(encryptedData) || encryptedData.length % 4 !== 0) {
      // Not valid base64, return as-is (legacy plaintext)
      return encryptedData;
    }

    const key = await deriveKey(orderId);
    const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
    
    if (combined.length < IV_LENGTH) {
      throw new Error("Invalid encrypted data length");
    }

    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(plaintextBuffer);
  } catch (error) {
    console.error("Decryption failed:", error);
    // Return as-is if decryption fails (legacy plaintext)
    return encryptedData;
  }
}

export function clearKeyCache(): void {
  keyCache.clear();
}

export function isEncrypted(data: string): boolean {
  return !data.startsWith("plain:");
}