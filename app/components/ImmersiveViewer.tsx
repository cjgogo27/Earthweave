"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useI18n } from "../../lib/i18n";

type ViewerScene = {
  id: string;
  title: string;
  url: string;
  kind: "photo" | "panorama" | "video" | "video360";
  description?: string;
  author?: string;
  license?: string;
};

export default function ImmersiveViewer({ scene, onClose }: { scene: ViewerScene; onClose: () => void }) {
  const { t } = useI18n();
  const canvasLabel = t("360 度全景：拖动查看四周，滚轮缩放。可按方向键转动视角。", "360-degree panorama. Drag to look around, scroll to zoom, or use the arrow keys.");
  const modal = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const closeRef = useRef(onClose);
  const sessionRef = useRef<any>(null);
  const xrPendingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<[string, string] | null>(null);
  const [xr, setXR] = useState<"checking" | "available" | "unavailable" | "active">("checking");
  const [xrPending, setXrPending] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const immersive = scene.kind === "panorama" || scene.kind === "video360";
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modal.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !sessionRef.current) closeRef.current();
      if (event.key !== "Tab" || !modal.current) return;
      const elements = Array.from(modal.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), video[controls], [tabindex="0"]'));
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === modal.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === modal.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const system = (navigator as any).xr;
    if (!immersive || !window.isSecureContext || !system) { setXR("unavailable"); return; }
    system.isSessionSupported("immersive-vr").then((supported: boolean) => {
      if (active) setXR(supported ? "available" : "unavailable");
    }).catch(() => { if (active) setXR("unavailable"); });
    return () => { active = false; };
  }, [immersive]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPlaying(false);
    setProgress(0);
    if (!immersive || !host.current) return;
    const container = host.current;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch { setError(["此设备无法启动 360° 视图，请使用支持 WebGL 的浏览器。", "This device cannot start the 360° view. Please use a browser with WebGL support."]); setLoading(false); return; }
    let disposed = false;
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x070d10);
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local");
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:none;cursor:grab";
    renderer.domElement.tabIndex = 0;
    container.appendChild(renderer.domElement);
    const world = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.01, 100);
    camera.rotation.order = "YXZ";
    const geometry = new THREE.SphereGeometry(30, 80, 48);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sphere = new THREE.Mesh(geometry, material);
    world.add(sphere);
    let texture: THREE.Texture;
    const failed = () => { if (!disposed) { setError(["影像加载失败。请检查网络或上传文件的编码格式。", "The media could not load. Check your connection and the file encoding."]); setLoading(false); } };
    let video: HTMLVideoElement | null = null;
    if (scene.kind === "video360") {
      video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.playsInline = true;
      video.preload = "auto";
      video.muted = true;
      video.loop = true;
      video.src = scene.url;
      videoRef.current = video;
      video.addEventListener("loadeddata", () => { if (!disposed) setLoading(false); });
      video.addEventListener("loadedmetadata", () => { if (!disposed) setDuration(Number.isFinite(video!.duration) ? video!.duration : 0); });
      video.addEventListener("timeupdate", () => { if (!disposed) setProgress(video!.currentTime); });
      video.addEventListener("play", () => { if (!disposed) setPlaying(true); });
      video.addEventListener("pause", () => { if (!disposed) setPlaying(false); });
      video.addEventListener("error", failed);
      texture = new THREE.VideoTexture(video);
    } else {
      texture = new THREE.TextureLoader().load(scene.url, loaded => {
        if (disposed) { loaded.dispose(); return; }
        if (loaded.image.width / loaded.image.height < 1.9 || loaded.image.width / loaded.image.height > 2.1) {
          setError(["这张影像不是标准 2:1 全景，球面显示可能产生变形。", "This image is not a standard 2:1 panorama and may appear distorted."]);
        }
        setLoading(false);
      }, undefined, failed);
    }
    texture.colorSpace = THREE.SRGBColorSpace;
    material.map = texture;
    let pointer = { down: false, x: 0, y: 0, yaw: 0, pitch: 0 };
    let yaw = 0;
    let pitch = 0;
    const pointerDown = (event: PointerEvent) => {
      if (renderer.xr.isPresenting) return;
      pointer = { down: true, x: event.clientX, y: event.clientY, yaw, pitch };
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };
    const pointerMove = (event: PointerEvent) => {
      if (!pointer.down) return;
      yaw = pointer.yaw + (event.clientX - pointer.x) * 0.003;
      pitch = THREE.MathUtils.clamp(pointer.pitch + (event.clientY - pointer.y) * 0.003, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
    };
    const pointerUp = () => { pointer.down = false; renderer.domElement.style.cursor = "grab"; };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      camera.fov = THREE.MathUtils.clamp(camera.fov + event.deltaY * 0.025, 35, 100);
      camera.updateProjectionMatrix();
    };
    const keyboard = (event: KeyboardEvent) => {
      const increment = 0.08;
      if (event.key === "ArrowLeft") yaw += increment;
      else if (event.key === "ArrowRight") yaw -= increment;
      else if (event.key === "ArrowUp") pitch += increment;
      else if (event.key === "ArrowDown") pitch -= increment;
      else return;
      pitch = THREE.MathUtils.clamp(pitch, -Math.PI / 2 + 0.02, Math.PI / 2 - 0.02);
      event.preventDefault();
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("pointercancel", pointerUp);
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });
    renderer.domElement.addEventListener("keydown", keyboard);
    const resize = () => {
      if (renderer.xr.isPresenting) return;
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    renderer.setAnimationLoop(() => {
      if (!renderer.xr.isPresenting) { camera.position.set(0, 0, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
      renderer.render(world, camera);
    });
    return () => {
      disposed = true;
      rendererRef.current = null;
      videoRef.current = null;
      if (sessionRef.current) { void sessionRef.current.end().catch(() => {}); sessionRef.current = null; }
      observer.disconnect();
      renderer.setAnimationLoop(null);
      if (video) { video.pause(); video.removeAttribute("src"); video.load(); }
      texture.dispose();
      geometry.dispose();
      material.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("pointercancel", pointerUp);
      renderer.domElement.removeEventListener("wheel", wheel);
      renderer.domElement.removeEventListener("keydown", keyboard);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [scene.url, scene.kind, immersive]);

  // Language changes update labels and existing messages without resetting VR.
  useEffect(() => { rendererRef.current?.domElement.setAttribute("aria-label", canvasLabel); }, [canvasLabel, scene.url, scene.kind]);

  async function enterVR() {
    if (xrPendingRef.current) return;
    const renderer = rendererRef.current;
    const system = (navigator as any).xr;
    if (!renderer || !system) return;
    xrPendingRef.current = true; setXrPending(true);
    try {
      if (sessionRef.current) { await sessionRef.current.end(); return; }
      // Keep video playback and the XR request inside the user's click gesture.
      if (videoRef.current) void videoRef.current.play().catch(() => {});
      const session = await system.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
      // Permission UI can outlive the viewer. Never attach its eventual session
      // to a renderer that has already been disposed by closing the dialog.
      if (rendererRef.current !== renderer) { await session.end().catch(() => {}); return; }
      sessionRef.current = session;
      session.addEventListener("end", () => {
        if (sessionRef.current === session) sessionRef.current = null;
        if (rendererRef.current === renderer) setXR("available");
      }, { once: true });
      await renderer.xr.setSession(session);
      if (rendererRef.current !== renderer) { await session.end().catch(() => {}); return; }
      setXR("active");
      setError(null);
    } catch (reason) {
      if (sessionRef.current) { void sessionRef.current.end().catch(() => {}); sessionRef.current = null; }
      if (rendererRef.current === renderer) setError(reason instanceof Error && reason.name === "NotAllowedError" ? ["VR 访问未获许可。请在头显浏览器中允许进入沉浸模式。", "VR permission was denied. Allow immersive mode in your headset browser."] : ["暂时无法进入 VR。请确认头显已连接，并在支持 WebXR 的浏览器中重试。", "Could not enter VR. Check that your headset is connected and try a WebXR-compatible browser."]);
    } finally {
      xrPendingRef.current = false;
      if (rendererRef.current === renderer) setXrPending(false);
    }
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { try { await video.play(); } catch { setError(["浏览器无法播放此视频，请检查编码格式。", "The browser cannot play this video. Please check its encoding."]); } }
    else video.pause();
  }

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (modal.current?.requestFullscreen) await modal.current.requestFullscreen();
      else setError(["当前浏览器不提供全屏接口，可横屏观看。", "Fullscreen is unavailable in this browser. You can use landscape orientation."]);
    } catch { setError(["浏览器未允许全屏，可继续在当前窗口观看。", "The browser did not allow fullscreen. You can continue in this window."]); }
  }

  return <div className="ew-viewer" ref={modal} role="dialog" aria-modal="true" aria-labelledby="ew-viewer-title" tabIndex={-1}>
    <style>{`
      .ew-viewer{position:fixed;inset:0;z-index:1000;background:#070d10;color:#eff5ee;display:flex;flex-direction:column;outline:none;font-family:inherit}
      .ew-viewer *{box-sizing:border-box}.ew-viewer button{font-family:inherit;cursor:pointer;border:1px solid #365149;background:#152421;color:#ecf7f1;border-radius:10px;padding:10px 15px;font-size:13px;line-height:1.4;white-space:nowrap}.ew-viewer button:hover{background:#223c32}.ew-viewer button:focus-visible,.ew-viewer canvas:focus-visible{outline:2px solid #7cf3b6;outline-offset:3px}.ew-viewer button:disabled{opacity:.45;cursor:default}.ew-viewer .ew-vr-button{background:#80ecb2;color:#0a2518;border-color:#80ecb2;font-weight:650}.ew-v-header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:20px 28px;border-bottom:1px solid #23332e}.ew-v-heading{min-width:0}.ew-v-heading p{margin:0 0 5px;color:#8fa79e;font-size:11px;letter-spacing:2px}.ew-v-heading h2{margin:0;font-size:20px;font-weight:550}.ew-v-tools{display:flex;gap:8px}.ew-v-stage{position:relative;min-height:200px;flex:1;overflow:hidden}.ew-v-canvas{position:absolute;inset:0}.ew-v-flat{height:100%;width:100%;object-fit:contain;position:absolute;inset:0;background:#050909}.ew-v-loading{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;color:#a9c7bb;background:#08120fd9;font-size:14px;z-index:1}.ew-v-notice{position:absolute;top:18px;left:50%;transform:translateX(-50%);padding:11px 16px;border:1px solid #425d48;border-radius:10px;background:#122117eb;color:#d0ddbc;z-index:2;font-size:13px;width:max-content;max-width:90%;line-height:1.7}.ew-v-help{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);border-radius:999px;padding:9px 17px;background:#07120dc9;color:#c3d4cd;font-size:12px;pointer-events:none;white-space:nowrap}.ew-v-footer{padding:15px 28px 18px;border-top:1px solid #24342e;display:flex;align-items:center;justify-content:space-between;gap:22px;background:#0e1815}.ew-v-footer p{margin:0;font-size:12px;color:#95aba1;line-height:1.8}.ew-v-footer strong{color:#ccded4;font-weight:500}.ew-v-status{max-width:360px;text-align:right}.ew-v-playback{display:flex;gap:12px;align-items:center;padding:10px 28px;background:#101f19}.ew-v-playback input{accent-color:#80ecb2;min-width:50px;flex:1}.ew-v-time{font:12px monospace;color:#b7ccbe}
      @media(max-width:650px){.ew-v-header{padding:14px 16px;gap:12px;align-items:flex-start}.ew-v-heading h2{font-size:16px}.ew-v-tools{flex-wrap:wrap;justify-content:flex-end;max-width:200px}.ew-viewer button{padding:8px 10px;font-size:12px}.ew-v-footer{padding:12px 16px;align-items:flex-start;gap:12px;flex-direction:column}.ew-v-status{max-width:none;text-align:left}.ew-v-help{font-size:11px;white-space:normal;text-align:center;width:85%;bottom:12px}.ew-v-playback{padding:10px 16px}}
    `}</style>
    <header className="ew-v-header">
      <div className="ew-v-heading"><p>{immersive ? t("360° 沉浸视角", "360° IMMERSIVE VIEW") : t("地点影像", "PLACE MEMORY")}</p><h2 id="ew-viewer-title">{scene.title}</h2></div>
      <div className="ew-v-tools">
        <button onClick={fullscreen} aria-label={t("切换全屏", "Toggle fullscreen")}>{t("全屏", "Fullscreen")}</button>
        {immersive && <button className="ew-vr-button" onClick={enterVR} disabled={xrPending || xr === "checking" || xr === "unavailable" || loading}>{xrPending ? t("正在连接 VR…", "Connecting to VR…") : xr === "active" ? t("退出 VR", "Exit VR") : xr === "checking" ? t("检测 VR…", "Checking VR…") : t("进入 VR", "Enter VR")}</button>}
        <button onClick={onClose} aria-label={t("关闭体验", "Close viewer")}>{t("关闭", "Close")} ✕</button>
      </div>
    </header>
    <div className="ew-v-stage">
      {immersive ? <div className="ew-v-canvas" ref={host} /> : scene.kind === "photo" ? <img className="ew-v-flat" src={scene.url} alt={scene.title} onLoad={() => setLoading(false)} onError={() => { setLoading(false); setError(["照片加载失败，请检查网络或文件。", "The photo could not load. Check your connection or the file."]); }} /> : <video className="ew-v-flat" src={scene.url} controls playsInline preload="metadata" onLoadedMetadata={() => setLoading(false)} onError={() => { setLoading(false); setError(["视频加载失败或浏览器不支持此编码。", "The video could not load, or its encoding is unsupported."]); }} />}
      {loading && <div className="ew-v-loading" role="status">{t("正在打开这个地方…", "Opening this place…")}</div>}
      {error && <div className="ew-v-notice" role="status">{t(error[0], error[1])}</div>}
      {immersive && !loading && <div className="ew-v-help">{t("拖动画面环顾四周 · 滚轮缩放 · 头显内转头观看", "Drag to look around · Scroll to zoom · Turn your head in VR")}</div>}
    </div>
    {scene.kind === "video360" && <div className="ew-v-playback">
      <button onClick={togglePlayback}>{playing ? t("暂停", "Pause") : t("播放", "Play")}</button>
      <input type="range" min={0} max={duration || 1} step={0.1} value={Math.min(progress, duration || 1)} aria-label={t("视频进度", "Video position")} onChange={event => { if (videoRef.current) videoRef.current.currentTime = Number(event.target.value); setProgress(Number(event.target.value)); }} />
      <span className="ew-v-time">{Math.floor(progress)} / {Math.floor(duration)}s</span>
      <button onClick={() => { const next = !muted; setMuted(next); if (videoRef.current) videoRef.current.muted = next; }}>{muted ? t("开启声音", "Unmute") : t("静音", "Mute")}</button>
    </div>}
    <footer className="ew-v-footer">
      <div><p><strong>{scene.author || t("影像贡献者", "Contributor")}</strong>{scene.license ? ` · ${scene.license}` : ""}</p><p>{scene.description || (immersive ? t("在同一个拍摄位置，看看世界的另一面。", "Look around from the original capture point.") : t("来自这个地点的视觉记录。", "A visual record from this place."))}</p></div>
      <p className="ew-v-status">{immersive ? (xr === "unavailable" ? t("当前浏览器未检测到可用 VR。可继续拖动浏览，或用支持 WebXR 的头显打开链接。", "VR is unavailable in this browser. Drag to explore, or open this link in a WebXR-compatible headset.") : t("此影像支持原地 360° 环顾；尚不支持三维行走。", "This image supports looking around in 360°. It does not support walking through a 3D scene.")) : t("普通影像以平面展示。360° 全景才支持环顾体验。", "Standard media is shown on a flat screen. Choose a 360° panorama to look around.")}</p>
    </footer>
  </div>;
}
