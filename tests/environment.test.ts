import assert from "node:assert/strict";
import test from "node:test";
// @ts-ignore -- Node executes the TypeScript source directly in this suite.
import {advance,climate,DAY_SECONDS,WEATHER_SECONDS} from "../public-atlas/environment.ts";
// @ts-ignore -- Node executes the TypeScript source directly in this suite.
import {walkers} from "../public-atlas/walkers.ts";
import * as T from "three";
test("automatic cycle reaches warm sunset, night, dawn and noon; rain clears independently",()=>{
 const days=new Set(),weather=new Set();let phase=0,w=0,last=1;
 for(let i=0;i<=180;i++){const e=climate(phase,w);days.add(e.light);weather.add(e.weather);assert(Math.abs(e.daylight-last)<.08);last=e.daylight;phase=advance(phase,1,DAY_SECONDS);w=advance(w,1,WEATHER_SECONDS);}
 assert.equal(days.size,4);assert.equal(weather.size,4);assert.equal(climate(.5,.56).rain,1);assert.equal(climate(.5,0).daylight,0);
});
test("walkers travel on land and cross the canal only on the bridge",()=>{
 for(const place of ["venice","spruit"] as const){
  const scene=new T.Scene(),crowd=walkers(scene,place,()=>0),starts:{x:number;z:number}[]=[];let crossed=false;
  for(let i=0;i<900;i++){
   crowd.update(.1,i<450?0:1);
   if(i===0)crowd.people.forEach(p=>starts.push({x:p.x,z:p.z}));
   for(const [idx,p] of crowd.people.entries()){assert(Number.isFinite(p.x+p.z));if(i===30)assert(Math.hypot(p.x-starts[idx].x,p.z-starts[idx].z)>1);
   if(place==="venice"&&p.x< -2&&p.x> -13){assert(Math.abs(p.z+11)<=1.75);crossed=true;}}
  }
  if(place==="venice")assert(crossed);
 }
});