import type { SceneRow } from "../../../../lib/contracts";
import { InputError } from "../../../../lib/validation";
import { failure, json, requireId, storage, writer } from "../../_shared";

export async function DELETE(request: Request, context: {params:Promise<{id:string}>}) {
  try {
    const user = await writer(request);
    const id = requireId((await context.params).id);
    const {db,bucket} = storage();
    const row = await db.prepare("SELECT * FROM scenes WHERE id = ?").bind(id).first<SceneRow>();
    if (!row) throw new InputError("找不到这条影像。",404);
    if (row.author_id !== user.id) throw new InputError("只能删除自己上传的影像。",403);
    await db.prepare("UPDATE scenes SET status = 'deleted' WHERE id = ? AND author_id = ?").bind(id,user.id).run();
    await bucket.delete(row.object_key);
    return json({deleted:true});
  } catch (error) { return failure(error); }
}
