// End-to-end checks against a local, production-built atlas. Uses stock Chrome and Node.
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtemp,realpath,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {once} from "node:events";
const url=process.argv[2]||"http://127.0.0.1:4173/Earthweave/";
assert(["127.0.0.1","localhost"].includes(new URL(url).hostname));
const profile=await mkdtemp(path.join(await realpath(tmpdir()),"earthweave-walk-"));
const child=spawn(process.env.CHROME_BIN||(process.platform==="win32"?"C:/Program Files/Google/Chrome/Application/chrome.exe":"google-chrome"),["--headless","--no-sandbox","--disable-dev-shm-usage","--no-first-run","--disable-background-networking","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--window-size=960,660","--remote-debugging-pipe","--user-data-dir="+profile,"about:blank"],{windowsHide:true,stdio:["ignore","ignore","ignore","pipe","pipe"]});
const exited=once(child,"exit"),pending=new Map(),errors=[];let seq=0,buffer="",sessionId;
child.stdio[4].setEncoding("utf8");child.stdio[4].on("data",chunk=>{buffer+=chunk;let i;while((i=buffer.indexOf("\0"))>=0){const msg=JSON.parse(buffer.slice(0,i));buffer=buffer.slice(i+1);if(msg.id)pending.get(msg.id)?.(msg);if(msg.method==="Runtime.exceptionThrown")errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);
 if(msg.method==="Log.entryAdded"&&/Shader Error|VALIDATE_STATUS/.test(msg.params.entry.text))errors.push(msg.params.entry.text);}});
const send=(method,params={},sid=sessionId)=>new Promise((ok,bad)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);bad(Error("CDP timeout "+method))},15000);pending.set(id,msg=>{pending.delete(id);clearTimeout(timer);msg.error?bad(Error(msg.error.message)):ok(msg.result)});
 child.stdio[3].write(JSON.stringify({id,method,params,sessionId:sid})+"\0");});
const sleep=n=>new Promise(ok=>setTimeout(ok,n));
const ev=async(expression)=>{const v=await send("Runtime.evaluate",{expression,returnByValue:true});if(v.exceptionDetails)throw Error(v.exceptionDetails.text);return v.result.value};
const until=async(expression)=>{for(let i=0;i<75;i++){if(await ev(expression))return;await sleep(180)}throw Error("Not reached: "+expression)};
const click=selector=>ev("document.querySelector("+JSON.stringify(selector)+").click()");
const position="document.querySelector('[data-walk-position]')?.textContent";
try{
 const tab=(await send("Target.createTarget",{url:"about:blank"})).targetId;
 sessionId=(await send("Target.attachToTarget",{targetId:tab,flatten:true})).sessionId;
 await send("Page.enable");await send("Runtime.enable");await send("Log.enable");
 await send("Page.navigate",{url});await until("!!document.querySelector('.walk-launch .enter')");
 for(const id of ["venice","spruit"]){
  if(id==="spruit")await click("nav button:nth-child(2)");
  await click(".walk-launch .enter");await until("!!document.querySelector('.walk-stage canvas') && !document.querySelector('.walk-action button')?.disabled");
  await send("Input.dispatchKeyEvent",{type:"keyDown",key:"e",code:"KeyE"});
  await send("Input.dispatchKeyEvent",{type:"keyUp",key:"e",code:"KeyE"});
  await until("document.querySelector('.walk-action button')?.textContent.includes("+JSON.stringify(id==="venice"?"停船":"停下风车")+")");
  await click(".walk-tools button:nth-child(2)");await until("document.querySelector('.walk-tools').textContent.includes('雨')");
  await click(".walk-tools button:first-child");await until("document.querySelector('.walk-tools').textContent.includes('黄昏')");
  await send("Input.dispatchKeyEvent",{type:"keyDown",code:"KeyW",key:"w"});
  await until(position+" !== '0, 0'");
  await send("Input.dispatchKeyEvent",{type:"keyUp",code:"KeyW",key:"w"});
  await click(".walk-tools button:nth-child(3)");await until(position+" === '0, 0'");
  const touchPoint=await ev("(()=>{const r=document.querySelector('.walk-pad button').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
  await send("Emulation.setTouchEmulationEnabled",{enabled:true,maxTouchPoints:2});
  await send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[touchPoint]});
  await until(position+" !== '0, 0'");
  await send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  await send("Emulation.setTouchEmulationEnabled",{enabled:false});
  await click(".walk-tools button:nth-child(3)");await until(position+" === '0, 0'");
  if(process.env.WALK_SCREENSHOT_DIR){await click(".walk-tools button:nth-child(2)");const shot=await send("Page.captureScreenshot",{format:"jpeg",quality:75});await writeFile(path.join(process.env.WALK_SCREENSHOT_DIR,id+".jpg"),Buffer.from(shot.data,"base64"));}
  await click(".walk-heading button");await until("!document.querySelector('.walk')");
  console.log("PASS",id,"WebGL scene, object, rain, dusk, movement, reset and exit");
 }
 assert.deepEqual(errors,[]);
}finally{
 try{await send("Browser.close",{},undefined)}catch{child.kill()}
 await Promise.race([exited,sleep(3000)]);if(child.exitCode===null)child.kill();
 if(path.dirname(profile)===await realpath(tmpdir())&&path.basename(profile).startsWith("earthweave-walk-"))await rm(profile,{force:true,recursive:true,maxRetries:4,retryDelay:200}).catch(()=>{});
}
