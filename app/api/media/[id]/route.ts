import type { SceneRow } from "../../../../lib/contracts";
import { InputError, parseRange } from "../../../../lib/validation";
import { failure, requireId, storage } from "../../_shared";

export const dynamic = "force-dynamic";
async function serve(request: Request, context:{params:Promise<{id:string}>},head = false) {
  let size: number | undefined;
  try {
    const id = requireId((await context.params).id);
    const {db,bucket} = storage();
    const row = await db.prepare("SELECT * FROM scenes WHERE id = ? AND status = 'published'").bind(id).first<SceneRow>();
    if (!row) throw new InputError("这条影像不存在或已移除。",404);
    size = row.size_bytes;
    const range = parseRange(request.headers.get("Range"),size);
    const headers = new Headers({"Content-Type":row.mime_type,"X-Content-Type-Options":"nosniff","Cache-Control":"private, no-store","Accept-Ranges":"bytes","Content-Length":String(range?.length ?? size),"Content-Disposition":"inline"});
    if (range) headers.set("Content-Range",`bytes ${range.offset}-${range.offset+range.length-1}/${size}`);
    if (head) return new Response(null,{status:range?206:200,headers});
    const object = range ? await bucket.get(row.object_key,{range}) : await bucket.get(row.object_key);
    if (!object) throw new InputError("影像文件暂时不可用。",404);
    return new Response(object.body,{status:range?206:200,headers});
  } catch (error) {
    const response = failure(error);
    if (error instanceof InputError && error.status === 416 && size !== undefined) response.headers.set("Content-Range",`bytes */${size}`);
    return response;
  }
}
export function GET(request: Request, context:{params:Promise<{id:string}>}) { return serve(request,context); }
export function HEAD(request: Request, context:{params:Promise<{id:string}>}) { return serve(request,context,true); }
