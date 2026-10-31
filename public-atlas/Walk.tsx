import {useEffect,useRef,useState} from "react";
import * as T from "three";
import {useI18n} from "../lib/i18n";
import {floorAt,makeWorld,stations,type PlaceId,type Station} from "./walk-world";
import "./walk.css";
import {createXRPanel} from "./xr-panel";
import {Soundscape} from "./soundscape";
import {advance,climate,phases,DAY_SECONDS,WEATHER_SECONDS} from "./environment";

export default function Walk({place,onClose}:{place:PlaceId;onClose:()=>void}){
 const {t,language}=useI18n(),stage=useRef<HTMLDivElement>(null),exit=useRef<HTMLButtonElement>(null);
 const keys=useRef(new Set<string>()),state=useRef({day:0,weather:0,speed:1,moving:false});
 const [mode,setMode]=useState({light:0,weather:0,speed:1,moving:false}),[near,setNear]=useState<Station|null>("motion"),[metres,setMetres]=useState("0, 0");
 const [xr,setXR]=useState<"off"|"ready"|"pending"|"active">("off"),[err,setErr]=useState<""|"gl"|"xr">("");
 const startXR=useRef<()=>void>(()=>{}),reset=useRef<()=>void>(()=>{}),closeRef=useRef(onClose);
 closeRef.current=onClose;
 const audio=useRef<Soundscape|null>(null),audioBusy=useRef(false),volume=useRef(.55);
 const [sound,setSound]=useState<"off"|"on"|"error">("off");
 const soundLabel=useRef(sound);soundLabel.current=sound;
 const toggleSound=async()=>{
  if(audioBusy.current)return;
  if(audio.current){audio.current.close();audio.current=null;setSound("off");return;}
  audioBusy.current=true;
  let engine:Soundscape|undefined;
  try{engine=new Soundscape(place);audio.current=engine;await engine.ctx.resume();if(audio.current===engine){engine.level(volume.current);setSound("on");}}
  catch{if(audio.current===engine||!engine){engine?.close();audio.current=null;setSound("error");}}
  finally{audioBusy.current=false}
 };
 const sync=()=>{const s=state.current,c=climate(s.day,s.weather);setMode(old=>old.light===c.light&&old.weather===c.weather&&old.speed===s.speed&&old.moving===s.moving?old:{light:c.light,weather:c.weather,speed:s.speed,moving:s.moving});};
 const cycleSpeed=()=>{const s=state.current;s.speed=s.speed===1?4:s.speed===4?0:1;sync()};
 const interact=(id:Station)=>{const s=state.current,c=climate(s.day,s.weather);
  if(id==="weather")s.weather=({0:.56,2:.27,1:0,3:0} as Record<number,number>)[c.weather];else if(id==="light")s.day=phases[(c.light+1)%4];else s.moving=!s.moving;sync();};
 useEffect(()=>{
  const root=stage.current!,prior=document.activeElement as HTMLElement,overflow=document.body.style.overflow;
  document.body.style.overflow="hidden";exit.current?.focus();
  const restore=()=>{document.body.style.overflow=overflow;prior?.focus()};
  let r:T.WebGLRenderer;
  try{r=new T.WebGLRenderer({antialias:true,powerPreference:"high-performance"});}catch{setErr("gl");return restore;}
  r.setPixelRatio(Math.min(devicePixelRatio,1.65));root.appendChild(r.domElement);r.xr.enabled=true;
  const scene=new T.Scene(),cam=new T.PerspectiveCamera(68,1,.05,230),rig=new T.Group();rig.add(cam);scene.add(rig);
  const world=makeWorld(scene,place),canvas=r.domElement;canvas.style.touchAction="none";canvas.setAttribute("aria-label","3D");
  let panel:ReturnType<typeof createXRPanel>|null=null, summon=false,menuClock=1;
  let yaw=.78,pitch=0,dead=false,session:XRSession|null=null,busy=false,vr=false,px=0,py=0,pid=-1,drag=0,prev=0,elapsed=0,nearest:Station|null="motion";
  const spawn=()=>{rig.position.set(3,0,5);yaw=.78;pitch=0;cam.rotation.set(pitch,yaw,0,"YXZ");cam.position.set(0,1.65,0);};spawn();reset.current=spawn;
  const size=()=>{if(vr)return;const w=root.clientWidth,h=root.clientHeight;if(!w||!h)return;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()};
  const ro=new ResizeObserver(size);ro.observe(root);size();
  const clear=()=>{keys.current.clear();pid=-1};
  const keyboard=(e:KeyboardEvent)=>{if(e.altKey||e.ctrlKey||e.metaKey)return;
   if(e.code==="Escape"&&!vr){closeRef.current();return;}
   if(e.code==="KeyE"&&e.type==="keydown"&&!e.repeat&&nearest)interact(nearest);
   if(["KeyW","KeyS","KeyA","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)){e.preventDefault();if(e.type==="keydown")keys.current.add(e.code);else keys.current.delete(e.code);}
  };
  const down=(e:PointerEvent)=>{if(pid!==-1||vr)return;pid=e.pointerId;px=e.clientX;py=e.clientY;drag=0;canvas.setPointerCapture(pid)};
  const move=(e:PointerEvent)=>{if(pid!==e.pointerId)return;const dx=e.clientX-px,dy=e.clientY-py;drag+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.004;pitch=T.MathUtils.clamp(pitch-dy*.004,-1.2,1.2);px=e.clientX;py=e.clientY;};
  const ray=new T.Raycaster(),vec=new T.Vector3();
  const up=(e:PointerEvent)=>{if(pid!==e.pointerId)return;pid=-1;if(e.type==="pointercancel"||drag>8)return;const rect=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2(2*(e.clientX-rect.left)/rect.width-1,1-2*(e.clientY-rect.top)/rect.height),cam);
   const obj=ray.intersectObjects(world.beacons)[0];if(obj&&obj.distance<5.5)interact(obj.object.userData.station as Station);};
  window.addEventListener("keydown",keyboard);window.addEventListener("keyup",keyboard);window.addEventListener("blur",clear);
  const visibility=()=>{clear();const c=audio.current?.ctx;if(c){const hidden=session?session.visibilityState==="hidden":document.hidden;void (hidden?c.suspend():c.resume()).catch(()=>{});}};
  document.addEventListener("visibilitychange",visibility);
  canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",up);
  // Both hand controllers use the same target-ray action: toggle a beacon, or teleport to a walkable point.
  const lineGeo=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,0,-1)]);
  const lineMat=new T.LineBasicMaterial({color:"#91f8da"});
  for(let i=0;i<2;i++){
   const hand=r.xr.getController(i);rig.add(hand);const line=new T.Line(lineGeo,lineMat);line.scale.z=4;hand.add(line);
   hand.addEventListener("squeezestart",()=>{if(vr)summon=true});
   hand.addEventListener("select",()=>{if(!vr)return;hand.updateWorldMatrix(true,false);ray.setFromXRController(hand);
    if(panel?.select(ray,action=>{if(action==="sound")void toggleSound();else if(action==="cycle")cycleSpeed();else if(action==="hide")panel!.mesh.visible=false;else interact(action);menuClock=1;}))return;
    const hit=ray.intersectObjects(world.beacons)[0];if(hit&&hit.distance<=8){interact(hit.object.userData.station);return}
    // March against the same bridge and ground heights used for walking.
    let crossed=false;for(let d=.15;d<14;d+=.1){ray.ray.at(d,vec);const y=floorAt(place,vec.x,vec.z);if(y===null){if(vec.y<-.1)break;continue}
     if(vec.y<=y){crossed=true;break;}}
    if(crossed){const head=r.xr.getCamera();const pos=new T.Vector3();head.getWorldPosition(pos);rig.position.x+=vec.x-pos.x;rig.position.z+=vec.z-pos.z;rig.position.y=floorAt(place,vec.x,vec.z)!;}
   });
  }
  const ended=()=>{session?.removeEventListener("visibilitychange",visibility);if(panel)panel.mesh.visible=false;summon=false;session=null;visibility();busy=false;vr=false;if(!dead){setXR("ready");spawn();size();}};
  const system=navigator.xr;
  system?.isSessionSupported("immersive-vr").then(ok=>{if(ok&&!dead)setXR("ready")}).catch(()=>{});
  startXR.current=async()=>{if(!system||busy||dead)return;busy=true;setXR("pending");setErr("");let acquired:XRSession|null=null;
   try{acquired=await system.requestSession("immersive-vr",{requiredFeatures:["local-floor"]});if(dead){await acquired.end();return}session=acquired;session.addEventListener("visibilitychange",visibility);session.addEventListener("end",ended,{once:true});r.xr.setReferenceSpaceType("local-floor");cam.position.set(0,0,0);cam.rotation.set(0,0,0);await r.xr.setSession(acquired);if(!dead){vr=true;summon=true;visibility();setXR("active");}}
   catch{await acquired?.end().catch(()=>{});busy=false;if(!dead){spawn();setErr("xr");setXR("ready")}}
  };
  const vector=new T.Vector3();r.setAnimationLoop((time)=>{
   const wall=prev?Math.min(.5,Math.max(0,(time-prev)/1000)):0,dt=Math.min(.05,wall);prev=time;elapsed+=dt;const k=keys.current,axis=(a:string,b:string)=>Number(k.has(a)||k.has(b));
   let side=axis("KeyD","ArrowRight")-axis("KeyA","ArrowLeft"),forward=axis("KeyW","ArrowUp")-axis("KeyS","ArrowDown"),heading=yaw;
   if(vr){r.xr.getCamera().getWorldDirection(vector);heading=Math.atan2(-vector.x,-vector.z);
    const inputs=Array.from(session?.inputSources??[]);const src=inputs.find(src=>src.handedness==="left"&&src.gamepad)||inputs.find(src=>src.gamepad);
    const axes=src?.gamepad?.axes;if(axes&&axes.length>=2){const i=axes.length>=4?2:0;side=Math.abs(axes[i])>.16?axes[i]:0;forward=Math.abs(axes[i+1])>.16?-axes[i+1]:0;}
   }else cam.rotation.set(pitch,yaw,0,"YXZ");
   const head=vr?r.xr.getCamera().getWorldPosition(vector):vector.copy(rig.position);
   let hx=head.x,hz=head.z;const scale=dt*2.7/Math.max(1,Math.hypot(side,forward)),dx=(Math.cos(heading)*side-Math.sin(heading)*forward)*scale,dz=(-Math.sin(heading)*side-Math.cos(heading)*forward)*scale;
   if(dx&&floorAt(place,hx+dx,hz)!==null){rig.position.x+=dx;hx+=dx}
   if(dz&&floorAt(place,hx,hz+dz)!==null){rig.position.z+=dz;hz+=dz}
   rig.position.y=floorAt(place,hx,hz)??rig.position.y;
   const s=state.current;s.day=advance(s.day,wall*s.speed,DAY_SECONDS);s.weather=advance(s.weather,wall*s.speed,WEATHER_SECONDS);
   if(elapsed>.14){elapsed=0;sync();let best=4;nearest=null;for(const s of stations){const d=Math.hypot(hx-s.x,hz-s.z);if(d<best){best=d;nearest=s.id;}}setNear(nearest);setMetres(Math.round(hx-3)+", "+Math.round(5-hz));}
   const env=world.update(dt,s.day,s.weather,s.moving);audio.current?.update(env.rain,env.daylight,hx,hz,heading,world.people);
   if(vr){
    if(!panel)panel=createXRPanel(scene);
    if(summon){r.xr.updateCamera(cam);panel.show(r.xr.getCamera());summon=false;menuClock=1}
    menuClock+=wall;
    if(panel.mesh.visible&&menuClock>.12){menuClock=0;
     const zh=language==="zh",soundOn=audio.current?.ctx.state==="running";
     panel.draw(zh?"环境控制":"World controls",zh?"扳机选择 · 握把召回面板":"Trigger: select  /  Grip: recall panel",[
      audioBusy.current?(zh?"声音：正在开启":"Sound: starting"):soundOn?(zh?"声音：开 · 点击静音":"Sound on · Mute"):soundLabel.current==="error"?(zh?"重试声音 · 也可在进入 VR 前开启":"Retry sound · or enable before VR"):(zh?"声音：关 · 点击开启":"Sound off · Enable"),
      (zh?"光照：":"Light: ")+(zh?["白昼","黄昏","月夜","黎明"]:["Day","Dusk","Night","Dawn"])[env.light],
      (zh?"天气：":"Weather: ")+(zh?["晴","多云","雨","雨后"]:["Clear","Cloudy","Rain","Clearing"])[env.weather],
      (zh?"环境循环：":"World cycle: ")+(s.speed?s.speed+"×":zh?"暂停":"Paused"),zh?"收起面板":"Hide panel"
     ]);
    }
   }
   r.render(scene,cam);
  });
  return ()=>{dead=true;clear();ro.disconnect();session?.removeEventListener("end",ended);session?.removeEventListener("visibilitychange",visibility);panel?.dispose();void session?.end().catch(()=>{});r.setAnimationLoop(null);window.removeEventListener("keydown",keyboard);window.removeEventListener("keyup",keyboard);window.removeEventListener("blur",clear);document.removeEventListener("visibilitychange",visibility);audio.current?.close();audio.current=null;canvas.removeEventListener("pointerdown",down);canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerup",up);canvas.removeEventListener("pointercancel",up);world.dispose();lineGeo.dispose();lineMat.dispose();r.dispose();r.forceContextLoss();canvas.remove();restore();};
 },[place]);
 const day=[t("白昼","Day"),t("黄昏","Dusk"),t("月夜","Night"),t("黎明","Dawn")][mode.light];
 const action=near==="weather"?t("切换天气","Change weather"):near==="light"?t("切换光照","Change light"):place==="venice"?(mode.moving?t("停船","Stop boat"):t("开船","Launch boat")):(mode.moving?t("停下风车","Stop windmill"):t("启动风车","Start windmill"));
 return <div className="walk" role="dialog" aria-modal="true" aria-label={t("三维漫游","3D walk")} onKeyDown={e=>{if(e.key!=="Tab")return;const b=e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");if(e.shiftKey&&document.activeElement===b[0]){e.preventDefault();b[b.length-1]?.focus()}else if(!e.shiftKey&&document.activeElement===b[b.length-1]){e.preventDefault();b[0]?.focus()}}}>
 <div className="walk-stage" ref={stage}/><div className="walk-heading"><div><small>EARTHWEAVE / {t("模拟场景","SIMULATED")}</small><strong>{place==="venice"?t("水岸漫步","Canal walk"):t("草地小径","Grassland trail")}</strong></div><button ref={exit} onClick={onClose}>{t("返回地球","Back to globe")} ✕</button></div>
 {err==="gl"?<p className="walk-error" role="alert">{t("浏览器无法开启 WebGL。请启用硬件加速或更换浏览器。","WebGL is unavailable. Enable hardware acceleration or try another browser.")}</p>:<>
 <div className="walk-tools"><button onClick={()=>interact("light")}>{t("光照","Light")} · {day}</button><button onClick={()=>interact("weather")}>{t("天气","Weather")} · {[t("晴","Clear"),t("多云","Cloudy"),t("雨","Rain"),t("雨后","Clearing")][mode.weather]}</button><button onClick={()=>reset.current()}>{t("回到起点","Reset position")}</button><button disabled={xr!=="ready"} onClick={()=>startXR.current()}>{xr==="off"?t("未检测到 VR","VR unavailable"):t("进入 VR","Enter VR")}</button>
 <button data-cycle onClick={cycleSpeed}>{t("环境循环","World cycle")} · {mode.speed?mode.speed+"×":t("暂停","Paused")}</button>
 <button data-audio aria-pressed={sound==="on"} onClick={()=>void toggleSound()}>{sound==="on"?t("关闭声音","Mute audio"):sound==="error"?t("重试声音","Retry audio"):t("开启声音","Enable audio")}</button>
 {sound==="on"&&<label className="walk-volume">{t("音量","Volume")} <input type="range" min="0" max="1" step=".05" defaultValue={volume.current} onChange={e=>{volume.current=Number(e.target.value);audio.current?.level(volume.current)}}/></label>}
 {sound==="error"&&<span role="status" className="walk-volume">{t("声音未开启，请检查浏览器设置。","Could not start audio. Check browser settings.")}</span>}</div>
 <div className="walk-readout"><small>{t("距起点","OFFSET")}　<span data-walk-position>{metres}</span> m</small><details><summary>{t("操作指南","Controls")}</summary><span>{t("WASD / 方向键行走，拖动转头。靠近发光标记按 E，或点互动按钮。","Move with WASD / arrows; drag to look. Approach a glowing marker and press E or use the action button.")}</span><span>{t("VR：用扳机选择环境面板上的声音、天气和光照，握把可召回面板。摇杆行走，指地按扳机传送，指向标记按扳机互动。","VR: use the trigger on the environment panel for sound, weather and lighting; squeeze the grip to recall it. Move with the stick. Point and trigger to teleport or activate a marker.")}</span></details></div>
 <div className="walk-pad" aria-label={t("行走方向","Walking controls")}>{[["KeyW","↑","前进","Forward"],["KeyA","←","向左","Left"],["KeyS","↓","后退","Back"],["KeyD","→","向右","Right"]].map(([key,sym,zh,en])=><button key={key} aria-label={t(zh,en)} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);keys.current.add(key)}} onLostPointerCapture={()=>keys.current.delete(key)} onPointerUp={()=>keys.current.delete(key)} onPointerCancel={()=>keys.current.delete(key)}>{sym}</button>)}</div>
 <div className="walk-action">{err==="xr"&&<small role="alert">{t("无法开启 VR，请检查头显与地面追踪权限。","VR could not start. Check headset and floor tracking permissions.")}</small>}<button disabled={!near} onClick={()=>near&&interact(near)}>{near?"◇ "+action:t("靠近发光标记","Approach a glowing marker")}</button></div></>}
 </div>;
}
