import test from "node:test";
import assert from "node:assert/strict";
// Node runs the source directly; the application imports extensionless modules.
// @ts-ignore TypeScript's no-emit app config does not enable TS extension imports.
import { coordinate, inspectMedia, validateMediaKind, parseRange, validateFields, InputError, importUrl, sourceUrl } from "../lib/validation.ts";

test("coordinates accept legitimate signed bounds and reject coercion/empty/nonfinite values",() => {
  assert.equal(coordinate("-90","lat"),-90);
  assert.equal(coordinate("180","lng"),180);
  assert.equal(coordinate(" .5 ","lat"),0.5);
  for (const value of [""," ","NaN","Infinity","0x10","1e2",null,91,-91]) assert.throws(()=>coordinate(value,"lat"),InputError);
  assert.throws(()=>coordinate("90.01","lat"),InputError);
  assert.throws(()=>coordinate("-180.1","lng"),InputError);
});
test("range parsing serves browser video requests and rejects malformed ranges",() => {
  assert.equal(parseRange(null,100),null);
  assert.deepEqual(parseRange("bytes=0-9",100),{offset:0,length:10});
  assert.deepEqual(parseRange("bytes=90-",100),{offset:90,length:10});
  assert.deepEqual(parseRange("bytes=-10",100),{offset:90,length:10});
  assert.deepEqual(parseRange("bytes=90-999",100),{offset:90,length:10});
  assert.deepEqual(parseRange("bytes=-1000",100),{offset:0,length:100});
  for (const value of ["bytes=-","bytes=-0","bytes=20-10","bytes=100-","bytes=0-1,2-3","bytes=0-NaN","items=0-1"]) assert.throws(()=>parseRange(value,100),error=>error instanceof InputError && error.status===416);
});
test("image magic and dimensions are validated independent of declared MIME or filename",() => {
  const png = new Uint8Array(33);
  png.set([137,80,78,71,13,10,26,10]);png.set([73,72,68,82],12);
  const view = new DataView(png.buffer);view.setUint32(16,4096);view.setUint32(20,2048);
  const media = inspectMedia(png);
  assert.equal(media.mime,"image/png");assert.equal(media.width,4096);assert.equal(media.height,2048);
  assert.doesNotThrow(()=>validateMediaKind("panorama",media));
  assert.throws(()=>validateMediaKind("video",media));
  assert.throws(()=>validateMediaKind("panorama",{...media,width:3000}));
  assert.throws(()=>validateMediaKind("photo",{...media,width:20000}));
  assert.throws(()=>inspectMedia(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>')));
  assert.throws(()=>inspectMedia(new Uint8Array([0xff,0xd8,0xff,0xd9])));
});
test("MP4 recognition excludes AVIF/HEIC ftyp image containers",() => {
  const ftyp = new Uint8Array(20), view = new DataView(ftyp.buffer); view.setUint32(0,20);
  ftyp.set(new TextEncoder().encode("ftypisom"),4);ftyp.set(new TextEncoder().encode("mp42"),16);
  assert.equal(inspectMedia(ftyp).mime,"video/mp4");
  ftyp.set(new TextEncoder().encode("avif"),8);ftyp.set(new TextEncoder().encode("mif1"),16);
  assert.throws(()=>inspectMedia(ftyp));
});
test("upload metadata requires consent, allowed license, coordinates, and meaningful title",() => {
  const form = new FormData();
  const fields={title:"海边",description:"",lat:"30",lng:"120",kind:"photo",device:"手机",license:"CC-BY-4.0",rightsConfirmed:"true"};
  for(const [key,value] of Object.entries(fields)) form.set(key,value);
  assert.equal(validateFields(form).title,"海边");
  form.set("rightsConfirmed","false");assert.throws(()=>validateFields(form));form.set("rightsConfirmed","true");
  form.set("license","unknown");assert.throws(()=>validateFields(form));form.set("license","CC0-1.0");
  form.set("title","   ");assert.throws(()=>validateFields(form));form.set("title","海边");
  form.set("lat","");assert.throws(()=>validateFields(form));
});
test("network imports require exact allowlisted HTTPS media hosts at every hop",() => {
  assert.equal(importUrl("https://dl.polyhaven.org/file/test.jpg").hostname,"dl.polyhaven.org");
  assert.equal(importUrl("https://upload.wikimedia.org:443/a.jpg#fragment").href,"https://upload.wikimedia.org/a.jpg");
  assert.equal(importUrl("https://IMAGES.UNSPLASH.COM/photo-1").hostname,"images.unsplash.com");
  assert.equal(importUrl("https://videos.pexels.com/video.mp4").hostname,"videos.pexels.com");
  for (const value of [
    "http://dl.polyhaven.org/a.jpg","https://dl.polyhaven.org:444/a.jpg",
    "https://user:pass@dl.polyhaven.org/a.jpg","https://dl.polyhaven.org.evil.test/a.jpg",
    "https://evil.dl.polyhaven.org/a.jpg","https://dl.polyhaven.org./a.jpg",
    "https://127.0.0.1/a.jpg","https://2130706433/a.jpg","https://0x7f000001/a.jpg",
    "https://[::1]/a.jpg","https://169.254.169.254/latest/meta-data",
    "https://localhost/a.jpg","https://10.0.0.1/a.jpg","file:///etc/passwd",
    "data:image/png;base64,AAAA","https://example.com/a.jpg","//upload.wikimedia.org/a.jpg","",
  ]) assert.throws(()=>importUrl(value),InputError,value);
  assert.throws(()=>importUrl(new URL("https://127.0.0.1/redirect-target",importUrl("https://dl.polyhaven.org/a.jpg")).href));
});
test("source provenance permits other HTTPS sources without allowing credential links or executable schemes",() => {
  assert.equal(sourceUrl(null),null);
  assert.equal(sourceUrl("https://example.org/image.png#view"),"https://example.org/image.png");
  for (const value of ["javascript:alert(1)","http://example.org/a.jpg","https://name:secret@example.org/a.jpg","https://example.org:8443/a.jpg"]) assert.throws(()=>sourceUrl(value));
});
