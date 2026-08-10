import crypto from "crypto";

/**
 * AES-256-GCM encryption for integration secrets (API keys, tokens) stored
 * in the database via the Settings screen. Keys are never returned to the
 * frontend in plaintext once saved — only a masked preview.
 *
 * SETTINGS_ENCRYPTION_KEY must be a 32-byte value. Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * and set it as an env var on Railway (separate from DATABASE_URL/JWT_SECRET).
 * Losing this key means losing access to any stored secrets — they'd need
 * to be re-entered via Settings, not just re-deployed.
 */
function getKey(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY is not set. Generate one with: " +
      "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\" " +
      "and add it to your .env / Railway variables."
    );
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error("SETTINGS_ENCRYPTION_KEY must decode to exactly 32 bytes (a 64-char hex string).");
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Stored as iv:authTag:ciphertext, all hex — one column, easy to parse back apart.
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptSecret(stored: string): string {
  const [ivHex, authTagHex, dataHex] = stored.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}

export function maskPreview(plaintext: string): string {
  if (plaintext.length <= 4) return "••••";
  return `••••${plaintext.slice(-4)}`;
}
