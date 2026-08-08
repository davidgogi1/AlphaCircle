// End-to-end encryption for messages/group chats.
//
// Scheme (mirrors how Proton Mail/Signal-style apps work):
//  - Each user has an RSA-OAEP keypair generated in their own browser.
//  - The private key is wrapped (AES-GCM) twice: once under a key derived
//    from the user's password, once under a key derived from a recovery
//    phrase - two independent locks on the same private key.
//  - Every message gets a random one-time AES-256 key. The message content
//    (and any attachment) is encrypted with that key, which is then
//    RSA-wrapped separately for every party who needs to read it.
//  - The server only ever stores ciphertext and RSA-wrapped session keys.
import { WORDLIST } from "./wordlist";

const PBKDF2_ITERATIONS = 250_000;
const RECOVERY_WORD_COUNT = 16; // ~8 bits/word * 16 = ~128 bits of entropy

// ---- base64 <-> binary helpers (Web Crypto works in ArrayBuffers) ----
export function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
export function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// ---- recovery phrase (unbiased selection via rejection sampling) ----
// Draws from a 32-bit range so this works correctly regardless of wordlist
// size (a single byte only covers 0-255, which silently breaks - and with
// this list's actual length of 266, infinite-loops - the moment a wordlist
// exceeds 256 entries).
export function generateRecoveryPhrase(): string {
  const words: string[] = [];
  const range = 0x100000000; // 2^32
  const limit = Math.floor(range / WORDLIST.length) * WORDLIST.length;
  while (words.length < RECOVERY_WORD_COUNT) {
    const val = crypto.getRandomValues(new Uint32Array(1))[0];
    if (val >= limit) continue; // reject to avoid modulo bias
    words.push(WORDLIST[val % WORDLIST.length]);
  }
  return words.join(" ");
}

// ---- RSA keypair (the user's real public/private key) ----
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"]
  ) as Promise<CryptoKeyPair>;
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  return bufToB64(await crypto.subtle.exportKey("spki", key));
}
export async function importPublicKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("spki", b64ToBuf(b64), { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]);
}
async function exportPrivateKeyRaw(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("pkcs8", key);
}
async function importPrivateKeyRaw(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey("pkcs8", raw, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["decrypt"]);
}

// Caches the already-unlocked private key in localStorage — the same place
// the login token lives — so any tab that's already authenticated (including
// ones opened after the fact) has it immediately too, with no re-unlock step.
// Cleared explicitly on logout, same lifetime as the login session itself.
export async function persistKey(key: CryptoKey): Promise<void> {
  localStorage.setItem("_pk", bufToB64(await exportPrivateKeyRaw(key)));
}
export async function loadPersistedKey(): Promise<CryptoKey | null> {
  const b64 = localStorage.getItem("_pk");
  if (!b64) return null;
  return importPrivateKeyRaw(b64ToBuf(b64));
}
export function clearPersistedKey(): void {
  localStorage.removeItem("_pk");
}

// ---- deriving a wrapping key from a password or recovery phrase ----
export function generateSalt(): string {
  return bufToB64(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

async function deriveWrappingKey(secret: string, saltB64: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64ToBuf(saltB64), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

interface WrappedBlob { ciphertext: string; iv: string; }

async function wrapWithSecret(privateKey: CryptoKey, secret: string, saltB64: string): Promise<WrappedBlob> {
  const wrappingKey = await deriveWrappingKey(secret, saltB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const raw = await exportPrivateKeyRaw(privateKey);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrappingKey, raw);
  return { ciphertext: bufToB64(ciphertext), iv: bufToB64(iv.buffer) };
}

async function unwrapWithSecret(blob: WrappedBlob, secret: string, saltB64: string): Promise<CryptoKey> {
  const wrappingKey = await deriveWrappingKey(secret, saltB64);
  const raw = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBuf(blob.iv) }, wrappingKey, b64ToBuf(blob.ciphertext));
  return importPrivateKeyRaw(raw);
}

export interface KeySetupBundle {
  publicKey: string;
  passwordSalt: string;
  encryptedPrivateKey: string;
  encryptedPrivateKeyIv: string;
  recoverySalt: string;
  encryptedPrivateKeyRecovery: string;
  encryptedPrivateKeyRecoveryIv: string;
  recoveryPhrase: string; // shown to the user once, never uploaded
  privateKey: CryptoKey; // usable immediately, never uploaded
}

// Generates a fresh keypair, wraps the private key under both the password
// and a freshly generated recovery phrase. Called once, at key-setup time.
export async function setupKeys(password: string): Promise<KeySetupBundle> {
  const { publicKey, privateKey } = await generateKeyPair();
  const recoveryPhrase = generateRecoveryPhrase();

  const passwordSalt = generateSalt();
  const recoverySalt = generateSalt();
  const pwWrapped = await wrapWithSecret(privateKey, password, passwordSalt);
  const recWrapped = await wrapWithSecret(privateKey, recoveryPhrase, recoverySalt);

  return {
    publicKey: await exportPublicKey(publicKey),
    passwordSalt,
    encryptedPrivateKey: pwWrapped.ciphertext,
    encryptedPrivateKeyIv: pwWrapped.iv,
    recoverySalt,
    encryptedPrivateKeyRecovery: recWrapped.ciphertext,
    encryptedPrivateKeyRecoveryIv: recWrapped.iv,
    recoveryPhrase,
    privateKey,
  };
}

export async function unlockWithPassword(
  password: string, salt: string, ciphertext: string, iv: string
): Promise<CryptoKey> {
  return unwrapWithSecret({ ciphertext, iv }, password, salt);
}

export async function unlockWithRecoveryPhrase(
  phrase: string, salt: string, ciphertext: string, iv: string
): Promise<CryptoKey> {
  return unwrapWithSecret({ ciphertext, iv }, phrase.trim().toLowerCase(), salt);
}

// Re-wraps an already-unlocked private key under a brand new password
// (used after recovery-phrase-based account recovery, to set a new password).
export async function rewrapForNewPassword(privateKey: CryptoKey, newPassword: string) {
  const passwordSalt = generateSalt();
  const wrapped = await wrapWithSecret(privateKey, newPassword, passwordSalt);
  return { passwordSalt, encryptedPrivateKey: wrapped.ciphertext, encryptedPrivateKeyIv: wrapped.iv };
}

// Generates a brand new recovery phrase and re-wraps the (unchanged) private
// key under it, invalidating the old phrase. Used from Settings.
export async function regenerateRecoveryPhrase(privateKey: CryptoKey) {
  const recoveryPhrase = generateRecoveryPhrase();
  const recoverySalt = generateSalt();
  const wrapped = await wrapWithSecret(privateKey, recoveryPhrase, recoverySalt);
  return {
    recoveryPhrase,
    recoverySalt,
    encryptedPrivateKeyRecovery: wrapped.ciphertext,
    encryptedPrivateKeyRecoveryIv: wrapped.iv,
  };
}

// ---- message content encryption (hybrid: one shared AES-GCM session key per
// message, RSA-wrapped once per recipient; the SAME session key encrypts
// both the text and any attachment, so there's only ever one key to unwrap) ----

export interface EncryptedEnvelope {
  ciphertext: string;      // AES-GCM encrypted content
  iv: string;              // AES-GCM iv
  keys: Record<string, string>; // userId -> RSA-OAEP-wrapped AES session key (base64)
}

// Generates one random session key and wraps it for every recipient. Reuse
// the returned sessionKey for both encryptContentWithKey and
// encryptFileWithKey so text + attachment share the same underlying key.
export async function generateSessionKeyForRecipients(
  recipients: { userId: string; publicKey: CryptoKey }[]
): Promise<{ sessionKey: CryptoKey; keys: Record<string, string> }> {
  const sessionKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const rawSessionKey = await crypto.subtle.exportKey("raw", sessionKey);
  const keys: Record<string, string> = {};
  for (const r of recipients) {
    const wrapped = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, r.publicKey, rawSessionKey);
    keys[r.userId] = bufToB64(wrapped);
  }
  return { sessionKey, keys };
}

export async function unwrapSessionKey(wrappedKeyB64: string, myPrivateKey: CryptoKey): Promise<CryptoKey> {
  const rawSessionKey = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, myPrivateKey, b64ToBuf(wrappedKeyB64));
  return crypto.subtle.importKey("raw", rawSessionKey, "AES-GCM", false, ["decrypt"]);
}

export async function encryptContentWithKey(plaintext: string, sessionKey: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, sessionKey, new TextEncoder().encode(plaintext));
  return { ciphertext: bufToB64(ciphertext), iv: bufToB64(iv.buffer) };
}

export async function decryptContentWithKey(ciphertext: string, iv: string, sessionKey: CryptoKey): Promise<string> {
  const plaintextBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBuf(iv) }, sessionKey, b64ToBuf(ciphertext));
  return new TextDecoder().decode(plaintextBuf);
}

// Convenience wrapper for the common text-only (no attachment) case.
export async function encryptForRecipients(
  plaintext: string,
  recipients: { userId: string; publicKey: CryptoKey }[]
): Promise<EncryptedEnvelope> {
  const { sessionKey, keys } = await generateSessionKeyForRecipients(recipients);
  const { ciphertext, iv } = await encryptContentWithKey(plaintext, sessionKey);
  return { ciphertext, iv, keys };
}

export async function decryptEnvelope(
  envelope: EncryptedEnvelope, myUserId: string, myPrivateKey: CryptoKey
): Promise<string> {
  const wrappedKey = envelope.keys[myUserId];
  if (!wrappedKey) throw new Error("No encrypted key for this user in envelope");
  const sessionKey = await unwrapSessionKey(wrappedKey, myPrivateKey);
  return decryptContentWithKey(envelope.ciphertext, envelope.iv, sessionKey);
}

// ---- file/attachment encryption (same session key as the message's text) ----

export interface EncryptedFileEnvelope {
  ciphertext: string; // AES-GCM encrypted file bytes
  iv: string;
  meta: string; // AES-GCM encrypted {name, mimetype} JSON, same session key, different iv
  metaIv: string;
}

export async function encryptFileWithKey(file: File, sessionKey: CryptoKey): Promise<EncryptedFileEnvelope> {
  const fileIv = crypto.getRandomValues(new Uint8Array(12));
  const metaIv = crypto.getRandomValues(new Uint8Array(12));

  const fileBytes = await file.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: fileIv }, sessionKey, fileBytes);
  const metaJson = new TextEncoder().encode(JSON.stringify({ name: file.name, mimetype: file.type }));
  const encryptedMeta = await crypto.subtle.encrypt({ name: "AES-GCM", iv: metaIv }, sessionKey, metaJson);

  return { ciphertext: bufToB64(ciphertext), iv: bufToB64(fileIv.buffer), meta: bufToB64(encryptedMeta), metaIv: bufToB64(metaIv.buffer) };
}

export async function decryptFileWithKey(
  envelope: EncryptedFileEnvelope, sessionKey: CryptoKey
): Promise<{ blob: Blob; name: string; mimetype: string }> {
  const fileBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBuf(envelope.iv) }, sessionKey, b64ToBuf(envelope.ciphertext));
  const metaBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBuf(envelope.metaIv) }, sessionKey, b64ToBuf(envelope.meta));
  const meta = JSON.parse(new TextDecoder().decode(metaBuf));

  return { blob: new Blob([fileBuf], { type: meta.mimetype }), name: meta.name, mimetype: meta.mimetype };
}
