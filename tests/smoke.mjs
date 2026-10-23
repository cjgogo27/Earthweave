/** Local integration test. Run with the portable dev server and migrated D1 database.
 *   node tests/smoke.mjs
 *   $env:BASE_URL='http://127.0.0.1:5173'; node tests/smoke.mjs
 * This creates one tiny test image and removes only that image in finally.
 * Two anonymous browsers establish distinct server-issued sessions; no account is required.
 */
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { randomBytes } from "node:crypto";

const base = new URL(process.env.BASE_URL || "http://127.0.0.1:5173");
assert(["127.0.0.1","localhost","[::1]"].includes(base.hostname),"This integration test is restricted to loopback development servers.");
const origin = base.origin;
let cookie = "", secondCookie = "", createdId = null, secondId = null;
let passed = 0;

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(name, data) {
  const type = Buffer.from(name), size = Buffer.alloc(4), crc = Buffer.alloc(4);
  size.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([type,data])));
  return Buffer.concat([size,type,data,crc]);
}
function png() {
  const header = Buffer.alloc(13);header.writeUInt32BE(4,0);header.writeUInt32BE(2,4);header[8]=8;header[9]=2;
  const pixels=Buffer.concat([Buffer.from([0]),randomBytes(12),Buffer.from([0]),randomBytes(12)]);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",header),chunk("IDAT",deflateSync(pixels)),chunk("IEND",Buffer.alloc(0))]);
}
const fixture = png();
function uploadForm(overrides = {}, image = fixture, type = "image/png") {
  const form = new FormData();
  const fields = {title:`Smoke test ${Date.now()}`,description:"Temporary integration fixture. Safe to remove.",lat:"30.123",lng:"120.456",kind:"panorama",device:"Integration test",license:"CC0-1.0",rightsConfirmed:"true",...overrides};
  for (const [key,value] of Object.entries(fields)) form.set(key,value);
  form.set("file",new Blob([image],{type}),"smoke.png");
  return form;
}
async function request(path, {auth = true, ...options} = {}) {
  const headers = new Headers(options.headers || {});
  if (auth && cookie) headers.set("Cookie",cookie);
  return fetch(new URL(path,origin),{...options,headers,redirect:"manual",signal:AbortSignal.timeout(60_000)});
}
async function expectStatus(label,response,status) {
  const text = await response.text();
  assert.equal(response.status,status,`${label}: expected ${status}, received ${response.status}: ${text.slice(0,400)}`);
  passed++;console.log(`PASS ${label}`);
  if (response.headers.get("content-type")?.includes("application/json")) return JSON.parse(text);
  return text;
}

try {
  const initial = await request("/api/scenes",{auth:false});
  const initialCookie = initial.headers.get("set-cookie");
  assert(initialCookie?.includes("HttpOnly"));assert(initialCookie.includes("SameSite=Lax"));assert(initialCookie.includes("Max-Age=31536000"));
  assert(initial.headers.get("cache-control")?.includes("no-store"));assert(initial.headers.get("cache-control")?.includes("private"));
  cookie = initialCookie.split(";",1)[0];
  const before = await expectStatus("first browser receives anonymous identity",initial,200);
  assert(before.user?.id);assert.notEqual(before.user.id,"local_seedy");
  assert(Array.isArray(before.scenes));
  await expectStatus("upload without initialized session rejected",await request("/api/scenes",{method:"POST",auth:false,headers:{Origin:origin},body:uploadForm()}),401);
  const repeated = await request("/api/scenes");
  assert.equal(repeated.headers.get("set-cookie"),null,"Existing session must remain stable.");
  const signed = await expectStatus("browser identity persists across requests",repeated,200);
  assert.equal(signed.user.id,before.user.id);
  const secondResponse = await request("/api/scenes",{auth:false});
  secondCookie = secondResponse.headers.get("set-cookie").split(";",1)[0];
  const secondBrowser = await expectStatus("second browser receives distinct identity",secondResponse,200);
  assert.notEqual(secondBrowser.user.id,before.user.id);assert.notEqual(secondCookie,cookie);
  const cookieName=cookie.split("=",1)[0];
  await expectStatus("forged random cookie rejected",await request("/api/scenes",{method:"POST",auth:false,headers:{Origin:origin,Cookie:`${cookieName}=${"0".repeat(64)}`},body:uploadForm()}),401);
  await expectStatus("public author ID cannot impersonate session",await request("/api/scenes",{method:"POST",auth:false,headers:{Origin:origin,Cookie:`${cookieName}=${before.user.id}`},body:uploadForm()}),401);
  await expectStatus("ambiguous duplicate cookies rejected",await request("/api/scenes",{method:"POST",auth:false,headers:{Origin:origin,Cookie:`${cookie}; ${cookie}`},body:uploadForm()}),401);

  const importData = {url:"https://127.0.0.1/private",title:"Blocked import",description:"",lat:30,lng:120,kind:"photo",device:"Web",license:"CC0-1.0",rightsConfirmed:true,sourceAttribution:"Integration test"};
  await expectStatus("anonymous URL import rejected",await request("/api/import",{auth:false,method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify(importData)}),401);
  await expectStatus("cross-origin URL import blocked",await request("/api/import",{method:"POST",headers:{Origin:"https://other.invalid","Content-Type":"application/json"},body:JSON.stringify(importData)}),403);
  await expectStatus("URL import rejects private-network destination",await request("/api/import",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify(importData)}),400);
  await expectStatus("URL import requires original attribution before fetching",await request("/api/import",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({...importData,url:"https://dl.polyhaven.org/not-fetched.png",sourceAttribution:""})}),400);

  await expectStatus("cross-origin upload blocked",await request("/api/scenes",{method:"POST",headers:{Origin:"https://other.invalid"},body:uploadForm()}),403);
  await expectStatus("missing-Origin upload blocked",await request("/api/scenes",{method:"POST",body:uploadForm()}),403);
  await expectStatus("blank coordinate rejected",await request("/api/scenes",{method:"POST",headers:{Origin:origin},body:uploadForm({lat:""})}),400);
  await expectStatus("unconfirmed rights rejected",await request("/api/scenes",{method:"POST",headers:{Origin:origin},body:uploadForm({rightsConfirmed:"false"})}),400);
  await expectStatus("disguised SVG rejected",await request("/api/scenes",{method:"POST",headers:{Origin:origin},body:uploadForm({},Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))}),415);
  await expectStatus("file/type mismatch rejected",await request("/api/scenes",{method:"POST",headers:{Origin:origin},body:uploadForm({kind:"video"})}),400);

  await expectStatus("URL fallback requires attribution",await request("/api/scenes",{method:"POST",headers:{Origin:origin},body:uploadForm({sourceUrl:"https://example.org/smoke.png"})}),400);
  const uploaded = await expectStatus("real image uploaded",await request("/api/scenes",{method:"POST",headers:{Origin:origin},body:uploadForm({sourceUrl:"https://example.org/smoke.png",sourceAttribution:"Integration fixture generated locally"})}),201);
  createdId = uploaded.scene.id;
  assert.equal(uploaded.scene.authorId,signed.user.id);
  assert.equal(uploaded.scene.width,4);assert.equal(uploaded.scene.height,2);
  assert.equal(uploaded.scene.kind,"panorama");
  assert.equal(uploaded.scene.sourceUrl,"https://example.org/smoke.png");
  assert.equal(uploaded.scene.sourceAttribution,"Integration fixture generated locally");
  await expectStatus("second browser cannot delete first browser upload",await request(`/api/scenes/${createdId}`,{auth:false,method:"DELETE",headers:{Origin:origin,Cookie:secondCookie}}),403);
  const secondUpload=await expectStatus("same image can be contributed by second browser independently",await request("/api/scenes",{auth:false,method:"POST",headers:{Origin:origin,Cookie:secondCookie},body:uploadForm()}),201);
  secondId=secondUpload.scene.id;assert.equal(secondUpload.scene.authorId,secondBrowser.user.id);assert.notEqual(secondId,createdId);
  await expectStatus("first browser cannot delete second browser upload",await request(`/api/scenes/${secondId}`,{method:"DELETE",headers:{Origin:origin}}),403);

  const after = await expectStatus("uploaded image persists in listing",await request("/api/scenes"),200);
  assert(after.scenes.some(scene=>scene.id===createdId),"Persisted scene missing from subsequent list request.");
  const media = await request(uploaded.scene.url);
  assert.equal(media.status,200);assert.equal(media.headers.get("content-type"),"image/png");
  assert.equal(media.headers.get("x-content-type-options"),"nosniff");
  assert.deepEqual(Buffer.from(await media.arrayBuffer()),fixture,"Downloaded media must match uploaded bytes.");
  passed++;console.log("PASS original media bytes round-trip");

  const partial = await request(uploaded.scene.url,{headers:{Range:"bytes=8-19"}});
  assert.equal(partial.status,206);assert.equal(partial.headers.get("content-range"),`bytes 8-19/${fixture.length}`);
  assert.deepEqual(Buffer.from(await partial.arrayBuffer()),fixture.subarray(8,20));
  passed++;console.log("PASS byte ranges round-trip");
  const suffix = await request(uploaded.scene.url,{headers:{Range:"bytes=-8"}});
  assert.equal(suffix.status,206);assert.deepEqual(Buffer.from(await suffix.arrayBuffer()),fixture.subarray(fixture.length-8));
  passed++;console.log("PASS suffix byte range");
  const invalidRange = await request(uploaded.scene.url,{headers:{Range:"bytes=999999-"}});
  assert.equal(invalidRange.headers.get("content-range"),`bytes */${fixture.length}`);
  await expectStatus("unsatisfiable range rejected",invalidRange,416);
  const head = await request(uploaded.scene.url,{method:"HEAD"});
  assert.equal(head.status,200);assert.equal(Number(head.headers.get("content-length")),fixture.length);
  assert.equal((await head.arrayBuffer()).byteLength,0);
  passed++;console.log("PASS media HEAD metadata");

  const duplicate = await expectStatus("duplicate image detected",await request("/api/scenes",{method:"POST",headers:{Origin:origin},body:uploadForm()}),409);
  assert.equal(duplicate.existingId,createdId);
  const reportPath = `/api/scenes/${createdId}/report`;
  const reportBody = JSON.stringify({reason:"Integration fixture report; no actual content violation."});
  await expectStatus("anonymous report rejected",await request(reportPath,{auth:false,method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:reportBody}),401);
  await expectStatus("cross-origin report blocked",await request(reportPath,{method:"POST",headers:{Origin:"https://other.invalid","Content-Type":"application/json"},body:reportBody}),403);
  await expectStatus("missing-Origin report blocked",await request(reportPath,{method:"POST",headers:{"Content-Type":"application/json"},body:reportBody}),403);
  await expectStatus("oversized report rejected",await request(reportPath,{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({reason:"x".repeat(1001)})}),400);
  await expectStatus("report accepted",await request(reportPath,{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:reportBody}),200);
  await expectStatus("second browser may report another contributor",await request(reportPath,{auth:false,method:"POST",headers:{Origin:origin,Cookie:secondCookie,"Content-Type":"application/json"},body:reportBody}),200);
  await expectStatus("repeat report updates existing record",await request(reportPath,{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:reportBody}),200);
  await expectStatus("anonymous deletion rejected",await request(`/api/scenes/${createdId}`,{auth:false,method:"DELETE",headers:{Origin:origin}}),401);
  await expectStatus("cross-origin deletion blocked",await request(`/api/scenes/${createdId}`,{method:"DELETE",headers:{Origin:"https://other.invalid"}}),403);
  console.log(`Completed ${passed} assertions before cleanup, including two-browser ownership isolation.`);
} catch (error) {
  console.error("SMOKE FAILED:",error);
  process.exitCode=1;
} finally {
  if(secondId) {
    try {
      await expectStatus("second browser deletes only its created fixture",await request(`/api/scenes/${secondId}`,{auth:false,method:"DELETE",headers:{Origin:origin,Cookie:secondCookie}}),200);
      await expectStatus("second browser deleted media unavailable",await request(`/api/media/${secondId}`),404);
    } catch(error) {console.error(`Cleanup failed for second scene ${secondId}:`,error);process.exitCode=1;}
  }
  if (createdId) {
    try {
      await expectStatus("delete only created fixture",await request(`/api/scenes/${createdId}`,{method:"DELETE",headers:{Origin:origin}}),200);
      const list = await expectStatus("deleted fixture absent from list",await request("/api/scenes"),200);
      assert(!list.scenes.some(scene=>scene.id===createdId));
      await expectStatus("deleted media unavailable",await request(`/api/media/${createdId}`),404);
      await expectStatus("deleted scene cannot be reported",await request(`/api/scenes/${createdId}/report`,{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({reason:"test"})}),404);
    } catch (error) { console.error(`Cleanup failed for test scene ${createdId}:`,error);process.exitCode=1; }
  }
}
if (!process.exitCode) console.log(`SMOKE PASSED: ${passed} integration assertions; created fixture removed.`);
