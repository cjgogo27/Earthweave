import type { SceneRow } from "../../lib/contracts";
import { InputError, MAX_FILE_BYTES, inspectMedia, sourceUrl, textField, validateFields, validateMediaKind } from "../../lib/validation";
import { json, storage, toScene } from "./_shared";

export async function checkUploadQuota(userId: string) {
  const {db} = storage();
  const hour = new Date(Date.now()-3600_000).toISOString();
  const recent = await db.prepare("SELECT COUNT(*) AS count FROM scenes WHERE author_id = ? AND created_at > ?").bind(userId,hour).first<{count:number}>();
  if ((recent?.count || 0) >= 20) throw new InputError("每小时最多上传 20 条影像，请稍后再试。",429);
}

/** Both authenticated routes validate Origin and quota before calling this helper. */
export async function persistUpload(form: FormData, user: {id:string;name:string}) {
  const {db,bucket} = storage();
  const fields = validateFields(form);
  const provenance = sourceUrl(form.get("sourceUrl"));
  const attribution = textField(form.get("sourceAttribution"),"原作者或来源署名",200,Boolean(provenance));
  const file = form.get("file");
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") throw new InputError("请选择一个影像文件。");
  if (file.size === 0) throw new InputError("文件内容为空。");
  if (file.size > MAX_FILE_BYTES) throw new InputError("文件过大，单个文件最多 32 MB。",413);
  const media = inspectMedia(new Uint8Array(await file.slice(0,1024*1024).arrayBuffer()));
  validateMediaKind(fields.kind,media);
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256",bytes);
  const sha256 = Array.from(new Uint8Array(digest),b => b.toString(16).padStart(2,"0")).join("");
  const duplicate = await db.prepare("SELECT id FROM scenes WHERE author_id = ? AND sha256 = ? AND status = 'published' LIMIT 1").bind(user.id,sha256).first<{id:string}>();
  if (duplicate) return json({error:"这份影像已经上传过了。",existingId:duplicate.id},409);
  const id = crypto.randomUUID(), createdAt = new Date().toISOString(), key = `scenes/${id}.${media.extension}`;
  await bucket.put(key,bytes,{httpMetadata:{contentType:media.mime},customMetadata:{sceneId:id}});
  const row: SceneRow = {id,...fields,author:user.name,author_id:user.id,created_at:createdAt,width:media.width || null,height:media.height || null,object_key:key,mime_type:media.mime,size_bytes:file.size,sha256,status:"published",source_url:provenance,source_attribution:attribution || null};
  try {
    await db.prepare("INSERT INTO scenes (id,title,description,lat,lng,kind,device,license,author,author_id,created_at,width,height,object_key,mime_type,size_bytes,sha256,status,source_url,source_attribution) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(row.id,row.title,row.description,row.lat,row.lng,row.kind,row.device,row.license,row.author,row.author_id,row.created_at,row.width,row.height,row.object_key,row.mime_type,row.size_bytes,row.sha256,row.status,row.source_url,row.source_attribution).run();
  } catch (error) { await bucket.delete(key); throw error; }
  return json({scene:toScene(row)},201);
}
