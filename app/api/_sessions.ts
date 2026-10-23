import { env } from "cloudflare:workers";
import { InputError } from "../../lib/validation";
import { hashSessionToken, newSessionToken, readSessionToken, SESSION_MAX_AGE, sessionCookie } from "../../lib/session";

type BrowserIdentity = {id:string;name:string};
type SessionResult = {user:BrowserIdentity | null;setCookie?:string};
export async function browserSession(request: Request, create = false): Promise<SessionResult> {
  if (!env.DB) throw new InputError("影像存储尚未连接，请稍后重试。",503);
  const now = Math.floor(Date.now()/1000);
  const token = readSessionToken(request.headers.get("Cookie"),request.url);
  if (token) {
    const tokenHash = await hashSessionToken(token);
    const row = await env.DB.prepare("SELECT user_id FROM browser_sessions WHERE token_hash = ? AND expires_at > ?").bind(tokenHash,now).first<{user_id:string}>();
    if (row) return {user:{id:row.user_id,name:`探索者 ${row.user_id.slice(0,6)}`}};
  }
  if (!create) return {user:null};
  const freshToken = newSessionToken(), userId = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO browser_sessions (token_hash,user_id,created_at,expires_at) VALUES (?,?,?,?)")
    .bind(await hashSessionToken(freshToken),userId,new Date().toISOString(),now+SESSION_MAX_AGE).run();
  return {user:{id:userId,name:`探索者 ${userId.slice(0,6)}`},setCookie:sessionCookie(freshToken,request.url)};
}
