/**
 * Server-side crypto utilities for message encryption.
 * Uses Node.js crypto module (compatible with Web Crypto API).
 */

import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits

function getWorkshopSecret(workshopId: string): string {
  // In production, use environment variable
  const baseSecret = process.env.MESSAGE_ENCRYPTION_SECRET || "tc-global-demo-secret-change-in-production";
  return `${baseSecret}-${workshopId}`;
}

function deriveKey(workshopId: string, orderId: string): Buffer {
  const secret = getWorkshopSecret(workshopId);
  const salt = Buffer.from(`tc-salt-${orderId}`.padEnd(SALT_LENGTH).slice(0, SALT_LENGTH), "utf8");
  return crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, "sha256");
}

export function encryptMessageServer(workshopId: string, orderId: string, plaintext: string): string {
  try {
    const key = deriveKey(workshopId, orderId);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV + ciphertext + authTag
    const combined = Buffer.concat([iv, ciphertext, authTag]);
    return combined.toString("base64");
  } catch (error) {
    console.error("Server encryption failed:", error);
    return `plain:${plaintext}`;
  }
}

export function decryptMessageServer(workshopId: string, orderId: string, encryptedData: string): string {
  try {
    if (encryptedData.startsWith("plain:")) {
      return encryptedData.slice(6);
    }

    const key = deriveKey(workshopId, orderId);
    const combined = Buffer.from(encryptedData, "base64");
    
    if (combined.length < IV_LENGTH + 16) { // IV + authTag minimum
      throw new Error("Invalid encrypted data length");
    }

    const iv = combined.slice(0, IV_LENGTH);
    const authTag = combined.slice(-16);
    const ciphertext = combined.slice(IV_LENGTH, -16);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
    
    return plaintext.toString("utf8");
  } catch (error) {
    console.error("Server decryption failed:", error);
    return encryptedData;
  }
}

export function isEncrypted(data: string): boolean {
  return !data.startsWith("plain:");
}