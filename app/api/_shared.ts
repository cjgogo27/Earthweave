import { env } from "cloudflare:workers";
import { browserSession } from "./_sessions";
import type { Scene, SceneRow } from "../../lib/contracts";
import { InputError, MAX_BODY_BYTES } from "../../lib/validation";

export function storage() {
  if (!env.DB || !env.BUCKET) throw new InputError("影像存储尚未连接，请稍后重试。", 503);
  return { db: env.DB, bucket: env.BUCKET };
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {status, headers:{"Cache-Control":"private, no-store","Vary":"Cookie","X-Content-Type-Options":"nosniff"}});
}
export function failure(error: unknown) {
  if (error instanceof InputError) return json({error:error.message},error.status);
  console.error("Earthweave API failed", error instanceof Error ? error.message : "Unknown failure");
  return json({error:"服务暂时不可用，请稍后重试。"},503);
}
export async function writer(request: Request) {
  const origin = request.headers.get("Origin");
  if (!origin || origin !== new URL(request.url).origin) throw new InputError("请从本站页面提交操作。",403);
  const {user} = await browserSession(request);
  if (!user) throw new InputError("浏览器会话尚未准备好或已过期，请刷新页面后重试。",401);
  return user;
}
export function toScene(row: SceneRow): Scene {
  return {id:row.id,title:row.title,description:row.description,lat:row.lat,lng:row.lng,
    kind:row.kind,url:`/api/media/${row.id}`,device:row.device,license:row.license,
    author:row.author,authorId:row.author_id,createdAt:row.created_at,source:"community",
    ...(row.width ? {width:row.width} : {}),...(row.height ? {height:row.height} : {}),...(row.source_url ? {sourceUrl:row.source_url} : {}),...(row.source_attribution ? {sourceAttribution:row.source_attribution} : {})};
}
export function requireId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new InputError("找不到这条影像。",404);
  return id;
}
export function boundedBody(request: Request, max = MAX_BODY_BYTES) {
  const declared = request.headers.get("Content-Length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > max)) throw new InputError(max === MAX_BODY_BYTES ? "文件过大，单次上传最多 32 MB。" : "请求内容过大。",413);
  if (!request.body) throw new InputError("请求没有内容。");
  let total = 0;
  const limiter = new TransformStream<Uint8Array,Uint8Array>({
    transform(chunk,controller) {
      total += chunk.byteLength;
      if (total > max) throw new InputError("请求内容过大。",413);
      controller.enqueue(chunk);
    },
  });
  return new Response(request.body.pipeThrough(limiter),{headers:{"Content-Type":request.headers.get("Content-Type") || ""}});
}
