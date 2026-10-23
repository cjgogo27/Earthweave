export const SESSION_MAX_AGE = 365 * 24 * 60 * 60;
export function sessionCookieName(url: string): string {
  return new URL(url).protocol === "https:" ? "__Host-earthweave_session" : "earthweave_session";
}
export function readSessionToken(cookie: string | null, url: string): string | null {
  const name = sessionCookieName(url);
  const values = (cookie || "").split(";").map(part => part.trim()).filter(part => part.startsWith(`${name}=`)).map(part => part.slice(name.length + 1));
  // Duplicate cookies are ambiguous; do not select an attacker-controlled value.
  return values.length === 1 && /^[0-9a-f]{64}$/.test(values[0]) ? values[0] : null;
}
export function newSessionToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)),byte => byte.toString(16).padStart(2,"0")).join("");
}
export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest),byte => byte.toString(16).padStart(2,"0")).join("");
}
export function sessionCookie(token: string, url: string): string {
  if (!/^[0-9a-f]{64}$/.test(token)) throw new Error("Invalid session token");
  return `${sessionCookieName(url)}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; SameSite=Lax${new URL(url).protocol === "https:" ? "; Secure" : ""}`;
}
