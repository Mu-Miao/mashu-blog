import { readStorage, writeStorage } from "./storage";

const VISITOR_KEY = "mashu-blog-comment-visitor";
let currentVisitor: string | undefined;

export function visitorId(): string {
  if (currentVisitor) return currentVisitor;
  const saved = readStorage(VISITOR_KEY);
  if (saved) return (currentVisitor = saved);

  // randomUUID requires HTTPS; getRandomValues also works on ordinary HTTP.
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // This identifier groups likes, and is never used for authentication.
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  currentVisitor = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  writeStorage(VISITOR_KEY, currentVisitor);
  return currentVisitor;
}
