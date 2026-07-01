import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes
} from "crypto";

const tokenVersion = "v1";

export function tokenEncryptionConfigured() {
  return Boolean(process.env.RELIX_TOKEN_ENCRYPTION_KEY);
}

export function encryptString(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return [
    tokenVersion,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url")
  ].join(":");
}

export function decryptString(value: string) {
  const [version, iv, tag, ciphertext] = value.split(":");

  if (version !== tokenVersion || !iv || !tag || !ciphertext) {
    throw new Error("Encrypted value is invalid.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "base64url")
  );

  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function encryptionKey() {
  const secret = process.env.RELIX_TOKEN_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("RELIX_TOKEN_ENCRYPTION_KEY is required for X OAuth.");
  }

  return createHash("sha256").update(secret).digest();
}
