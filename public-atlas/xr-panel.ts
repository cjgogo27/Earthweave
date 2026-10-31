import * as T from "three";
export const controls=["sound","light","weather","cycle","hide"] as const;
export type PanelAction=typeof controls[number];
const W=640,H=590,top=115,stride=88;
export function actionAt(u:number,v:number):PanelAction|null{
 const y=(1-v)*H-top,i=Math.floor(y/stride);
 return u*W>=24&&u*W<=W-24&&i>=0&&i<controls.length&&y-i*stride<75?controls[i]:null;
}
// An ordinary stereo-rendered mesh: this works without the optional WebXR DOM Overlay API.
export function createXRPanel(scene:T.Scene){
 const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext("2d");if(!ctx)throw Error("Canvas unavailable");
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
 const mat=new T.MeshBasicMaterial({map:tex,toneMapped:false,fog:false});
 const mesh=new T.Mesh(new T.PlaneGeometry(.82,.82*H/W),mat);
 mesh.visible=false;scene.add(mesh);
 const pos=new T.Vector3(),dir=new T.Vector3();let previous="";
 function show(camera:T.Camera){
  camera.getWorldPosition(pos);camera.getWorldDirection(dir);dir.y=0;
  if(dir.lengthSq()<.01)dir.set(0,0,-1);dir.normalize();
  mesh.position.copy(pos).addScaledVector(dir,1.35);mesh.position.y-=.15;
  mesh.lookAt(pos.x,mesh.position.y,pos.z);mesh.updateMatrixWorld(true);mesh.visible=true;
 }
 function draw(title:string,hint:string,labels:string[]){
  const key=labels.join("|")+hint;if(key===previous)return;previous=key;
  ctx!.fillStyle="#12261e";ctx!.fillRect(0,0,W,H);ctx!.fillStyle="#d8f3dd";ctx!.font="bold 37px system-ui,sans-serif";ctx!.fillText(title,26,50);
  ctx!.font="23px system-ui,sans-serif";ctx!.fillStyle="#a9c5b7";ctx!.fillText(hint,27,92);
  labels.forEach((label,i)=>{const y=top+i*stride;ctx!.fillStyle=i===4?"#234237":"#305648";ctx!.fillRect(24,y,W-48,75);ctx!.fillStyle="#edfaef";ctx!.font="30px system-ui,sans-serif";ctx!.fillText(label,48,y+48)});
  tex.needsUpdate=true;
 }
 function select(ray:T.Raycaster,act:(a:PanelAction)=>void){
  if(!mesh.visible)return false;const hit=ray.intersectObject(mesh)[0];if(!hit?.uv||hit.distance>8)return false;
  const action=actionAt(hit.uv.x,hit.uv.y);if(action)act(action);return true;
 }
 return {mesh,show,draw,select,dispose(){mesh.removeFromParent();tex.dispose();mat.dispose();mesh.geometry.dispose()}};
}
