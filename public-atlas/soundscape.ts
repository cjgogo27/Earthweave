import type {PlaceId} from "./walk-world";
// All sounds are synthesized locally. No microphone permission, remote media, or audio downloads.
export class Soundscape {
 readonly ctx=new AudioContext();
 private master=this.ctx.createGain();
 private buffer:AudioBuffer;
 private wind:GainNode; private rain:GainNode; private surf:GainNode;
 private nextCall=0;private nextPasser=0;private travelled=0;private lastX=NaN;private lastZ=0;
 constructor(private place:PlaceId){
  const c=this.ctx;this.master.gain.value=.55;this.master.connect(c.destination);
  this.buffer=c.createBuffer(1,c.sampleRate*3,c.sampleRate);
  const channel=this.buffer.getChannelData(0);for(let i=0;i<channel.length;i++)channel[i]=Math.random()*2-1;
  this.wind=this.bed("bandpass",430,.72);this.rain=this.bed("highpass",1700,.65);this.surf=this.bed("lowpass",880,.7);
 }
 private bed(type:BiquadFilterType,hz:number,q:number){
  const c=this.ctx,n=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain();
  n.buffer=this.buffer;n.loop=true;filter.type=type;filter.frequency.value=hz;filter.Q.value=q;
  g.gain.value=0;n.connect(filter).connect(g).connect(this.master);n.start(0,Math.random()*2);return g;
 }
 private note(pitch:number,end:number,seconds:number,level:number,pan:number,delay=0,step=false){
  const c=this.ctx,time=c.currentTime+delay,g=c.createGain(),p=c.createStereoPanner();p.pan.value=pan;
  let src:AudioScheduledSourceNode,filter:BiquadFilterNode|undefined;
  if(step){const n=c.createBufferSource();n.buffer=this.buffer;filter=c.createBiquadFilter();filter.type="lowpass";filter.frequency.value=pitch;filter.frequency.exponentialRampToValueAtTime(end,time+seconds);n.connect(filter).connect(g);src=n;}
  else{const o=c.createOscillator();o.frequency.setValueAtTime(pitch,time);o.frequency.exponentialRampToValueAtTime(end,time+seconds);o.connect(g);src=o;}
  g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(Math.max(.0002,level),time+.012);g.gain.exponentialRampToValueAtTime(.0001,time+seconds);
  g.connect(p).connect(this.master);src.onended=()=>{src.disconnect();filter?.disconnect();g.disconnect();p.disconnect()};src.start(time);src.stop(time+seconds+.02);
 }
 level(v:number){this.master.gain.setTargetAtTime(v,this.ctx.currentTime,.07)}
 update(rain:number,day:number,x:number,z:number,yaw:number,people:{x:number;z:number}[]){
  const c=this.ctx;if(c.state!=="running")return;const now=c.currentTime;
  this.rain.gain.setTargetAtTime(.21*rain,now,.18);
  this.wind.gain.setTargetAtTime((this.place==="spruit"?.19:.105)*(.78+.22*Math.sin(now*.65))+.07*rain,now,.18);
  const wave=(.5+.5*Math.sin(now*1.43))**2;
  this.surf.gain.setTargetAtTime(this.place==="venice"?(.12+.32*wave)/(1+.09*Math.abs(x+7)):.01,now,.2);
  if(now>=this.nextCall){this.nextCall=now+(day<.28?1.3:2.3)+Math.random()*2;
   const pan=Math.sin(now*.44)*.7,v=(1-rain*.9);
   if(day<.28){for(let i=0;i<4;i++)this.note(3400,3550,.067,v*.014,pan,i*.095)}
   else if(this.place==="spruit"){this.note(1920,2840,.14,v*.066,pan);this.note(2530,1760,.20,v*.051,pan,.17)}
   else{this.note(1240,905,.31,v*.032,pan);this.note(1070,760,.28,v*.021,pan,.33)}
  }
  const dist=Math.hypot(x-this.lastX,z-this.lastZ);this.lastX=x;this.lastZ=z;
  if(dist<1.5)this.travelled+=dist;
  if(this.travelled>.69){this.travelled=0;this.note(this.place==="venice"?1250:1900,100,.15,.41,0,0,true)}
  if(now>=this.nextPasser){this.nextPasser=now+.49;
   let d=10,dx=0,dz=0;for(const person of people){const a=person.x-x,b=person.z-z,h=Math.hypot(a,b);if(h<d){d=h;dx=a;dz=b}}
   if(d<10){const pan=Math.max(-1,Math.min(1,(Math.cos(yaw)*dx-Math.sin(yaw)*dz)/Math.max(1,d)));this.note(1150,120,.13,.26/(1+d*.8),pan,0,true);}
  }
 }
 close(){this.master.disconnect();void this.ctx.close().catch(()=>{})}
}
