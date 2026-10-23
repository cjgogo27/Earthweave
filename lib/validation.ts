export const MAX_FILE_BYTES = 32 * 1024 * 1024;
export const MAX_BODY_BYTES = MAX_FILE_BYTES + 64 * 1024;
export const IMPORT_HOSTS = ["dl.polyhaven.org", "upload.wikimedia.org", "images.unsplash.com", "videos.pexels.com"] as const;
export class InputError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.name = "InputError"; this.status = status; }
}
/** Provenance is a link only. Network imports separately enforce the strict host allowlist. */
export function sourceUrl(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) throw new InputError("来源链接格式不正确。");
  let parsed: URL;
  try { parsed = new URL(value.trim()); } catch { throw new InputError("请输入完整的 HTTPS 影像直链。"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) throw new InputError("来源链接需要使用 HTTPS 默认端口，且不能包含用户名或密码。");
  parsed.hash = "";
  return parsed.href;
}
export function importUrl(value: unknown): URL {
  const canonical = sourceUrl(value);
  if (!canonical) throw new InputError("请输入影像直链。");
  const parsed = new URL(canonical);
  if (!(IMPORT_HOSTS as readonly string[]).includes(parsed.hostname)) throw new InputError("服务器目前支持 Poly Haven、Wikimedia、Unsplash 和 Pexels 的指定媒体域名直链。其他来源可尝试浏览器导入，或下载后上传。",400);
  return parsed;
}
export function textField(value: unknown, name: string, max: number, required = true): string {
  if (typeof value !== "string") {
    if (!required && value == null) return "";
    throw new InputError(`${name}格式不正确。`);
  }
  const result = value.trim();
  if (required && !result) throw new InputError(`请填写${name}。`);
  if (result.length > max) throw new InputError(`${name}不能超过 ${max} 个字符。`);
  return result;
}
export function coordinate(value: unknown, axis: "lat" | "lng"): number {
  if (typeof value !== "string" || !value.trim() || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) throw new InputError("请填写有效的经纬度。");
  const parsed = Number(value), limit = axis === "lat" ? 90 : 180;
  if (!Number.isFinite(parsed) || Math.abs(parsed) > limit) throw new InputError(axis === "lat" ? "纬度应在 -90 到 90 之间。" : "经度应在 -180 到 180 之间。");
  return parsed;
}
export function validateFields(form: FormData) {
  const kind = textField(form.get("kind"), "影像类型", 12);
  if (!["photo", "panorama", "video", "video360"].includes(kind)) throw new InputError("不支持的影像类型。");
  const license = textField(form.get("license"), "授权方式", 20);
  if (!["CC-BY-4.0", "CC0-1.0"].includes(license)) throw new InputError("请选择支持的授权方式。");
  if (form.get("rightsConfirmed") !== "true") throw new InputError("请确认你有权上传并授权这些影像。");
  return {
    title: textField(form.get("title"), "地点名称", 100),
    description: textField(form.get("description"), "描述", 1500, false),
    lat: coordinate(form.get("lat"), "lat"), lng: coordinate(form.get("lng"), "lng"),
    device: textField(form.get("device"), "采集设备", 80),
    kind: kind as "photo" | "panorama" | "video" | "video360",
    license: license as "CC-BY-4.0" | "CC0-1.0",
  };
}
function ascii(bytes: Uint8Array, offset: number, count: number) { return String.fromCharCode(...bytes.slice(offset, offset + count)); }
export function inspectMedia(bytes: Uint8Array): { mime: string; extension: string; width?: number; height?: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && bytes.slice(0,8).every((b,i) => b === [137,80,78,71,13,10,26,10][i]) && ascii(bytes,12,4) === "IHDR") {
    return { mime: "image/png", extension: "png", width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    let at = 2;
    while (at + 8 < bytes.length) {
      if (bytes[at] !== 0xff) break;
      while (bytes[at] === 0xff) at++;
      const marker = bytes[at++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
      if (at + 2 > bytes.length) break;
      const length = view.getUint16(at);
      if (length < 2 || at + length > bytes.length) break;
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && length >= 8) {
        return { mime: "image/jpeg", extension: "jpg", height: view.getUint16(at + 3), width: view.getUint16(at + 5) };
      }
      at += length;
    }
    throw new InputError("无法读取 JPEG 尺寸，请重新导出图片。", 415);
  }
  if (bytes.length >= 30 && ascii(bytes,0,4) === "RIFF" && ascii(bytes,8,4) === "WEBP") {
    const format = ascii(bytes,12,4);
    if (format === "VP8X") return { mime: "image/webp", extension:"webp", width: 1 + bytes[24] + (bytes[25]<<8) + (bytes[26]<<16), height: 1 + bytes[27] + (bytes[28]<<8) + (bytes[29]<<16) };
    if (format === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return { mime: "image/webp", extension:"webp", width: view.getUint16(26,true) & 0x3fff, height: view.getUint16(28,true) & 0x3fff };
    if (format === "VP8L" && bytes[20] === 0x2f) return { mime: "image/webp", extension:"webp", width: 1 + bytes[21] + ((bytes[22]&0x3f)<<8), height: 1 + (bytes[22]>>6) + (bytes[23]<<2) + ((bytes[24]&0xf)<<10) };
  }
  if (bytes.length >= 16 && ascii(bytes,4,4) === "ftyp") {
    const boxSize = view.getUint32(0);
    if (boxSize >= 16 && boxSize <= bytes.length) {
      const brands = [];
      for (let at = 8; at + 4 <= boxSize; at += 4) if (at !== 12) brands.push(ascii(bytes,at,4));
      if (brands.some(b => ["isom","iso2","iso3","iso4","iso5","iso6","mp41","mp42","avc1","M4V ","dash"].includes(b))) return {mime:"video/mp4", extension:"mp4"};
    }
  }
  if (bytes.length >= 16 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3 && ascii(bytes,0,Math.min(256,bytes.length)).includes("webm")) return {mime:"video/webm",extension:"webm"};
  throw new InputError("仅支持有效的 JPEG、PNG、WebP、MP4 或 WebM 文件。", 415);
}
export function validateMediaKind(kind: string, media: ReturnType<typeof inspectMedia>) {
  const video = kind === "video" || kind === "video360";
  if (video !== media.mime.startsWith("video/")) throw new InputError("所选影像类型与文件内容不一致。");
  if (!video) {
    if (!media.width || !media.height || media.width > 16384 || media.height > 16384 || media.width * media.height > 80_000_000) throw new InputError("图片尺寸无效或过大，请缩小至 16384 像素以内、8000 万像素以下。");
    if (kind === "panorama" && Math.abs(media.width / media.height - 2) > 0.06) throw new InputError("360° 全景需要约 2:1 比例的等距柱状投影图片，普通照片请选择「照片」。");
  }
}
export function parseRange(header: string | null, size: number): {offset: number; length: number} | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) throw new InputError("无效的媒体范围。",416);
  let start: number, end: number;
  if (!match[1]) { const suffix = Number(match[2]); if (!Number.isSafeInteger(suffix) || suffix <= 0) throw new InputError("无效的媒体范围。",416); start = Math.max(0,size-suffix); end = size-1; }
  else { start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]),size-1) : size-1; }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) throw new InputError("无效的媒体范围。",416);
  return {offset:start,length:end-start+1};
}
