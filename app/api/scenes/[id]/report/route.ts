import { InputError, textField } from "../../../../../lib/validation";
import { boundedBody, failure, json, requireId, storage, writer } from "../../../_shared";

export async function POST(request: Request, context: {params:Promise<{id:string}>}) {
  try {
    const user = await writer(request);
    const id = requireId((await context.params).id);
    const {db} = storage();
    const exists = await db.prepare("SELECT id FROM scenes WHERE id = ? AND status = 'published'").bind(id).first();
    if (!exists) throw new InputError("找不到这条影像。",404);
    let payload: unknown;
    try { payload = await boundedBody(request,8192).json(); } catch (error) { if (error instanceof InputError) throw error; throw new InputError("举报内容格式不正确。"); }
    const reason = textField(payload && typeof payload === "object" ? (payload as {reason?:unknown}).reason : null,"举报原因",1000);
    await db.prepare("INSERT INTO reports (id,scene_id,reporter_id,reason,created_at,status) VALUES (?,?,?,?,?,'pending') ON CONFLICT(scene_id,reporter_id) DO UPDATE SET reason=excluded.reason, created_at=excluded.created_at, status='pending'")
      .bind(crypto.randomUUID(),id,user.id,reason,new Date().toISOString()).run();
    return json({reported:true});
  } catch (error) { return failure(error); }
}
