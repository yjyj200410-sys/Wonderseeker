import test from 'node:test';
import assert from 'node:assert/strict';
import {createDivineReveal} from '../dist/divine-reveal.js';
test('prewarm renders before attachment and reuses the context across rewards',async()=>{
 const keys=['window','document','ResizeObserver','requestAnimationFrame','cancelAnimationFrame'];
 const previous=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const events=[];let created=0,disposed=0,pagehide;
 const canvas={setAttribute(){},remove(){this.parentNode=null;}};
 const makeHost=()=>({isConnected:true,getBoundingClientRect:()=>({width:320,height:640}),prepend(c){events.push('attach');c.parentNode=this;},querySelector:()=>null,classList:{add(){}}});
 try{
  globalThis.window={addEventListener(name,fn){if(name==='pagehide')pagehide=fn;}};
  globalThis.document={hidden:false,createElement:()=>canvas,querySelector:()=>({getBoundingClientRect:()=>({width:320,height:640})})};
  globalThis.ResizeObserver=class{observe(){}disconnect(){}};
  globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
  const controller=createDivineReveal(async()=>({createRevealRenderer:()=>{created++;return {resize(){},render(frame){events.push('render:'+frame.phase);},dispose(){disposed++;}};}}));
  await controller.prepare();assert.equal(created,1);assert.equal(canvas.parentNode,undefined);
  await controller.sync(makeHost(),{grade:7,phase:3,quiet:false});
  assert.equal(events[events.indexOf('attach')-1],'render:0');
  controller.stop();assert.equal(disposed,0);
  await controller.sync(makeHost(),{grade:8,phase:4,quiet:false});
  assert.equal(created,1);assert.equal(disposed,0);
  pagehide();assert.equal(disposed,1);
 }finally{for(const [key,descriptor] of previous)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
});
test('leaving while renderer loads cannot attach a stale canvas',async()=>{
 const saved={window:globalThis.window,document:globalThis.document,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 let release,attached=false;
 try{
  globalThis.window={addEventListener(){}};globalThis.cancelAnimationFrame=()=>{};
  globalThis.document={createElement:()=>({setAttribute(){},remove(){}}),querySelector:()=>({getBoundingClientRect:()=>({width:320,height:640})})};
  const controller=createDivineReveal(()=>new Promise(resolve=>{release=resolve;}));
  const pending=controller.sync({isConnected:true,prepend(){attached=true;}},{grade:7,phase:3});
  controller.stop();release({createRevealRenderer:()=>({resize(){},render(){},dispose(){}})});
  await pending;assert.equal(attached,false);
 }finally{Object.assign(globalThis,saved);}
});
