import test from "node:test";
import assert from "node:assert/strict";
// @ts-ignore Node executes this source directly.
import { hashSessionToken, newSessionToken, readSessionToken, SESSION_MAX_AGE, sessionCookie, sessionCookieName } from "../lib/session.ts";
test("browser tokens have 256 random bits and hashes never expose raw tokens",async()=>{
  const a=newSessionToken(),b=newSessionToken();
  assert.match(a,/^[0-9a-f]{64}$/);assert.match(b,/^[0-9a-f]{64}$/);assert.notEqual(a,b);
  const hash=await hashSessionToken(a);assert.match(hash,/^[0-9a-f]{64}$/);assert.notEqual(hash,a);assert.equal(hash,await hashSessionToken(a));
});
test("HTTPS cookies use secure host scope and persistent HttpOnly attributes",()=>{
  const token="a".repeat(64),url="https://earthweave.example/";
  const value=sessionCookie(token,url);
  assert.equal(sessionCookieName(url),"__Host-earthweave_session");
  assert(value.includes("; Secure"));assert(value.includes("; HttpOnly"));assert(value.includes("; SameSite=Lax"));assert(value.includes("; Path=/"));assert(value.includes(`; Max-Age=${SESSION_MAX_AGE}`));assert(!value.includes("Domain="));
  const local=sessionCookie(token,"http://127.0.0.1:5173/");assert(local.startsWith("earthweave_session="));assert(!local.includes("; Secure"));
});
test("cookie parsing rejects forged IDs, duplicates and malformed token encodings",()=>{
  const token="b".repeat(64),url="https://earthweave.example/",name=sessionCookieName(url);
  assert.equal(readSessionToken(`other=1; ${name}=${token}`,url),token);
  for(const cookie of [null,"",`${name}=public-user-id`,`${name}=${token}; ${name}=${token}`,`${name}=%61${token}`,`earthweave_session=${token}`])assert.equal(readSessionToken(cookie,url),null);
});
