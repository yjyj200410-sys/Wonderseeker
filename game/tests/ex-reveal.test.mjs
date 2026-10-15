import test from 'node:test';
import assert from 'node:assert/strict';
import { createEXReveal } from '../dist/ex-reveal.js';
function setup() {
  const timers=new Map();let seq=0,reveals=0;
  const player={currentTime:0,plays:0,pause(){},play(){this.plays++;return Promise.resolve();}};
  const cue=createEXReveal(player,{schedule(fn,delay){const id=++seq;timers.set(id,{fn,delay});return id;},unschedule(id){timers.delete(id);}});
  return {player,cue,timers,reveal:()=>reveals++,count:()=>reveals};
}
test('EX reveal follows seven-second audio buildup and triggers once',async()=>{
  const s=setup();s.cue.start({sound:true,reduced:false,reveal:s.reveal});
  await Promise.resolve();assert.equal(s.player.plays,1);assert.equal(s.count(),0);
  const timer=[...s.timers.values()][0];assert.equal(timer.delay,7000);timer.fn();timer.fn();assert.equal(s.count(),1);
});
test('mute preserves buildup; skipping cancels stale reveals',async()=>{
  const s=setup();s.cue.start({sound:false,reduced:false,reveal:s.reveal});
  const timer=[...s.timers.values()][0];assert.equal(timer.delay,7000);assert.equal(s.player.plays,0);
  s.cue.cancel();timer.fn();assert.equal(s.count(),0);
  s.cue.start({sound:true,reduced:false,reveal:s.reveal});s.cue.cancel();await Promise.resolve();assert.equal(s.timers.size,0);
});
test('reduced animation reveals immediately and starts audio at final impact',()=>{
  const s=setup();s.cue.start({sound:true,reduced:true,reveal:s.reveal});assert.equal(s.count(),1);assert.equal(s.player.currentTime,7);assert.equal(s.timers.size,0);
});
test('grade 7 uses a six-second impact and reduced animation seeks to six',async()=>{
  const timers=[];const player={currentTime:0,pause(){},play(){return Promise.resolve();}};
  let revealed=0;
  const cue=createEXReveal(player,{impactSeconds:6,schedule(fn,delay){timers.push({fn,delay});return timers.length;},unschedule(){}});
  cue.start({sound:true,reduced:false,reveal:()=>revealed++});await Promise.resolve();
  assert.equal(timers.at(-1).delay,6000);timers.at(-1).fn();assert.equal(revealed,1);
  cue.start({sound:true,reduced:true,reveal:()=>revealed++});assert.equal(player.currentTime,6);assert.equal(revealed,2);
});
