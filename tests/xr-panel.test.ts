import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
// @ts-ignore Node's type stripping runs the source directly.
import {createXRPanel,controls} from "../public-atlas/xr-panel.ts";
test("a recalled world-space panel faces the tracked head and controller rays select the correct action",()=>{
 // CanvasTexture only needs an image holder for this geometry test; no fake XR session.
 const original=Object.getOwnPropertyDescriptor(globalThis,"document");
 Object.defineProperty(globalThis,"document",{configurable:true,value:{createElement:()=>({getContext:()=>({})})}});
 try{
  const s=new T.Scene(),head=new T.PerspectiveCamera();head.position.set(3,1.7,5);head.rotation.y=1.1;head.updateMatrixWorld(true);
  const panel=createXRPanel(s),ray=new T.Raycaster(),origin=head.getWorldPosition(new T.Vector3());
  assert(!panel.mesh.visible);panel.show(head);const hits:string[]=[];
  for(let i=0;i<6;i++){const localY=(.5-(115+88*i+36)/678)*(.82*678/640);
   ray.set(origin,panel.mesh.localToWorld(new T.Vector3(0,localY,0)).sub(origin).normalize());
   assert(panel.select(ray,a=>hits.push(a)));}
  assert.deepEqual(hits,["sound","motion","light","weather","cycle","hide"]);assert.deepEqual(hits,controls);panel.mesh.visible=false;assert(!panel.select(ray,()=>assert.fail()));
  head.position.set(-9,1.5,-7);panel.show(head);
  assert(panel.mesh.position.distanceTo(head.position)<1.5);panel.dispose();assert.equal(s.children.length,0);
 }finally{if(original)Object.defineProperty(globalThis,"document",original);else Reflect.deleteProperty(globalThis,"document");}
});
