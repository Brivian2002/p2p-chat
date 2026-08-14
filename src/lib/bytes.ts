// Browser + server safe byte helpers.

/** Convert a Uint8Array to a base64 string (browser-safe, chunked). */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...slice);
  }
  return btoaGlobal(binary);
}

/** Convert base64 to Uint8Array. */
export function base64ToBytes(b64: string): Uint8Array {
  const binary = atobGlobal(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Use global btoa/atob when available; fall back to Buffer (Node) for safety.
const btoaGlobal: (s: string) => string =
  typeof btoa === "function"
    ? btoa
    : (s) => Buffer.from(s, "binary").toString("base64");

const atobGlobal: (s: string) => string =
  typeof atob === "function"
    ? atob
    : (s) => Buffer.from(s, "base64").toString("binary");

/** Human-readable file size. */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const v = bytes / Math.pow(k, i);
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}
