import { InputError, MAX_FILE_BYTES, importUrl, textField, validateFields } from "../../../lib/validation";
import { boundedBody, failure, writer } from "../_shared";
import { checkUploadQuota, persistUpload } from "../_upload";

export const dynamic = "force-dynamic";

async function downloadMedia(initial: URL): Promise<Blob> {
  const abort = new AbortController();
  let overflow = false;
  const timer = setTimeout(() => abort.abort(),20_000);
  try {
    let url = initial;
    for (let redirects = 0; redirects <= 3; redirects++) {
      // Each hop is a new anonymous HTTPS request. Never forward visitor cookies or auth headers.
      const response = await fetch(url,{redirect:"manual",signal:abort.signal,headers:{Accept:"image/jpeg,image/png,image/webp,video/mp4,video/webm"}});
      if ([301,302,303,307,308].includes(response.status)) {
        const location = response.headers.get("Location");
        await response.body?.cancel();
        if (!location || redirects === 3) throw new InputError("影像链接重定向过多或缺少目标地址，请使用最终媒体直链。",400);
        let resolved: string;
        try { resolved = new URL(location,url).href; } catch { throw new InputError("影像链接返回了无效的重定向。",400); }
        url = importUrl(resolved);
        continue;
      }
      if (response.status !== 200 || !response.body) {
        await response.body?.cancel();
        throw new InputError(`来源站点未提供可下载的完整影像（HTTP ${response.status}）。请检查直链和访问权限。`,502);
      }
      const declared = response.headers.get("Content-Length");
      if (declared && (!/^\d+$/.test(declared) || Number(declared)>MAX_FILE_BYTES)) {
        await response.body.cancel();
        throw new InputError("远程文件过大，最多支持 32 MB。",413);
      }
      let total = 0;
      const bounded = response.body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({
        transform(chunk,controller) {
          total += chunk.byteLength;
          if (total>MAX_FILE_BYTES) { overflow = true; abort.abort(); throw new InputError("远程文件过大，最多支持 32 MB。",413); }
          controller.enqueue(chunk);
        },
      }));
      // Stream limits apply even when Content-Length is missing or content is compressed.
      return await new Response(bounded,{headers:{"Content-Type":response.headers.get("Content-Type") || "application/octet-stream"}}).blob();
    }
    throw new InputError("无法下载媒体。",502);
  } catch (error) {
    if (overflow) throw new InputError("远程文件过大，最多支持 32 MB。",413);
    if (error instanceof InputError) throw error;
    if (abort.signal.aborted) throw new InputError("下载超时，请选择更小的文件或先下载到设备后上传。",504);
    throw new InputError("无法连接媒体来源，请检查直链，或下载文件后上传。",502);
  } finally { clearTimeout(timer); }
}

export async function POST(request: Request) {
  try {
    const user = await writer(request);
    if (request.headers.get("Content-Type")?.split(";",1)[0].trim().toLowerCase() !== "application/json") throw new InputError("链接导入需要 JSON 格式。",415);
    let payload: unknown;
    try { payload = await boundedBody(request,16*1024).json(); } catch (error) { if (error instanceof InputError) throw error; throw new InputError("导入信息格式不正确。"); }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new InputError("导入信息格式不正确。");
    const input = payload as Record<string,unknown>;
    const url = importUrl(input.url);
    const attribution = textField(input.sourceAttribution,"原作者或来源署名",200);
    const form = new FormData();
    for (const field of ["title","description","lat","lng","kind","device","license"]) {
      const value = input[field];
      if (value != null && typeof value !== "string" && typeof value !== "number") throw new InputError("导入信息格式不正确。");
      form.set(field,value == null ? "" : String(value));
    }
    form.set("rightsConfirmed",input.rightsConfirmed === true ? "true" : "false");
    form.set("sourceUrl",url.href);
    form.set("sourceAttribution",attribution);
    validateFields(form);
    await checkUploadQuota(user.id);
    const file = await downloadMedia(url);
    form.set("file",file,"imported-media");
    return await persistUpload(form,user);
  } catch (error) { return failure(error); }
}
