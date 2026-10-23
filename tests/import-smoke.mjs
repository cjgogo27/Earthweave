/** Live network import test using the verified CC0 Poly Haven Venice Sunset asset.
 * Requires local preview + applied migrations: node tests/import-smoke.mjs
 * Creates one test scene and removes only that scene in finally.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { inspectMedia } from "../lib/validation.ts";

const origin = new URL(process.env.BASE_URL || "http://127.0.0.1:5173").origin;
assert(["127.0.0.1","localhost","[::1]"].includes(new URL(origin).hostname),"This test is restricted to loopback development servers.");
const source = "https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/venice_sunset.jpg";
const attribution = "Greg Zaal / Poly Haven";
let cookie = "", secondCookie = "", createdId = null, passed = 0;
function check(label,fn) {fn();passed++;console.log(`PASS ${label}`);}
async function request(path,{auth=true,...options}={}) {
  const headers = new Headers(options.headers || {});
  if (auth && cookie) headers.set("Cookie",cookie);
  return fetch(new URL(path,origin),{...options,headers,redirect:"manual",signal:AbortSignal.timeout(60_000)});
}
async function expect(response,status,label) {
  const text = await response.text();
  check(label,()=>assert.equal(response.status,status,`${response.status}: ${text.slice(0,500)}`));
  return response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text) : {error:text};
}
try {
  const initial = await request("/api/scenes",{auth:false});
  cookie = initial.headers.get("set-cookie")?.split(";",1)[0] || "";
  check("anonymous visitor receives management cookie",()=>{assert(cookie);assert(initial.headers.get("set-cookie").includes("HttpOnly"));assert(initial.headers.get("cache-control").includes("no-store"));});
  const before = await expect(initial,200,"anonymous pre-import listing");
  check("visitor has independent opaque identity",()=>{assert(before.user?.id);assert.notEqual(before.user.id,"local_seedy");});
  const secondResponse = await request("/api/scenes",{auth:false});
  secondCookie=secondResponse.headers.get("set-cookie").split(";",1)[0];
  const secondBrowser=await expect(secondResponse,200,"second browser initializes separately");
  check("two anonymous browsers have different identities",()=>assert.notEqual(before.user.id,secondBrowser.user.id));
  const importPayload={url:source,title:"Import smoke test",description:"Temporary live-import fixture; CC0 Venice Sunset by Greg Zaal / Poly Haven.",lat:45.4303,lng:12.3541,kind:"panorama",device:"Internet import test",license:"CC0-1.0",rightsConfirmed:true,sourceAttribution:attribution};
  await expect(await request("/api/import",{auth:false,method:"POST",headers:{Origin:origin,Cookie:`${cookie.split("=",1)[0]}=${"f".repeat(64)}`,"Content-Type":"application/json"},body:JSON.stringify(importPayload)}),401,"forged import session rejected before downloading");
  await expect(await request("/api/import",{method:"POST",headers:{Origin:"https://other.invalid","Content-Type":"application/json"},body:JSON.stringify(importPayload)}),403,"cross-origin import blocked");
  const result = await expect(await request("/api/import",{
    method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},
    body:JSON.stringify(importPayload),
  }),201,"live HTTPS import creates a scene");
  createdId = result.scene.id;
  await expect(await request(`/api/scenes/${createdId}`,{auth:false,method:"DELETE",headers:{Origin:origin,Cookie:secondCookie}}),403,"second browser cannot delete imported scene");
  check("import provenance preserved",()=>{assert.equal(result.scene.sourceUrl,source);assert.equal(result.scene.sourceAttribution,attribution);assert.equal(result.scene.authorId,before.user.id);});
  check("location and license preserved",()=>{assert.equal(result.scene.lat,45.4303);assert.equal(result.scene.lng,12.3541);assert.equal(result.scene.license,"CC0-1.0");assert.equal(result.scene.kind,"panorama");});
  check("panorama dimensions verified",()=>{assert(result.scene.width>0);assert.equal(result.scene.width/result.scene.height,2);});
  const after = await expect(await request("/api/scenes"),200,"post-import listing succeeds");
  check("import persisted with attribution",()=>{const row=after.scenes.find(scene=>scene.id===createdId);assert(row);assert.equal(row.sourceUrl,source);assert.equal(row.sourceAttribution,attribution);});
  const media = await request(result.scene.url);
  check("imported media served as JPEG",()=>{assert.equal(media.status,200);assert.equal(media.headers.get("content-type"),"image/jpeg");assert.equal(media.headers.get("x-content-type-options"),"nosniff");});
  const bytes = Buffer.from(await media.arrayBuffer());
  check("complete original media length",()=>{assert.equal(bytes.length,4_822_313);const length=media.headers.get("content-length");if(length!==null)assert.equal(Number(length),bytes.length);});
  const head = await request(result.scene.url,{method:"HEAD"});
  check("media HEAD advertises original length",()=>{assert.equal(head.status,200);assert.equal(Number(head.headers.get("content-length")),bytes.length);});
  const dimensions = inspectMedia(bytes.subarray(0,1024*1024));
  check("stored bytes match metadata dimensions",()=>{assert.equal(dimensions.width,result.scene.width);assert.equal(dimensions.height,result.scene.height);});
  const reference = await readFile(new URL("../public/media/venice.jpg",import.meta.url));
  if(reference.length===4_822_313) {
    check("download hash matches independently acquired original",()=>assert.equal(createHash("sha256").update(bytes).digest("hex"),createHash("sha256").update(reference).digest("hex")));
  } else console.log("SKIP reference hash: local demonstration asset has been optimized; original byte length and dimensions were verified.");
  console.log(JSON.stringify({source,bytes:bytes.length,width:dimensions.width,height:dimensions.height,sha256:createHash("sha256").update(bytes).digest("hex")}));
} catch(error) {
  console.error("IMPORT SMOKE FAILED:",error);process.exitCode=1;
} finally {
  if(createdId) {
    try {
      await expect(await request(`/api/scenes/${createdId}`,{method:"DELETE",headers:{Origin:origin}}),200,"delete only created import fixture");
      const final = await expect(await request("/api/scenes"),200,"final scene listing succeeds");
      check("test fixture absent after deletion",()=>assert(!final.scenes.some(scene=>scene.id===createdId)));
      await expect(await request(`/api/media/${createdId}`),404,"test media inaccessible after deletion");
    } catch(error) {console.error(`Cleanup failed for ${createdId}:`,error);process.exitCode=1;}
  }
}
if(!process.exitCode) console.log(`IMPORT SMOKE PASSED: ${passed} named checks; test fixture removed.`);
