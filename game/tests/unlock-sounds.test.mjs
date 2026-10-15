import test from 'node:test';
import assert from 'node:assert/strict';
import {createUnlockSounds} from '../dist/unlock-sounds.js';
function setup(){const audios=[],jobs=new Map(),played=[];let id=0,allowed=true;const player=createUnlockSounds({createAudio:url=>{const a={url,currentTime:0,pause(){},play(){played.push({url,offset:this.currentTime});return Promise.resolve();}};audios.push(a);return a;},schedule:(fn,at)=>{jobs.set(++id,{fn,at});return id;},cancel:id=>jobs.delete(id),canPlay:()=>allowed});return {player,audios,jobs,played,mute(){allowed=false;}};}
test('unlock cues align with fall, landing and shatter; both metal layers share the shatter instant',()=>{
 const h=setup();h.player.start();assert.deepEqual([...h.jobs.values()].map(j=>j.at),[217,806,2108,2108]);
 for(const job of h.jobs.values())job.fn();assert.equal(h.played.length,4);assert.ok(h.played[2].url.includes('sword'));assert.ok(h.played[3].url.includes('tool'));assert.equal(h.audios[3].volume,.38);assert.equal(h.played[1].offset,.045);
});
test('mute, leaving and reduced motion suppress pending cues; restarting invalidates stale callbacks',()=>{
 const h=setup();h.player.start();const stale=[...h.jobs.values()];h.player.stop();assert.equal(h.jobs.size,0);for(const job of stale)job.fn();assert.equal(h.played.length,0);
 h.player.start({reducedMotion:true});assert.equal(h.jobs.size,0);
 h.player.start();h.mute();for(const job of h.jobs.values())job.fn();assert.equal(h.played.length,0);
});
