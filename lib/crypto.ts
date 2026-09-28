function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64ToBuffer(base64: string): ArrayBuffer {
  let standardBase64 = base64.replace(/-/g, "+").replace(/_/g, "/");
  while (standardBase64.length % 4) standardBase64 += "=";
  const binary = atob(standardBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptSecret(plainText: string) {
  const cryptoKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoded
  );

  const rawKey = await window.crypto.subtle.exportKey("raw", cryptoKey);

  return {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv.buffer),
    key: bufferToBase64(rawKey),
  };
}

export async function decryptSecret(ciphertext: string, iv: string, key: string) {
  const rawKey = base64ToBuffer(key);
  const ivBuffer = base64ToBuffer(iv);
  const cipherBuffer = base64ToBuffer(ciphertext);

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
    cryptoKey,
    cipherBuffer
  );

  return new TextDecoder().decode(decrypted);
}