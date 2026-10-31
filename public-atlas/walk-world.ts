import * as T from "three";

export type PlaceId="venice"|"spruit";
export type Station="weather"|"motion"|"light";
export const stations:{id:Station;x:number;z:number}[]=[
 {id:"motion",x:1,z:2},{id:"weather",x:1,z:-7},{id:"light",x:4,z:-16}
];
export function floorAt(place:PlaceId,x:number,z:number):number|null {
 if(Math.abs(z)>24||x>7||x<(place==="venice"?-18:-22)) return null;
 if(place==="venice" && x< -2 && x> -13){
   if(Math.abs(z+11)>1.75)return null;
   return 1.3*Math.sin(Math.PI*(-2-x)/11);
 }
 return 0;
}
export function makeWorld(scene:T.Scene,place:PlaceId){
 let seed=place==="venice"?711:326;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const canal=place==="venice";
 const geometry={box:new T.BoxGeometry(1,1,1),rock:new T.IcosahedronGeometry(1,0),sphere:new T.SphereGeometry(1,12,7),pole:new T.CylinderGeometry(.5,.57,1,9),roof:new T.ConeGeometry(1,1,4),blade:new T.ConeGeometry(.5,1,3)};
 type Shape=keyof typeof geometry;
 const batches=new Map<Shape,{m:T.Matrix4;c:T.Color}[]>(),dummy=new T.Object3D();
 const diffuse=new T.MeshStandardMaterial({roughness:.91,flatShading:true});
 function add(s:Shape,x:number,y:number,z:number,w:number,h:number,d:number,c:string,rx=0,ry=0,rz=0){
  dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();
  const batch=batches.get(s)||[];batch.push({m:dummy.matrix.clone(),c:new T.Color(c)});batches.set(s,batch);
 }
 const light=new T.HemisphereLight(0xffefc4,0x667260,1.7),sun=new T.DirectionalLight(0xffdfaa,2.3);
 scene.add(light,sun);scene.fog=new T.FogExp2(0xa2c9ce,.011);
 const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{
  zenith:{value:new T.Color()},horizon:{value:new T.Color()},sunDir:{value:new T.Vector3()},sunColor:{value:new T.Color("#fff4c7")}
 },vertexShader:"varying vec3 dir; void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
 fragmentShader:"varying vec3 dir; uniform vec3 zenith,horizon,sunDir,sunColor; void main(){vec3 n=normalize(dir);float s=dot(n,sunDir);vec3 c=mix(horizon,zenith,pow(max(0.,n.y),.55));c+=sunColor*(smoothstep(.998,.9992,s)+.19*pow(max(s,0.),32.));gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}"});
 const sky=new T.Mesh(new T.SphereGeometry(155,32,16),skyMat);scene.add(sky);
 // Distant silhouettes and a moving band of clouds give the horizon depth.
 for(let i=0;i<35;i++){const a=i*.18;add("rock",Math.cos(a)*88,-5,Math.sin(a)*88,10+rand()*14,7+rand()*9,14,canal?"#a6ada0":"#849376")}
 const cloud=new T.Group();scene.add(cloud);
 const clouds=new T.InstancedMesh(geometry.sphere,new T.MeshLambertMaterial({color:0xffefd8}),45);
 for(let i=0;i<45;i++){const j=Math.floor(i/3),a=j*.46;dummy.position.set(Math.cos(a)*64+i%3*3,14+3*Math.sin(j*7)+i%3,Math.sin(a)*64);dummy.scale.set(4+rand()*3,1.2+rand(),3);dummy.rotation.set(0,0,0);dummy.updateMatrix();clouds.setMatrixAt(i,dummy.matrix)}cloud.add(clouds);
 const boat=new T.Group(),sails=new T.Group();scene.add(boat,sails);
 function part(parent:T.Group,shape:Shape,x:number,y:number,z:number,w:number,h:number,d:number,color:string){
  const m=new T.Mesh(geometry[shape],new T.MeshStandardMaterial({color,flatShading:true}));m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;
 }
 const water=new T.MeshStandardMaterial({color:"#368d94",roughness:.36,metalness:.24});
 if(canal){
  const sheet=new T.Mesh(geometry.box,water);sheet.position.set(-7.5,-.75,0);sheet.scale.set(11,.2,100);scene.add(sheet);
  for(const [x,w] of [[5,14],[-20,14]])add("box",x,-.52,0,w,1,98,"#b6a695");
  for(let z=-44;z<46;z+=1.5){for(const x of [-1.88,-13.15])add("box",x,-.13,z,.38,.28,1.44,"#d5c5a9")}
  // Vary the quay surface without issuing a separate draw call for each slab.
  for(let row=0;row<7;row++)for(let j=-17;j<18;j++){
   const color=["#beae99","#c7b7a2","#bdae9c","#c4b5a1"][Math.floor(rand()*4)];
   add("box",-1.25+row*1.5,-.025,j*1.55+(row%2)*.775,1.48,.045,1.53,color);
  }
  const colors=["#bd8571","#d3a476","#dbb885","#b87560","#c7aa87","#d4b4a2"];
  for(const side of [-1,1])for(let j=0;j<14;j++){
   const z=-42+j*6.4,h=4.8+rand()*4,x=side>0?11:-22,front=x-side*2.94;
   add("box",x,h/2,z,5.8,h,6.15,colors[Math.floor(rand()*colors.length)]);
   add("roof",x,h+.63,z,4.4,1.5,4.6,"#9b5c42",0,Math.PI/4);
   add("box",front,.98,z,.13,1.96,1.02,"#56483c");
   for(const dz of [-1.93,0,1.93])for(let y=2.9;y<h-.2;y+=2.1){
    add("box",front,y,z+dz,.14,1.13,.68,"#30494a");add("box",front-side*.06,y-.62,z+dz,.27,.1,.97,"#e7d7b9");
    for(const k of [-1,1])add("box",front,y,z+dz+k*.53,.14,1.08,.25,"#527465");
   }
   add("box",front,h-.19,z,.2,.12,6.17,"#e6d3b6");
  }
  for(let j=0;j<=24;j++){const x=-2-(j+.5)*11/25,y=1.3*Math.sin(Math.PI*(j+.5)/25);add("box",x,y-.16,-11,.46,.32,3.5,"#d6c4a7");
   for(const z of [-12.76,-9.24])add("box",x,y+.38,z,.46,.76,.15,"#ba9c7f");}
  for(let z=-28;z<28;z+=5){add("pole",-2.4,.1,z,.19,2,.19,"#946f55");}
  part(boat,"sphere",0,0,0,.79,.33,2.8,"#242f35");part(boat,"sphere",0,.17,0,.62,.23,2.1,"#98684c");
  for(const z of [-1,0,1])part(boat,"box",0,.36,z,1.08,.1,.32,"#e1b88a");
  boat.position.set(-7,-.46,2);
 }else{
  add("box",0,-.26,0,150,.5,150,"#8d9c61");
  const pathVertices:number[]=[];
  for(let z=-40;z<40;z++){const a=2*Math.sin(z*.12),b=2*Math.sin((z+1)*.12),l=1.25+.12*Math.sin(z*.46),n=1.25+.12*Math.sin((z+1)*.46);
   pathVertices.push(a-l,.012,z,b-n,.012,z+1,a+l,.012,z,a+l,.012,z,b-n,.012,z+1,b+n,.012,z+1);}
  const trail=new T.BufferGeometry();trail.setAttribute("position",new T.Float32BufferAttribute(pathVertices,3));trail.computeVertexNormals();
  scene.add(new T.Mesh(trail,new T.MeshStandardMaterial({color:"#bcaa7c",roughness:1})));
  for(let i=0;i<1150;i++){
   const x=rand()*85-48,z=rand()*85-42;if(Math.abs(x-2*Math.sin(z*.12))<2)continue;
   add("blade",x,.19,z,.17,.62+rand()*.34,.18,rand()>.4?"#9f9d52":"#bdaf67",.1,rand()*6,.16);
   if(i%8===0)add("rock",x,.49,z,.085,.07,.09,"#f1c570");
  }
  for(let i=0;i<40;i++){const x=(i%2?1:-1)*(10+rand()*34),z=rand()*100-50;
   if(floorAt(place,x,z)!==null)continue;
   const h=2.7+rand()*2;add("pole",x,h/2,z,.46,h,.46,"#6b5b45");
   for(let j=0;j<4;j++){const a=j*1.57;add("rock",x+Math.cos(a)*1.4,h+.42,z+Math.sin(a)*1.4,2.4,1.2,2.3,"#63784e");}
  }
  add("pole",-3,2.2,2,.55,4.4,.55,"#8b7156");sails.position.set(-3,4.2,2.48);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,p=part(sails,"box",Math.sin(a)*.84,Math.cos(a)*.84,0,.34,1.12,.09,"#d6cdb1");p.rotation.z=-a;}
 }
 const beacons:T.Mesh[]=[];
 for(const st of stations){
  const {x,z}=st;add("pole",x,.64,z,.33,1.28,.33,"#594f44");
  add("pole",x,1.27,z,.66,.12,.66,"#bca17d");
  const orb=new T.Mesh(new T.OctahedronGeometry(.33),new T.MeshStandardMaterial({color:st.id==="motion"?0xffb95b:st.id==="weather"?0x63dace:0xffdf9a,emissive:0x5d3a12}));
  orb.position.set(x,1.56,z);orb.userData.station=st.id;scene.add(orb);beacons.push(orb);
 }
 for(const [s,list] of batches){
  const mesh=new T.InstancedMesh(geometry[s],diffuse,list.length);
  list.forEach((it,i)=>{mesh.setMatrixAt(i,it.m);mesh.setColorAt(i,it.c)});scene.add(mesh);
 }
 const rainGeo=new T.BufferGeometry(),drops=new Float32Array(1050),rains=new T.PointsMaterial({color:0xc8e9ff,size:.068,transparent:true,opacity:.8});
 for(let i=0;i<drops.length;i+=3){drops[i]=rand()*56-30;drops[i+1]=rand()*13;drops[i+2]=rand()*58-29;}
 rainGeo.setAttribute("position",new T.BufferAttribute(drops,3));const rain=new T.Points(rainGeo,rains);scene.add(rain);
 const ripples=new T.InstancedMesh(geometry.sphere,new T.MeshBasicMaterial({color:"#81bbb5"}),55);
 if(canal)scene.add(ripples);else ripples.dispose();
 const zenith=[0x538db3,0x615b91,0x101c3d],horizon=[0xffdfb5,0xf9ae78,0x64718d];
 let sim=0,clock=0;
 function update(dt:number,day:number,wet:boolean,moving:boolean){
  clock+=dt;if(moving)sim+=dt;
  const q=skyMat.uniforms,delta=Math.min(1,dt*3);
  const top=new T.Color(wet?0x586975:zenith[day]),edge=new T.Color(wet?0x9caaaf:horizon[day]);
  q.zenith.value.lerp(top,delta);q.horizon.value.lerp(edge,delta);
  q.sunDir.value.set(-.56,day===0?.58:day===1?.095:.43,-.82).normalize();q.sunColor.value.set(wet?0x6e757a:day===2?0xabbdda:0xffe6aa);
  (scene.fog as T.FogExp2).color.copy(q.horizon.value);(scene.fog as T.FogExp2).density=wet?.029:.011;
  skyMat.uniformsNeedUpdate=true;sun.position.copy(q.sunDir.value).multiplyScalar(50);sun.intensity=wet?.7:day===2?.27:2;light.intensity=day===2?.65:1.7;
  cloud.rotation.y=clock*.004;rain.visible=wet;
  if(wet){for(let i=1;i<drops.length;i+=3)drops[i]=(drops[i]-dt*9+13)%13;rainGeo.attributes.position.needsUpdate=true;}
  beacons.forEach((b,i)=>{b.rotation.y=clock*.7;b.position.y=1.58+.07*Math.sin(clock*2+i);});
  if(canal){boat.position.z=2+14*Math.sin(sim*.17);boat.position.y=-.47+.045*Math.sin(clock*2);boat.rotation.z=.025*Math.sin(clock*1.4);
   for(let i=0;i<55;i++){dummy.position.set(-12.8+(i*3.293)%10.4,-.636,-35+(i*3.81+clock*.45)%70);dummy.scale.set(.16+.1*Math.sin(i+clock),.007,.46);dummy.rotation.set(0,0,0);dummy.updateMatrix();ripples.setMatrixAt(i,dummy.matrix);}ripples.instanceMatrix.needsUpdate=true;
  }else sails.rotation.z=sim*1.35;
 }
 update(1,0,false,false);
 return {update,beacons,dispose(){const g=new Set<T.BufferGeometry>(Object.values(geometry)),m=new Set<T.Material>([water,ripples.material as T.Material]);scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Points){g.add(o.geometry);for(const mat of Array.isArray(o.material)?o.material:[o.material])m.add(mat);if(o instanceof T.InstancedMesh)o.dispose();}});g.forEach(it=>it.dispose());m.forEach(it=>it.dispose());}};
}