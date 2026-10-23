"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Bookmark, Check, ChevronRight, CloudUpload, Compass, Flag, Globe2, Headset, HelpCircle, Image as ImageIcon, Layers, LoaderCircle, LocateFixed, MapPin, Plus, Search, Trash2, Users, Video, X } from "lucide-react";
import Globe from "./components/Globe";
import ImmersiveViewer from "./components/ImmersiveViewer";
import type { Scene, SceneKind } from "../lib/contracts";
import { useI18n } from "../lib/i18n";

type Place = Omit<Scene, "source"> & { source: "community" | "demo"; sourceUrl?: string; sourceAttribution?: string; location?: string };
type User = { id: string; name: string };
type View = "explore" | "community" | "saved" | "mine";
type Filter = "all" | "panorama" | "photo" | "video";
type Translate = (zh: string, en?: string) => string;
const MAX_BYTES = 32 * 1024 * 1024;
const IMPORT_HOSTS = new Set(["dl.polyhaven.org", "upload.wikimedia.org", "images.unsplash.com", "videos.pexels.com"]);
const DEVICES = [["手机", "Phone"], ["相机", "Camera"], ["360° 相机", "360° camera"], ["无人机", "Drone"], ["其他设备", "Other device"], ["互联网素材", "Internet media"]];
function kinds(t: Translate): Record<SceneKind, string> { return { photo: t("照片", "Photo"), panorama: t("360° 全景", "360° panorama"), video: t("视频", "Video"), video360: t("360° 视频", "360° video") }; }
function demos(t: Translate): Place[] {
  return [
    { id: "demo-venice", title: t("威尼斯，日落之前", "Venice, before sunset"), description: t("站在威尼斯的水岸，看看落日映照下的城市与运河。来自 Poly Haven 的 CC0 全景示例；地图位置为场景区域的近似定位。", "Stand beside the water in Venice and see its city and canals in the evening light. A CC0 panorama from Poly Haven; the map pin marks the approximate scene area."), location: t("意大利 · 威尼斯", "Venice · Italy"), lat: 45.4303, lng: 12.3541, kind: "panorama", url: "/media/venice.jpg", device: t("全景相机", "Panoramic camera"), license: "CC0-1.0", author: "Greg Zaal · Poly Haven", authorId: "demo", createdAt: "", source: "demo", sourceUrl: "https://polyhaven.com/a/venice_sunset" },
    { id: "demo-spruit", title: t("晨光里的南非草地", "Morning light on the South African grasslands"), description: t("日光越过草地，薄雾笼罩着清晨的小径。来自 Poly Haven 的 CC0 全景示例；地图位置为场景区域的近似定位。", "Sunlight crosses the grassland as morning mist settles over the path. A CC0 panorama from Poly Haven; the map pin marks the approximate scene area."), location: t("南非 · 约翰内斯堡", "Johannesburg · South Africa"), lat: -26.1227, lng: 28.0154, kind: "panorama", url: "/media/spruit.jpg", device: t("全景相机", "Panoramic camera"), license: "CC0-1.0", author: "Greg Zaal · Poly Haven", authorId: "demo", createdAt: "", source: "demo", sourceUrl: "https://polyhaven.com/a/spruit_sunrise" },
  ];
}
function coordinates(place: Pick<Place, "lat" | "lng">) { return `${Math.abs(place.lat).toFixed(4)}° ${place.lat >= 0 ? "N" : "S"} / ${Math.abs(place.lng).toFixed(4)}° ${place.lng >= 0 ? "E" : "W"}`; }

function Guide({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const steps = [
    [t("把经历留在地球上", "Put your experiences on the globe"), t("手机、相机、360° 相机和无人机都可以采集影像。上传文件或导入有权使用的互联网素材，补充地点、说明和开放许可。", "Capture with a phone, camera, 360° camera or drone. Upload a file or import online media you have the rights to share, then add a location, description and open license.")],
    [t("走近没有去过的地方", "Experience somewhere new"), t("普通照片与视频以平面展示；2:1 全景支持拖动环顾。用支持 WebXR 的 VR 头显浏览器打开站点，可在全景中转头观看。", "Ordinary photos and videos use a flat view. Drag to look around 2:1 panoramas, or open the site in a WebXR-compatible headset browser to look around in VR.")],
    [t("让这个世界共同生长", "Build this world together"), t("无需账号即可浏览、上传和举报。贡献保存在服务器，当前浏览器会记住管理身份；可以在这里删除自己的影像。清除 Cookie 或更换浏览器后，将无法管理原来的贡献。", "Browse, contribute and report without an account. Media is stored on the server, while this browser remembers your contributor identity so you can delete your uploads. Clearing cookies or changing browsers removes your ability to manage earlier contributions.")],
  ];
  return <Modal title={t("一个世界，许多人的视角", "One world. Many perspectives.")} onClose={onClose} wide><div className="guide-content">
    <p className="lead">{t("共境 Earthweave 是一个持续生长的地球影像平台。你可以从一张照片开始，为别人打开一扇窗。", "Earthweave is a growing visual atlas of our planet. Start with one photo and open a window for someone else.")}</p>
    {steps.map(([heading, text], index) => <div className="guide-step" key={index}><span>0{index + 1}</span><div><h3>{heading}</h3><p>{text}</p></div></div>)}
    <div className="honest-note"><strong>{t("这是一块起点", "This is a starting point")}</strong><p>{t("目前支持地理索引、视觉记录与原地 360° 体验；尚未实现全球实景覆盖、自由行走、自动三维重建、自动隐私模糊化或社区人工审核。后续可接入多视角重建、Gaussian Splatting，以及声音与更多感官数据。", "The current version supports geographic indexing, visual records and stationary 360° viewing. It does not yet provide global coverage, free movement, automatic 3D reconstruction, privacy blurring or human moderation. Future integrations can add multi-view reconstruction, Gaussian Splatting, sound and other sensory data.")}</p></div>
    <div className="guide-links"><a href="https://github.com/cjgogo27/Earthweave" target="_blank" rel="noreferrer">{t("开源代码", "Source code")} · GitHub <ArrowUpRight size={14} /></a><a href="https://panoramax.fr/" target="_blank" rel="noreferrer">Panoramax <ArrowUpRight size={14} /></a><a href="https://cesium.com/platform/cesiumjs/" target="_blank" rel="noreferrer">CesiumJS <ArrowUpRight size={14} /></a><a href="https://polyhaven.com/" target="_blank" rel="noreferrer">{t("示例影像", "Demo imagery")} · Poly Haven <ArrowUpRight size={14} /></a></div>
  </div></Modal>;
}

export default function Home() {
  const { t, language, setLanguage } = useI18n();
  const [community, setCommunity] = useState<Place[]>([]), [user, setUser] = useState<User | null>(null), [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(""), [nextCursor, setNextCursor] = useState<string | null>(null), [view, setView] = useState<View>("explore");
  const [filter, setFilter] = useState<Filter>("all"), [query, setQuery] = useState(""), [selectedId, setSelectedId] = useState("demo-venice");
  const [bookmarks, setBookmarks] = useState<string[]>([]), [viewer, setViewer] = useState<Place | null>(null), [upload, setUpload] = useState(false), [guide, setGuide] = useState(false);
  const [toast, setToast] = useState(""), [report, setReport] = useState<Place | null>(null), [reason, setReason] = useState(""), [deleting, setDeleting] = useState<Place | null>(null);
  const [actionBusy, setActionBusy] = useState(false), [actionError, setActionError] = useState("");
  const loadRequest = useRef<Promise<User | null> | null>(null);
  const loadScenes = useCallback((cursor?: string): Promise<User | null> => {
    // Reuse an in-flight request so first-visit cookie creation cannot race.
    if (loadRequest.current) return loadRequest.current;
    setLoading(true); setApiError("");
    const fetchScenes = async () => {
      const controller = new AbortController(), timeout = window.setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(`/api/scenes${cursor ? `?before=${encodeURIComponent(cursor)}` : ""}`, { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        const data = await response.json() as { scenes: Place[]; user: User | null; nextCursor: string | null; error?: string };
        if (!response.ok) throw new Error(data.error || "服务暂时不可用，请稍后重试。");
        setCommunity(old => cursor ? [...old, ...data.scenes.filter(scene => !old.some(item => item.id === scene.id))] : data.scenes);
        setUser(data.user); setNextCursor(data.nextCursor || null);
        return data.user;
      } catch (error) { setApiError(error instanceof Error && error.name !== "AbortError" ? error.message : "服务暂时不可用，请稍后重试。"); return null; }
      finally { window.clearTimeout(timeout); }
    };
    const request = (async () => {
      try {
        // Serialize cookie bootstrap across tabs where Web Locks is supported.
        return navigator.locks?.request
          ? await navigator.locks.request("earthweave-session", fetchScenes)
          : await fetchScenes();
      } catch (error) { setApiError(error instanceof Error ? error.message : "服务暂时不可用，请稍后重试。"); return null; }
      finally { setLoading(false); loadRequest.current = null; }
    })();
    loadRequest.current = request;
    return request;
  }, []);
  const prepareContributor = useCallback(async () => {
    const contributor = await loadScenes();
    if (!contributor) throw new Error("无法准备浏览器会话，请允许 Cookie 并重试。");
    return contributor;
  }, [loadScenes]);
  useEffect(() => { void loadScenes(); try { const saved = JSON.parse(localStorage.getItem("earthweave-bookmarks") || "[]"); if (Array.isArray(saved)) setBookmarks(saved.filter(value => typeof value === "string")); } catch {} }, [loadScenes]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3600); return () => clearTimeout(timer); }, [toast]);
  const examples = useMemo(() => demos(t), [t]), labels = kinds(t);
  const all = useMemo(() => [...examples, ...community], [community, examples]);
  const visible = useMemo(() => {
    let result = view === "community" ? community : view === "mine" ? community.filter(scene => scene.authorId === user?.id) : view === "saved" ? all.filter(scene => bookmarks.includes(scene.id)) : all;
    if (filter === "panorama") result = result.filter(scene => scene.kind === "panorama" || scene.kind === "video360");
    if (filter === "photo") result = result.filter(scene => scene.kind === "photo");
    if (filter === "video") result = result.filter(scene => scene.kind === "video" || scene.kind === "video360");
    const normalized = query.trim().toLocaleLowerCase();
    if (normalized) result = result.filter(scene => `${scene.title} ${scene.description} ${scene.location || ""} ${scene.author} ${scene.device} ${scene.sourceAttribution || ""}`.toLocaleLowerCase().includes(normalized));
    return result;
  }, [all, community, view, filter, query, bookmarks, user]);
  const selected = all.find(scene => scene.id === selectedId) || examples[0];
  const focus = useMemo(() => ({ lat: selected.lat, lng: selected.lng }), [selected.lat, selected.lng]), saved = bookmarks.includes(selected.id);
  const deviceLabel = (device: string) => { const match = DEVICES.find(pair => pair[0] === device); return match ? t(match[0], match[1]) : device; };
  const contributorName = (name: string, id: string) => name === `探索者 ${id.slice(0, 6)}` ? t(name, `Explorer ${id.slice(0, 6)}`) : name;
  const viewerSource = viewer && (viewer.source === "demo" ? examples.find(scene => scene.id === viewer.id) || viewer : viewer);
  const viewerScene = viewerSource && { ...viewerSource, author: contributorName(viewerSource.author, viewerSource.authorId) };
  function save(place: Place) {
    const next = bookmarks.includes(place.id) ? bookmarks.filter(id => id !== place.id) : [...bookmarks, place.id]; setBookmarks(next);
    try { localStorage.setItem("earthweave-bookmarks", JSON.stringify(next)); }
    catch { setToast(t("已在本次会话收藏；浏览器未允许持久保存。", "Saved for this session. Your browser did not allow persistent storage.")); return; }
    setToast(next.includes(place.id) ? t("已收藏，保存在这台设备的浏览器中", "Saved in this device’s browser") : t("已取消收藏", "Removed from saved places"));
  }
  async function sendReport(event: FormEvent) {
    event.preventDefault(); if (!report || actionBusy) return; setActionBusy(true); setActionError("");
    try {
      await prepareContributor();
      const response = await fetch(`/api/scenes/${encodeURIComponent(report.id)}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || t("举报提交失败。", "The report could not be submitted."));
      setReport(null); setReason(""); setToast(t("举报已记录，供站点管理者后续处理", "Report saved for the site administrator to review"));
    } catch (error) { setActionError(error instanceof Error ? error.message : t("举报提交失败。", "The report could not be submitted.")); }
    finally { setActionBusy(false); }
  }
  async function removeScene() {
    if (!deleting || actionBusy) return; setActionBusy(true); setActionError("");
    try {
      await prepareContributor();
      const response = await fetch(`/api/scenes/${encodeURIComponent(deleting.id)}`, { method: "DELETE" }), data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || t("删除失败。", "Deletion failed."));
      setCommunity(old => old.filter(scene => scene.id !== deleting.id)); setSelectedId("demo-venice"); setDeleting(null); setToast(t("影像已删除", "Media deleted"));
    } catch (error) { setActionError(error instanceof Error ? error.message : t("删除失败。", "Deletion failed.")); }
    finally { setActionBusy(false); }
  }
  const navigation = [{ id: "explore" as View, label: t("探索地球", "Explore"), icon: Compass }, { id: "community" as View, label: t("共同构建", "Community"), icon: Users }, { id: "saved" as View, label: t("我的收藏", "Saved"), icon: Bookmark }, { id: "mine" as View, label: t("我的贡献", "My uploads"), icon: Layers }];
  const viewTitle = { explore: t("下一站，去哪里？", "Where to next?"), community: t("世界，由我们共同记录", "A world we document together"), saved: t("把想去的地方，留在这里", "Keep the places you want to visit"), mine: t("你为世界留下的视角", "Your perspectives on the world") }[view];
  return <div className="app-shell">
    <aside className="rail">
      <button className="brand-mark" aria-label={t("共境首页", "Earthweave home")} onClick={() => { setView("explore"); setQuery(""); setFilter("all"); }}><Globe2 size={26} /></button>
      <nav className="rail-nav" aria-label={t("主导航", "Main navigation")}>{navigation.map(item => <button key={item.id} className={view === item.id ? "active" : ""} title={item.label} aria-label={item.label} aria-current={view === item.id ? "page" : undefined} onClick={() => setView(item.id)}><item.icon size={21} /><span>{item.label}</span></button>)}</nav>
      <button className="help-button" onClick={() => setGuide(true)} aria-label={t("了解共境", "About Earthweave")} title={t("了解共境", "About Earthweave")}><HelpCircle size={21} /></button>
      <span className="avatar" title={user ? `${t("当前浏览器的贡献者", "Contributor in this browser")}: ${contributorName(user.name, user.id)}` : t("无需账号，直接参与", "No account needed — join in")} aria-label={t("浏览器贡献者身份", "Browser contributor identity")}><Users size={17} /></span>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <a className="wordmark" href="/">{t("共境", "Earthweave")}<span>{language === "zh" ? "EARTHWEAVE" : "SHARED EARTH"}</span><small className="alpha">{t("早期体验", "EARLY ACCESS")}</small></a>
        <label className="search"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t("寻找一个地方、一种风景…", "Find a place, a landscape…")} aria-label={t("搜索地点", "Search places")} />{query && <button onClick={() => setQuery("")} aria-label={t("清除搜索", "Clear search")}><X size={14} /></button>}</label>
        <button className="language-toggle" onClick={() => { setLanguage(language === "zh" ? "en" : "zh"); setToast(""); }} aria-label={t("切换到英文", "Switch to Chinese")}><span className={language === "en" ? "selected" : ""}>EN</span><span aria-hidden="true"> / </span><span className={language === "zh" ? "selected" : ""}>中文</span></button>
        <button className="upload-top" onClick={() => setUpload(true)}><Plus size={18} /><span>{t("贡献一片世界", "Add your perspective")}</span></button>
      </header>
      <main className="main">
        <section className="exploration" aria-label={t("地球探索", "Explore the globe")}>
          <div className="globe-zone">
            <div className="intro"><p className="eyebrow"><span className="live-dot" />{t("我们共同构建的世界", "A WORLD WE BUILD TOGETHER")}</p><h1>{t("世界很大，", "A big world.")}<br />{t("一起去看看", "Let’s see it together")}<span>{t("。", ".")}</span></h1><p>{t("你眼中的日常，", "Your everyday view")}<br />{t("可能是另一个人从未见过的世界。", "could be someone else’s first discovery.")}</p></div>
            <Globe scenes={visible} selectedId={selected.id} onSelect={setSelectedId} focus={focus} />
            <div className="globe-bottom"><span className="planet-label"><Globe2 size={14} />{t("地球 / EARTH", "EARTH")}</span><span>{t("拖动旋转 · 滚轮缩放 · 点击光点", "Drag to rotate · Scroll to zoom · Select a pin")}</span><span><i />{community.length}{nextCursor ? "+" : ""} {t("条社区影像", "community records")} · {examples.length} {t("个示例", "demos")}</span></div>
          </div>
          <aside className="destination" aria-label={t("当前地点", "Selected place")}>
            <div className="panel-label"><span>{t("此刻，抵达这里", "BE HERE, NOW")}</span><ArrowUpRight size={16} /></div>
            <div className="destination-photo">
              {selected.kind === "video" || selected.kind === "video360" ? <video src={selected.url} muted playsInline preload="metadata" aria-label={selected.title} /> : <img src={selected.url} alt={selected.title} />}
              <span className="media-badge">{selected.kind === "panorama" || selected.kind === "video360" ? <Headset size={13} /> : selected.kind === "video" ? <Video size={13} /> : <ImageIcon size={13} />}{labels[selected.kind]}</span>
              <button className={`save-button ${saved ? "saved" : ""}`} onClick={() => save(selected)} aria-label={saved ? t("取消收藏当前地点", "Unsave this place") : t("收藏当前地点", "Save this place")}><Bookmark size={17} fill={saved ? "currentColor" : "none"} /></button>
            </div>
            <div className="destination-info">
              <p className="location"><MapPin size={13} />{selected.location || t("社区记录 · 地理定位", "Community record · Geolocated")}<span>{selected.source === "demo" ? t("示例", "Demo") : t("社区", "Community")}</span></p>
              <h2>{selected.title}</h2><p className="coordinate">{coordinates(selected)}</p>
              <button className="enter-button" onClick={() => setViewer(selected)}><Headset size={18} />{selected.kind === "panorama" || selected.kind === "video360" ? t("进入这个世界", "Step into this place") : t("打开这段记录", "Open this memory")}<ArrowRight size={18} /></button>
              <p className="viewer-hint">{selected.kind === "panorama" || selected.kind === "video360" ? t("手机 / 电脑环顾 · WebXR 头显体验", "Look around on mobile / desktop · WebXR in VR") : t("普通影像 · 平面浏览", "Standard media · Flat view")}</p>
              <div className="source-row"><span className="source-avatar">{selected.source === "demo" ? "P" : contributorName(selected.author, selected.authorId).slice(0, 1)}</span><div><strong>{selected.source === "community" ? `${t("上传者", "Uploaded by")} · ` : ""}{contributorName(selected.author, selected.authorId)}</strong><span>{selected.source === "demo" ? t("开放许可示例", "Open-license demo") : deviceLabel(selected.device)} · {selected.license}</span>{selected.sourceAttribution && <span>{t("原作者 / 来源", "Original creator / source")}: {selected.sourceAttribution}</span>}</div>{selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer" aria-label={t("查看影像来源", "View media source")} title={t("查看影像来源", "View media source")}><ArrowUpRight size={16} /></a>}</div>
              {selected.source === "community" && <div className="record-actions"><button onClick={() => { setReport(selected); setReason(""); setActionError(""); }}><Flag size={12} />{t("举报", "Report")}</button>{selected.authorId === user?.id && <button onClick={() => { setDeleting(selected); setActionError(""); }}><Trash2 size={12} />{t("删除我的影像", "Delete my media")}</button>}</div>}
            </div>
          </aside>
        </section>
        <section className="collection" aria-labelledby="collection-heading">
          <div className="section-heading"><div><p className="eyebrow">{t("一扇扇看见世界的窗", "LITTLE WINDOWS INTO THE WORLD")}</p><h2 id="collection-heading">{viewTitle}</h2></div><button className="text-button" onClick={() => setGuide(true)}>{t("共境如何生长", "How Earthweave grows")} <ArrowUpRight size={15} /></button></div>
          {view === "mine" && <p className="field-note">{t("这里展示由当前浏览器上传的贡献，无需账号。管理身份保存在 Cookie 中；清除 Cookie 或更换浏览器后，将无法管理原来的影像。", "These are contributions made from this browser, with no account required. Your management identity is stored in a cookie. Clearing cookies or changing browsers removes access to manage earlier uploads.")}</p>}
          <div className="filter-row"><div className="filters">{([{ id: "all", label: t("所有视角", "All perspectives"), icon: Globe2 }, { id: "panorama", label: labels.panorama, icon: Headset }, { id: "photo", label: labels.photo, icon: ImageIcon }, { id: "video", label: labels.video, icon: Video }] as const).map(item => <button key={item.id} className={filter === item.id ? "selected" : ""} onClick={() => setFilter(item.id)}><item.icon size={14} />{item.label}</button>)}</div><span className="sort-label">{loading ? t("正在连接世界…", "Connecting to the world…") : `${visible.length} ${t("个视角", "perspectives")}${view === "saved" ? t(" · 本机收藏", " · Saved on this device") : ""}`}</span></div>
          {apiError && <div className="api-error" role="alert"><span>{t("社区服务：", "Community service: ")}{t(apiError)} {t("示例仍可体验。", "Demo experiences are still available.")}</span><button onClick={() => void loadScenes()}>{t("重新连接", "Retry")}</button></div>}
          {visible.length ? <div className="scene-grid">
            {visible.map(place => <article className={`scene-card ${selected.id === place.id ? "is-selected" : ""}`} key={place.id}>
              <button className="card-image" onClick={() => { setSelectedId(place.id); setViewer(place); }} aria-label={`${t("进入", "Enter")} ${place.title}`}>
                {place.kind === "video" || place.kind === "video360" ? <video src={place.url} muted playsInline preload="metadata" /> : <img src={place.url} alt={place.title} loading="lazy" />}
                <span className="media-badge">{labels[place.kind]}</span><span className="card-enter"><ArrowUpRight size={18} /></span>
              </button>
              <button className="card-title" onClick={() => setSelectedId(place.id)}>{place.title}<ChevronRight size={15} /></button>
              <div className="card-bottom"><span><MapPin size={11} />{place.location || `${place.lat.toFixed(2)}°, ${place.lng.toFixed(2)}°`}</span><span>{place.source === "demo" ? t("示例", "Demo") : t("社区", "Community")}</span></div>
              {place.sourceAttribution && <p className="card-attribution">{t("来源", "Source")}: {place.sourceAttribution}</p>}
            </article>)}
            <button className="contribute-card" onClick={() => setUpload(true)}><span className="contribute-icon"><Plus size={26} /></span><strong>{t("世界，还缺少你的视角", "The world needs your perspective")}</strong><p>{t("把脚下的风景，", "Turn the place beneath your feet")}<br />{t("变成别人的远方。", "into someone else’s new horizon.")}</p><span className="contribute-link">{t("上传第一份影像", "Share your first view")} <ArrowUpRight size={14} /></span></button>
          </div> : <div className="empty-state"><Globe2 size={32} /><h3>{query ? t("还没有找到这个地方", "We haven’t found that place yet") : view === "mine" ? t("你的旅程，从第一份影像开始", "Your journey starts with one view") : view === "saved" ? t("这里会记住你想去的地方", "Keep your future destinations here") : t("这一片世界，等你来点亮", "This part of the world is waiting for you")}</h3><p>{query ? t("试试其他关键词，或者上传这个地方的第一份记录。", "Try another search, or contribute the first record of this place.") : view === "saved" ? t("在地点卡片上点击收藏，保存在当前浏览器。", "Use the bookmark on a place card to save it in this browser.") : t("真实的社区贡献会展示在这里。", "Real community contributions will appear here.")}</p><button className="primary" onClick={() => setUpload(true)}><Plus size={16} />{t("贡献一片世界", "Add your perspective")}</button></div>}
          {nextCursor && <button className="text-button" disabled={loading} onClick={() => void loadScenes(nextCursor)}>{t("加载更多社区记录", "Load more community records")} <ChevronRight size={15} /></button>}
        </section>
      </main>
    </div>
    {toast && <div className="toast" role="status"><Check size={16} />{t(toast)}</div>}
    {viewerScene && <ImmersiveViewer scene={viewerScene} onClose={() => setViewer(null)} />}
    {upload && <UploadDialog prepareContributor={prepareContributor} onClose={() => setUpload(false)} onUploaded={place => { setCommunity(old => [place, ...old]); setSelectedId(place.id); setView("explore"); setFilter("all"); setQuery(""); setUpload(false); setToast(t("影像已保存，地球上又多了一个视角", "Media saved. A new perspective has joined the globe.")); }} />}
    {guide && <Guide onClose={() => setGuide(false)} />}
    {report && <Modal title={t("报告这份影像的问题", "Report a problem with this media")} onClose={() => setReport(null)} busy={actionBusy}><p className="modal-description">{t("无需账号即可举报。举报会记录在站点数据库中，供管理者后续处理；不会立即自动下架。", "No account is required to report media. Reports are stored for administrator review and do not automatically remove media.")}</p><form onSubmit={sendReport}><label className="field full"><span>{t("问题说明", "Describe the issue")}</span><textarea value={reason} onChange={event => setReason(event.target.value)} disabled={actionBusy} required minLength={5} maxLength={1000} rows={4} placeholder={t("例如：涉及隐私、无权上传，或地点信息不准确…", "For example: privacy concerns, missing upload rights, or an inaccurate location…")} /></label>{actionError && <p className="form-error" role="alert">{t(actionError)}</p>}<button type="submit" className="primary wide" disabled={actionBusy}>{actionBusy ? t("正在提交…", "Submitting…") : t("提交举报", "Submit report")}</button></form></Modal>}
    {deleting && <Modal title={t("删除这份影像？", "Delete this media?")} onClose={() => setDeleting(null)} busy={actionBusy}><p className="modal-description">“{deleting.title}” {t("将从社区与地球上移除，服务器中的影像文件也会被删除。此操作无法撤销。", "will be removed from the community and globe, and its server file will be deleted. This cannot be undone.")}</p>{actionError && <p className="form-error" role="alert">{t(actionError)}</p>}<button className="primary danger wide" disabled={actionBusy} onClick={removeScene}>{actionBusy ? t("正在删除…", "Deleting…") : t("确认删除我的影像", "Delete my media")}</button></Modal>}
  </div>;
}

function Modal({ title, children, onClose, wide = false, busy = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; busy?: boolean }) {
  const { t } = useI18n(); const dialog = useRef<HTMLDivElement>(null); const close = useRef(onClose); close.current = busy ? () => {} : onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; dialog.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
      if (event.key !== "Tab" || !dialog.current) return;
      const targets = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')).filter(el => el.getClientRects().length > 0);
      const first = targets[0], last = targets[targets.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keyboard); previous?.focus?.(); };
  }, []);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close.current(); }}><div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} ref={dialog}><div className="modal-heading"><h2 id="modal-title">{title}</h2><button className="icon-button" type="button" onClick={() => close.current()} disabled={busy} aria-label={t("关闭窗口", "Close dialog")}><X size={20} /></button></div>{children}</div></div>;
}

function UploadDialog({ prepareContributor, onClose, onUploaded }: { prepareContributor: () => Promise<User>; onClose: () => void; onUploaded: (scene: Place) => void }) {
  const { t } = useI18n();
  const [source, setSource] = useState<"file" | "url">("file"), [url, setUrl] = useState(""), [sourceAttribution, setSourceAttribution] = useState("");
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState(""), [kind, setKind] = useState<SceneKind>("photo");
  const [title, setTitle] = useState(""), [description, setDescription] = useState(""), [lat, setLat] = useState(""), [lng, setLng] = useState("");
  const [device, setDevice] = useState("手机"), [license, setLicense] = useState("CC-BY-4.0"), [consent, setConsent] = useState(false);
  const [error, setError] = useState(""), [uploading, setUploading] = useState(false), [progress, setProgress] = useState(0), [locating, setLocating] = useState(false);
  const [phase, setPhase] = useState<"preparing" | "checking" | "fetching" | "uploading" | "saving">("checking");
  const xhrRef = useRef<XMLHttpRequest | null>(null), abortRef = useRef<AbortController | null>(null), mountedRef = useRef(true), submittingRef = useRef(false);
  const directPreview = useMemo(() => { try { const link = new URL(url.trim()); return link.protocol === "https:" && !link.username && !link.password && (!link.port || link.port === "443") && link.hostname.includes(".") && !link.hostname.endsWith(".local") && !link.hostname.endsWith(".localhost") && !/^[\d.]+$/.test(link.hostname) ? link.href : ""; } catch { return ""; } }, [url]);
  useEffect(() => { if (!file) { setPreview(""); return; } const objectUrl = URL.createObjectURL(file); setPreview(objectUrl); return () => URL.revokeObjectURL(objectUrl); }, [file]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; xhrRef.current?.abort(); abortRef.current?.abort(); }; }, []);
  function chooseFile(next?: File) {
    if (!next) return; setError("");
    if (next.size > MAX_BYTES) { setError(t("单个文件最多 32 MB，请先压缩或截取视频。", "Files must be 32 MB or smaller. Compress or trim your video first.")); return; }
    if (!/\.(jpe?g|png|webp|mp4|webm)$/i.test(next.name)) { setError(t("请选择 JPG、PNG、WebP、MP4 或 WebM 文件。", "Choose a JPG, PNG, WebP, MP4 or WebM file.")); return; }
    const isVideo = /\.(mp4|webm)$/i.test(next.name);
    setKind(current => isVideo ? (current === "video360" ? current : "video") : (current === "panorama" ? current : "photo"));
    setFile(next); if (!title) setTitle(next.name.replace(/\.[^.]+$/, "").slice(0, 100));
  }
  function useSample(index: number) {
    const sample = demos(t)[index], asset = index === 0 ? "venice_sunset" : "spruit_sunrise";
    setUrl(`https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/${asset}.jpg`); setTitle(sample.title);
    setDescription(`${t("原始来源", "Original source")}: ${sample.sourceUrl}. ${t("地图位置为场景区域的近似定位。", "The map pin marks the approximate scene area.")}`);
    setSourceAttribution("Greg Zaal / Poly Haven"); setLat(String(sample.lat)); setLng(String(sample.lng)); setKind("panorama"); setLicense("CC0-1.0"); setDevice("互联网素材"); setConsent(false); setError("");
  }
  function locate() {
    if (!navigator.geolocation) { setError(t("当前浏览器不支持定位，请手动填写经纬度。", "This browser does not support location. Enter coordinates manually.")); return; }
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(position => { if (!mountedRef.current) return; setLat(position.coords.latitude.toFixed(6)); setLng(position.coords.longitude.toFixed(6)); setLocating(false); }, () => { if (!mountedRef.current) return; setError(t("无法获取位置。请允许定位权限，或手动填写拍摄地点。", "Location is unavailable. Allow location access or enter the capture coordinates.")); setLocating(false); }, { enableHighAccuracy: true, timeout: 12000 });
  }
  async function downloadInBrowser(mediaUrl: string, controller: AbortController) {
    const timer = window.setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(mediaUrl, { signal: controller.signal, mode: "cors", credentials: "omit", referrerPolicy: "no-referrer", redirect: "error" });
      if (!response.ok) throw new Error(t(`远程服务返回 ${response.status}。`, `The remote server returned ${response.status}.`));
      const length = Number(response.headers.get("Content-Length"));
      if (Number.isFinite(length) && length > MAX_BYTES) throw new Error(t("远程文件超过 32 MB。", "The remote file exceeds 32 MB."));
      const mime = (response.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
      const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm" };
      if (!extensions[mime]) throw new Error(t("链接没有返回支持的图片或视频，请使用媒体文件直链。", "The URL did not return a supported image or video. Use a direct media URL."));
      if (!response.body) throw new Error(t("远程文件没有可读取的内容。", "The remote file has no readable content."));
      const reader = response.body.getReader(), chunks: BlobPart[] = []; let received = 0;
      try { while (true) { const result = await reader.read(); if (result.done) break; received += result.value.byteLength; if (received > MAX_BYTES) { controller.abort(); throw new Error(t("远程文件超过 32 MB。", "The remote file exceeds 32 MB.")); } chunks.push(result.value.slice().buffer); if (mountedRef.current && length > 0) setProgress(Math.min(100, Math.round(received / length * 100))); } }
      finally { reader.releaseLock(); }
      if (!received) throw new Error(t("远程文件为空。", "The remote file is empty."));
      return new File(chunks, `import.${extensions[mime]}`, { type: mime });
    } finally { window.clearTimeout(timer); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (submittingRef.current) return; setError("");
    if (source === "file" && !file) { setError(t("请先选择一张照片或一段视频。", "Choose a photo or video first.")); return; }
    const latitude = Number(lat), longitude = Number(lng);
    if (!lat.trim() || !lng.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) { setError(t("请填写有效的拍摄经纬度：纬度 −90～90，经度 −180～180。", "Enter valid capture coordinates: latitude −90 to 90, longitude −180 to 180.")); return; }
    if (!title.trim()) { setError(t("请为这个地点起一个名字。", "Give this place a name.")); return; }
    if (!consent) { setError(t("请确认上传权利和共享许可。", "Confirm your rights and sharing license.")); return; }
    let mediaUrl: URL | null = null;
    if (source === "url") {
      try { mediaUrl = new URL(url.trim()); if (mediaUrl.protocol !== "https:" || mediaUrl.username || mediaUrl.password || (mediaUrl.port && mediaUrl.port !== "443") || !mediaUrl.hostname.includes(".") || mediaUrl.hostname.endsWith(".local") || mediaUrl.hostname.endsWith(".localhost") || mediaUrl.hostname === "localhost" || /^[\d.]+$/.test(mediaUrl.hostname) || mediaUrl.hostname.includes(":")) throw new Error(); }
      catch { setError(t("请输入公开的 HTTPS 图片或视频直链，不支持网页、内网地址或含登录信息的链接。", "Enter a public HTTPS media URL. Webpages, local addresses and URLs with login credentials are not supported.")); return; }
      if (!sourceAttribution.trim()) { setError(t("请填写原作者或来源署名。", "Enter the original creator or source attribution.")); return; }
    }
    // Freeze all submitted values before decoding or network work.
    const metadata = { title: title.trim(), description: description.trim(), lat: latitude, lng: longitude, kind, device, license, rightsConfirmed: true, sourceAttribution: sourceAttribution.trim() };
    submittingRef.current = true; setUploading(true); setProgress(0); setPhase("preparing");
    const fail = (message: string) => { if (!mountedRef.current) return; submittingRef.current = false; setUploading(false); setError(message); };
    try { await prepareContributor(); }
    catch (reason) { fail(t(reason instanceof Error ? reason.message : "无法准备浏览器会话，请允许 Cookie 并重试。")); return; }
    if (!mountedRef.current) return;
    setPhase("checking");
    const controller = new AbortController(); abortRef.current = controller; let selectedFile = file;
    if (mediaUrl && IMPORT_HOSTS.has(mediaUrl.hostname)) {
      setPhase("fetching"); const timer = window.setTimeout(() => controller.abort(), 180000);
      try {
        const response = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...metadata, url: mediaUrl.href }), signal: controller.signal });
        const data = await response.json() as { scene?: Place; error?: string };
        if (!mountedRef.current) return;
        if (!response.ok || !data.scene) { fail(t(data.error || "导入失败。", data.error ? undefined : "Import failed.")); return; }
        submittingRef.current = false; setUploading(false); onUploaded(data.scene);
      } catch (reason) { fail(reason instanceof Error && reason.name === "AbortError" ? t("导入超时，请稍后重试。", "The import timed out. Please try again.") : t("无法连接导入服务，请稍后重试。", "The import service could not be reached. Please try again.")); }
      finally { window.clearTimeout(timer); }
      return;
    }
    if (mediaUrl) {
      setPhase("fetching");
      try { selectedFile = await downloadInBrowser(mediaUrl.href, controller); }
      catch (reason) { fail(`${reason instanceof Error && !(reason instanceof TypeError) ? reason.message : t("浏览器无法读取此链接，来源可能不允许跨域访问。", "Your browser could not read this URL. The source may block cross-origin access.")} ${t("请先在来源网站下载文件，再选择“本地上传”。", "Download the file from its source, then choose Local upload.")}`); return; }
    }
    if (!mountedRef.current || !selectedFile) return;
    const isVideo = selectedFile.type.startsWith("video/") || /\.(mp4|webm)$/i.test(selectedFile.name);
    if (isVideo !== (kind === "video" || kind === "video360")) { fail(t("影像类型与文件不匹配，请重新选择类型。", "The media type does not match the file. Choose the correct type.")); return; }
    setPhase("checking");
    if (!isVideo) {
      try { const bitmap = await createImageBitmap(selectedFile); const ratio = bitmap.width / bitmap.height; bitmap.close(); if (!mountedRef.current) return; if (kind === "panorama" && Math.abs(ratio - 2) > 0.05) { fail(t("360° 全景需要完整的 2:1 等距柱状投影照片；普通照片请选“照片”。", "A 360° panorama requires a complete 2:1 equirectangular image. Choose Photo for ordinary images.")); return; } }
      catch { fail(t("无法读取这张照片，请使用有效的 JPG、PNG 或 WebP 文件。", "This image cannot be read. Use a valid JPG, PNG or WebP file.")); return; }
    }
    if (!mountedRef.current) return;
    const form = new FormData(); form.set("file", selectedFile); Object.entries(metadata).forEach(([key, value]) => form.set(key, String(value))); if (mediaUrl) form.set("sourceUrl", mediaUrl.href);
    const xhr = new XMLHttpRequest(); xhrRef.current = xhr; xhr.open("POST", "/api/scenes"); xhr.responseType = "json"; xhr.timeout = 180000;
    xhr.upload.onprogress = event => { if (!mountedRef.current) return; if (event.lengthComputable) { setProgress(Math.round(event.loaded / event.total * 100)); if (event.loaded === event.total) setPhase("saving"); } };
    xhr.onload = () => { if (!mountedRef.current) return; submittingRef.current = false; setUploading(false); if (xhr.status >= 200 && xhr.status < 300 && xhr.response?.scene) { onUploaded(xhr.response.scene); return; } setError(t(xhr.response?.error || `上传未成功（${xhr.status}），请重试。`, xhr.response?.error ? undefined : `Upload failed (${xhr.status}). Please try again.`)); };
    xhr.onerror = () => fail(t("网络连接中断，影像尚未确认上传成功，请重试。", "Connection interrupted. Upload completion could not be confirmed. Please try again."));
    xhr.ontimeout = () => fail(t("上传超时，请检查网络后重试。", "The upload timed out. Check your connection and try again."));
    setProgress(0); setPhase("uploading"); try { xhr.send(form); } catch { fail(t("浏览器无法开始上传，请重新选择文件后重试。", "The browser could not start uploading. Choose the file again.")); }
  }
  return <Modal title={t("把你看见的，留给世界", "Share your view of the world")} onClose={onClose} wide>
    <p className="modal-description">{t("一张照片，一段影像，都能为地球增加一个新的视角。", "Every photo and video adds a new perspective to our planet.")}</p>
    <p className="field-note">{t("无需账号，提交后即可加入世界。当前浏览器会保存贡献管理身份；清除 Cookie 或更换浏览器后，将无法管理原来的影像。", "No account is needed to contribute. This browser remembers your management identity. Clearing cookies or changing browsers removes access to manage earlier uploads.")}</p>
    <div className="import-tabs"><button type="button" className={source === "file" ? "selected" : ""} disabled={uploading} onClick={() => { setSource("file"); setDevice("手机"); setSourceAttribution(""); setError(""); }}>{t("本地上传", "Local upload")}</button><button type="button" className={source === "url" ? "selected" : ""} disabled={uploading} onClick={() => { setSource("url"); setDevice("互联网素材"); setError(""); }}>{t("互联网导入", "Import from URL")}</button></div>
    <form onSubmit={submit}>
      {source === "file" ? <label className={`dropzone ${file ? "has-file" : ""}`} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!uploading) chooseFile(event.dataTransfer.files[0]); }}>
        <input type="file" accept=".jpg,.jpeg,.png,.webp,.mp4,.webm,image/jpeg,image/png,image/webp,video/mp4,video/webm" disabled={uploading} onChange={event => chooseFile(event.target.files?.[0])} aria-label={t("选择照片或视频", "Choose a photo or video")} />
        {file ? <>{/\.(mp4|webm)$/i.test(file.name) ? <Video size={36} /> : <img className="file-preview" src={preview} alt={t("待上传照片预览", "Photo preview")} />}<strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(1)} MB · {t("点击更换文件", "Click to choose another file")}</span></> : <><span className="upload-circle"><CloudUpload size={26} /></span><strong>{t("拖入影像，或点击选择文件", "Drop media here, or click to browse")}</strong><span>{t("照片 / 360° 全景 / 视频 · 单个文件最多 32 MB", "Photos / 360° panoramas / Videos · Up to 32 MB each")}</span></>}
      </label> : <div className="url-import">
        <label className="field full"><span>{t("媒体文件直链", "Direct media URL")} *</span><input type="url" value={url} onChange={event => { setUrl(event.target.value); setConsent(false); }} required placeholder="https://…/image.jpg" disabled={uploading} /></label>
        {directPreview && <a className="text-button source-preview" href={directPreview} target="_blank" rel="noopener noreferrer">{t("在新标签页预览原始文件", "Preview the original file in a new tab")} <ArrowUpRight size={14} /></a>}
        <p className="field-note">{t("粘贴公开的 HTTPS 图片或视频文件链接，不是介绍页面。支持 JPG、PNG、WebP、MP4、WebM，最多 32 MB。", "Paste a public HTTPS image or video file URL, not a webpage. JPG, PNG, WebP, MP4 and WebM are supported, up to 32 MB.")}</p>
        <div className="source-helper"><span>{t("试试开放许可全景：", "Try an open-license panorama:")}</span><button type="button" className="text-button" disabled={uploading} onClick={() => useSample(0)}>{t("威尼斯日落", "Venice sunset")}</button><button type="button" className="text-button" disabled={uploading} onClick={() => useSample(1)}>{t("南非日出", "South African sunrise")}</button></div>
        <p className="field-note">{t("Poly Haven、Wikimedia、Unsplash 和 Pexels 的指定媒体域名由服务器导入；其他来源尝试浏览器读取，需要来源允许跨域访问。链接可访问不代表拥有共享权利。", "The designated media domains of Poly Haven, Wikimedia, Unsplash and Pexels use server import. Other sources are read by your browser and must allow cross-origin access. A reachable URL does not grant sharing rights.")}</p>
        <label className="field full"><span>{t("原作者 / 来源署名", "Original creator / attribution")} *</span><input value={sourceAttribution} onChange={event => setSourceAttribution(event.target.value)} required maxLength={200} disabled={uploading} placeholder={t("例如：Greg Zaal / Poly Haven", "For example: Greg Zaal / Poly Haven")} /></label>
      </div>}
      <div className="form-grid">
        <label className="field full"><span>{t("地点名称", "Place name")} <b>*</b></span><input value={title} onChange={event => setTitle(event.target.value)} required maxLength={100} placeholder={t("例如：西湖边的清晨", "For example: morning beside West Lake")} disabled={uploading} /></label>
        <label className="field"><span>{t("影像类型", "Media type")}</span><select value={kind} onChange={event => setKind(event.target.value as SceneKind)} disabled={uploading}>{Object.entries(kinds(t)).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
        <label className="field"><span>{t("采集设备", "Capture device")}</span><select value={device} onChange={event => setDevice(event.target.value)} disabled={uploading}>{DEVICES.map(([zh, en]) => <option key={zh} value={zh}>{t(zh, en)}</option>)}</select></label>
        {(kind === "panorama" || kind === "video360") && <p className="field-note full">{t("请上传完整的 2:1 等距柱状投影影像。普通照片不会自动变成全景或三维场景。", "Use complete 2:1 equirectangular media. Ordinary photos are not automatically converted to panoramas or 3D scenes.")}</p>}
        <div className="location-heading full"><span>{t("拍摄位置", "Capture location")} <b>*</b></span><button type="button" className="text-button" onClick={locate} disabled={locating || uploading}><LocateFixed size={14} />{locating ? t("定位中…", "Locating…") : t("使用当前位置", "Use current location")}</button></div>
        <label className="field"><span>{t("纬度", "Latitude")}</span><input type="number" min={-90} max={90} step="any" required placeholder="−90 … 90" value={lat} onChange={event => setLat(event.target.value)} disabled={uploading} /></label>
        <label className="field"><span>{t("经度", "Longitude")}</span><input type="number" min={-180} max={180} step="any" required placeholder="−180 … 180" value={lng} onChange={event => setLng(event.target.value)} disabled={uploading} /></label>
        <p className="field-note full">{t("位置将展示在地球上。只有你正处于拍摄地点时，才使用当前位置。导入链接不会自动推断拍摄地点。", "The location will appear on the globe. Use your current location only at the capture site. Importing a URL does not infer its capture coordinates.")}</p>
        <label className="field full"><span>{t("关于这个地方", "About this place")}</span><textarea rows={2} value={description} maxLength={1500} onChange={event => setDescription(event.target.value)} placeholder={t("拍摄时间、地点故事，或你想分享的发现…", "When it was captured, its story, or something you discovered…")} disabled={uploading} /></label>
        <label className="field full"><span>{t("共享许可", "Sharing license")}</span><select value={license} onChange={event => setLicense(event.target.value)} disabled={uploading}><option value="CC-BY-4.0">{t("CC BY 4.0 · 允许使用，须保留署名", "CC BY 4.0 · Reuse permitted with attribution")}</option><option value="CC0-1.0">{t("CC0 · 放弃可放弃的著作权，允许自由使用", "CC0 · Waive applicable copyright; allow unrestricted reuse")}</option></select></label>
        {source === "url" && <p className="field-note full">{t("导入素材请遵循原许可证；不要改变原作者的授权。", "For imports, follow the original license; do not replace the creator’s terms.")}</p>}
      </div>
      <label className="consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={uploading} required /><span>{t("我拥有上传与共享这些影像的权利，并同意所选许可。已处理人物隐私、私人空间和敏感位置信息。", "I have the rights to upload and share this media under the selected license. I have addressed personal privacy, private spaces and sensitive locations.")}</span></label>
      {error && <div className="form-error" role="alert">{t(error)}</div>}
      {uploading && <div className="progress" role="progressbar" aria-label={t("处理进度", "Processing progress")} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>}
      <button className="primary wide" type="submit" disabled={uploading}>{uploading ? <><LoaderCircle size={17} className="spin" />{phase === "preparing" ? t("正在准备浏览器会话…", "Preparing this browser…") : phase === "checking" ? t("正在校验影像…", "Checking media…") : phase === "fetching" ? t("正在读取互联网素材…", "Fetching media from the web…") : phase === "saving" ? t("正在保存影像…", "Saving media…") : `${t("正在上传", "Uploading")} ${progress}%`}</> : <><CloudUpload size={17} />{source === "url" ? t("导入到共境", "Import to Earthweave") : t("上传到共境", "Upload to Earthweave")}</>}</button>
      <p className="upload-footnote">{t("贡献会公开展示，原始文件及其内嵌元数据会被保留。关闭窗口会取消浏览器请求；服务端已开始的导入仍可能完成，请刷新列表确认。", "Contributions are publicly visible. Original files and embedded metadata are retained. Closing this dialog cancels the browser request. An import already started on the server may still finish; refresh the list to confirm.")}</p>
    </form>
  </Modal>;
}
