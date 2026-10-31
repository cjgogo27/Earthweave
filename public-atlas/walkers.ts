import * as T from "three";
import type {PlaceId} from "./walk-world";
type Pt=[number,number];
// Route samples use arc length, so feet keep the same cadence around corners.
function loop(points:Pt[]){
 const path=new T.CurvePath<T.Vector3>();
 points.forEach((p,i)=>{const q=points[(i+1)%points.length];path.add(new T.LineCurve3(new T.Vector3(p[0],0,p[1]),new T.Vector3(q[0],0,q[1])))});
 const end=path.getCurveLengths(),total=end[end.length-1];
 return (s:number,target:T.Vector3)=>{s=((s%total)+total)%total;const i=end.findIndex(x=>s<=x),start=end[i-1]||0;return path.curves[i].getPoint((s-start)/(end[i]-start),target);};
}
export function walkers(scene:T.Scene,place:PlaceId,floor:(x:number,z:number)=>number|null){
 const venice=place==="venice",count=venice?8:5;
 const routes=venice?[
  loop([[-.8,9],[-.8,-10.4],[-15,-10.4],[-15,-19],[-16.5,-19],[-16.5,-11.7],[.2,-11.7],[.2,9]]),
  loop([[5.2,12],[5.2,-21],[6.4,-21],[6.4,12]])]:
  [loop(Array.from({length:40},(_,n):Pt=>{const z=n<20?12-n*1.8:12-(39-n)*1.8;return [2*Math.sin(z*.12)+(n<20?-.62:.72),z]}))];
 // A shared draw per shape keeps articulated characters affordable in stereo.
 const mat=new T.MeshStandardMaterial({flatShading:true,roughness:.88});
 const body=new T.InstancedMesh(new T.CylinderGeometry(.5,.43,1,8),mat,count*7);
 const heads=new T.InstancedMesh(new T.SphereGeometry(.5,10,7),mat,count*2);
 const umbrellas=new T.InstancedMesh(new T.ConeGeometry(.55,.21,10),mat,count);
 for(const mesh of [body,heads,umbrellas]){mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(mesh)}
 const p=new T.Vector3(),q=new T.Vector3(),parent=new T.Object3D(),part=new T.Object3D(),m=new T.Matrix4();
 const coats=[0xab5343,0x447579,0xd59c55,0x57648e,0xba816e,0x6c8056],skin=[0xbb845d,0xe1af8a,0x976c50,0x815637];
 const people=Array.from({length:count},(_,i)=>({distance:venice?(i===0?6:i*8.6):9+i*12.2,speed:.82+(i%4)*.095,yaw:NaN,x:0,z:0}));
 const set=(mesh:T.InstancedMesh,index:number,x:number,y:number,z:number,w:number,h:number,d:number,rot=0)=>{
  part.position.set(x,y,z);part.scale.set(w,h,d);part.rotation.set(rot,0,0);part.updateMatrix();mesh.setMatrixAt(index,m.multiplyMatrices(parent.matrix,part.matrix));
 };
 people.forEach((_,i)=>{for(let k=0;k<7;k++)body.setColorAt(i*7+k,new T.Color(k<3?coats[i%6]:k<5?0x39414b:0x3e322a));heads.setColorAt(i*2,new T.Color(skin[i%4]));heads.setColorAt(i*2+1,new T.Color(0x483829));umbrellas.setColorAt(i,new T.Color(coats[(i+1)%6]));});
 function update(dt:number,wet:number){
  people.forEach((person,i)=>{
   person.distance+=dt*person.speed*(1+wet*.22);const route=routes[i%routes.length];route(person.distance,p);route(person.distance+.23,q);
   const facing=Math.atan2(q.x-p.x,q.z-p.z);
   person.yaw=Number.isNaN(person.yaw)?facing:person.yaw+Math.atan2(Math.sin(facing-person.yaw),Math.cos(facing-person.yaw))*Math.min(1,dt*9);
   person.x=p.x;person.z=p.z;
   const stride=Math.sin(person.distance*5.25+i),bob=.025*Math.abs(stride),scale=.94+.035*(i%4);
   parent.position.set(p.x,(floor(p.x,p.z)??0)+bob,p.z);parent.rotation.y=person.yaw;parent.scale.setScalar(scale);parent.updateMatrix();
   const k=i*7;
   set(body,k,0,1.04,0,.44,.52,.29);
   for(let j=0;j<2;j++){const dir=j?1:-1,a=dir*stride*.48;
    set(body,k+1+j,dir*.245,1.02,-Math.sin(a)*.19,.13,.46,.135,a);
    set(body,k+3+j,dir*.105,.45,Math.sin(a)*.30,.18,.73,.19,-a);
    set(body,k+5+j,dir*.105,.095+Math.max(0,-Math.cos(person.distance*5.25+i)*dir)*.065,Math.sin(a)*.62+.05,.18,.13,.29,-a*.3);
   }
   set(heads,i*2,0,1.49,.015,.31,.37,.30);set(heads,i*2+1,0,1.60,-.012,.32,.19,.31);
   if(wet>.32)set(umbrellas,i,.12,1.9,0,1,1,1);
  });
  body.instanceMatrix.needsUpdate=heads.instanceMatrix.needsUpdate=true;umbrellas.visible=wet>.32;if(umbrellas.visible)umbrellas.instanceMatrix.needsUpdate=true;
 }
 return {update,people};
}
