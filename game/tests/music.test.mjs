import test from 'node:test';
import assert from 'node:assert/strict';
import { createMusic } from '../dist/music.js';
const flush = () => new Promise(resolve => setImmediate(resolve));
test('music selection switches tracks, loops singles, and resumes rotation without restarting', async () => {
  const p=player();p.addEventListener=()=>{};
  const music=createMusic(p,{playlist:['calm.mp3','happy.mp3']});
  music.unlock();music.update(true,true,.18,'sunshine');await flush();
  assert.equal(p.src,'happy.mp3');assert.equal(p.loop,true);
  const plays=p.plays;
  music.update(true,true,.18,'sunshine');await flush();assert.equal(p.plays,plays);
  music.update(true,true,.18,'rotate');await flush();
  assert.equal(p.loop,false);assert.equal(p.src,'happy.mp3');assert.equal(p.plays,plays);
  music.update(false,true,.18,'starlight');await flush();
  assert.equal(p.src,'calm.mp3');assert.equal(p.loop,true);assert.equal(p.paused,true);
  music.update(true,true,.18,'starlight');await flush();assert.equal(p.paused,false);
});
test('playlist alternates both tracks and respects disabled playback at the boundary', async () => {
  const p=player(), listeners={};
  p.addEventListener=(event,callback)=>{listeners[event]=callback;};
  const music=createMusic(p,{playlist:['calm.mp3','happy.mp3']});
  assert.equal(p.loop,false);assert.equal(p.src,'calm.mp3');
  music.unlock();music.update(true);await flush();
  p.paused=true;listeners.ended();await flush();
  assert.equal(p.src,'happy.mp3');assert.equal(p.plays,2);
  p.paused=true;listeners.ended();await flush();
  assert.equal(p.src,'calm.mp3');assert.equal(p.plays,3);
  music.update(false);listeners.ended();await flush();
  assert.equal(p.src,'happy.mp3');assert.equal(p.plays,3);
  music.update(true);await flush();assert.equal(p.plays,4);
});
function player() {
  return { paused: true, plays: 0, play() { this.plays++; this.paused=false; return Promise.resolve(); }, pause() { this.paused=true; } };
}
test('music waits for gesture, loops, persists across updates, and pauses while hidden or disabled', async () => {
  const p=player(), music=createMusic(p);
  music.update(true); await flush(); assert.equal(p.plays,0);
  music.unlock(); music.update(true); await flush();
  assert.equal(p.plays,1); assert.equal(p.loop,true); assert.equal(p.volume,.24);
  music.update(true); await flush(); assert.equal(p.plays,1);
  music.update(true,false); assert.equal(p.paused,true);
  music.update(true,true); await flush(); assert.equal(p.plays,2);
  music.update(false); assert.equal(p.paused,true);
  music.update(false,true); await flush(); assert.equal(p.plays,2);
});
test('blocked playback can retry, and disabling during pending playback stays paused', async () => {
  const p=player(); p.play=()=>{p.plays++; return Promise.reject(new Error('blocked'));};
  const music=createMusic(p); music.unlock(); music.update(true); await flush();
  p.play=()=>{p.plays++;p.paused=false;return Promise.resolve();};
  music.update(true); await flush(); assert.equal(p.plays,2);
  music.update(false); music.update(true); music.update(false); await flush();
  assert.equal(p.paused,true);
});

function fadeClock() {
  let time=0, id=0;
  const callbacks=new Map();
  return {
    options:{fadeInMs:1500,now:()=>time,schedule:callback=>{callbacks.set(++id,callback);return id;},unschedule:handle=>callbacks.delete(handle)},
    frame(at){time=at;const pending=[...callbacks.values()];callbacks.clear();pending.forEach(callback=>callback());},
  };
}

test('entering music rises from silence over 1.5 seconds without restarting on renders', async () => {
  const p=player(), clock=fadeClock(), music=createMusic(p,clock.options);
  music.unlock();music.update(true);await flush();
  assert.equal(p.volume,0);assert.equal(p.plays,1);
  clock.frame(500);assert(Math.abs(p.volume-.08)<1e-8);
  music.update(true);await flush();assert.equal(p.plays,1);
  clock.frame(1000);assert(Math.abs(p.volume-.16)<1e-8);
  clock.frame(1500);assert.equal(p.volume,.24);
});

test('muted reveal pages cancel a running fade and music fades back when returning', async () => {
  const p=player(), clock=fadeClock(), music=createMusic(p,clock.options);
  music.unlock();music.update(true);await flush();clock.frame(500);
  music.update(true,true,0);assert.equal(p.volume,0);
  clock.frame(1500);assert.equal(p.volume,0);
  music.update(true,true,.24);clock.frame(2250);assert(Math.abs(p.volume-.12)<1e-8);
  clock.frame(3000);assert.equal(p.volume,.24);
  music.update(false);assert.equal(p.paused,true);
});
