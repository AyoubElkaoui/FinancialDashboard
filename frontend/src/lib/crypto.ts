const ALGO = "AES-GCM";

function base64ToBuffer(b64: string): ArrayBuffer {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return bytes.buffer as ArrayBuffer;
}

function bufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function getKey(): Promise<CryptoKey> {
  const raw = process.env.FORMULA_ENCRYPTION_KEY;
  if (!raw) throw new Error("FORMULA_ENCRYPTION_KEY is not set");
  const keyBytes = base64ToBuffer(raw);
  return crypto.subtle.importKey("raw", keyBytes, { name: ALGO, length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv: iv as unknown as ArrayBuffer }, key, encoded);
  const payload = { iv: bufferToBase64(iv.buffer as ArrayBuffer), ct: bufferToBase64(ciphertext) };
  return JSON.stringify(payload);
}

export async function decrypt(encrypted: string): Promise<string> {
  const key = await getKey();
  const { iv, ct } = JSON.parse(encrypted) as { iv: string; ct: string };
  const ivBuf = base64ToBuffer(iv);
  const plaintext = await crypto.subtle.decrypt(
    { name: ALGO, iv: ivBuf },
    key,
    base64ToBuffer(ct)
  );
  return new TextDecoder().decode(plaintext);
}
