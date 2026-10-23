import type { SceneRow } from "../../../lib/contracts";
import { InputError } from "../../../lib/validation";
import { boundedBody, failure, json, storage, toScene, writer } from "../_shared";
import { browserSession } from "../_sessions";
import { checkUploadQuota, persistUpload } from "../_upload";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const {db} = storage();
    const url = new URL(request.url);
    const cursor = url.searchParams.get("before");
    if (cursor && (!/^\d{4}-\d\d-\d\dT/.test(cursor) || !Number.isFinite(Date.parse(cursor)))) throw new InputError("分页参数无效。");
    const query = cursor
      ? db.prepare("SELECT * FROM scenes WHERE status = 'published' AND created_at < ? ORDER BY created_at DESC LIMIT 201").bind(cursor)
      : db.prepare("SELECT * FROM scenes WHERE status = 'published' ORDER BY created_at DESC LIMIT 201");
    const [result,session] = await Promise.all([query.all<SceneRow>(),browserSession(request,true)]);
    const rows = result.results.slice(0,200);
    const response = json({scenes:rows.map(toScene),user:session.user,nextCursor:result.results.length > 200 ? rows[rows.length-1].created_at : null});
    if (session.setCookie) response.headers.set("Set-Cookie",session.setCookie);
    return response;
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const user = await writer(request);
    if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("multipart/form-data;")) throw new InputError("上传需要 multipart/form-data 格式。",415);
    await checkUploadQuota(user.id);
    let form: FormData;
    try { form = await boundedBody(request).formData(); } catch (error) { if (error instanceof InputError) throw error; throw new InputError("无法读取上传内容，请重新选择文件。"); }
    return await persistUpload(form,user);
  } catch (error) { return failure(error); }
}
