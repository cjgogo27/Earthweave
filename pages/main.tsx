import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import Globe from "../app/components/Globe";
import Viewer from "../app/components/ImmersiveViewer";
import {I18nProvider,useI18n} from "../lib/i18n";
import "./style.css";

const scenes=[
 {id:"venice",lat:45.4303,lng:12.3541,zh:"威尼斯水岸",en:"Venice waterfront",where:["意大利 · 威尼斯","Venice · Italy"],caption:["从水边望向日落时分的运河与城市。","Look across the water towards the canals and the city at sunset."],asset:"venice_sunset"},
 {id:"spruit",lat:-26.1227,lng:28.0154,zh:"清晨的草地",en:"Grasslands at dawn",where:["南非 · 约翰内斯堡","Johannesburg · South Africa"],caption:["在草地的小径上环顾四周，感受清晨的光线。","Stand on a grassland path and look around in the early morning light."],asset:"spruit_sunrise"}
];
function Atlas(){
 const {language,setLanguage,t}=useI18n();
 const [id,setId]=useState(()=>scenes.find(s=>"#"+s.id===location.hash)?.id||"venice");
 const [inside,enter]=useState(false);
 const place=scenes.find(s=>s.id===id)||scenes[0];
 const pick=(value:string)=>{setId(value);history.replaceState(null,"","#"+value)};
 const url="./media/"+place.id+".jpg";
 return <><header><strong>◉ &nbsp; EARTHWEAVE <small> / {t("共境","Atlas")}</small></strong><div><a href="https://github.com/cjgogo27/Earthweave">GitHub ↗</a><button onClick={()=>setLanguage(language==="zh"?"en":"zh")}>{language==="zh"?"English":"中文"}</button></div></header>
 <main><p className="over">FIELD ATLAS &nbsp; / &nbsp; 001—002</p><h1>{t("从地球，到现场。","From globe to ground.")}</h1><p className="intro">{t("选一个拍摄地点，用手机环顾四周，或戴上头显看 360° 全景。","Choose a capture location. Look around on your phone or step into a panorama with your headset.")}</p>
 <section className="atlas"><div className="map"><Globe scenes={scenes.map(s=>({...s,title:t(s.zh,s.en)}))} selectedId={id} onSelect={pick} focus={place}/><span>{t("拖动旋转 · 点击地点","Drag to rotate · Select a pin")}</span></div>
 <article><img src={url} alt={t(place.zh,place.en)}/><div className="content"><p className="over">{t(place.where[0],place.where[1])} &nbsp; / &nbsp; 360°</p><h2>{t(place.zh,place.en)}</h2><p>{t(place.caption[0],place.caption[1])}</p><button className="enter" onClick={()=>enter(true)}>{t("进入全景","Enter panorama")} →</button><small>Greg Zaal · <a href={"https://polyhaven.com/a/"+place.asset}>Poly Haven</a> · CC0</small></div></article></section>
 <nav aria-label={t("选择地点","Choose a place")}>{scenes.map((s,i)=><button className={id===s.id?"active":""} aria-pressed={id===s.id} key={s.id} onClick={()=>pick(s.id)}><small>0{i+1}</small> {t(s.zh,s.en)}</button>)}</nav>
 <footer>{t("公开浏览版 · 无需账号。头显请在支持 WebXR 的浏览器内打开，进入全景后选择 VR。此入口不接收共享上传。","Public atlas · No account required. In a WebXR headset browser, open a panorama and select VR. Shared uploads are unavailable on this site.")}</footer></main>
 {inside&&<Viewer scene={{id:place.id,title:t(place.zh,place.en),url,kind:"panorama",author:"Greg Zaal · Poly Haven",license:"CC0",description:t(place.caption[0],place.caption[1])}} onClose={()=>enter(false)}/>}</>;
}
createRoot(document.getElementById("root")!).render(<I18nProvider><Atlas/></I18nProvider>);
