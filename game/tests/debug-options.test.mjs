import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fresh,setDebugValue,validate,openBox,settle,finish} from '../dist/engine.js';
import {makeItems} from '../dist/content.js';
const e=JSON.parse(await readFile(new URL('../dist/economy.json',import.meta.url),'utf8')),items=makeItems(e),random=n=>n===1000000?n-1:0;
const done=s=>finish(settle(s,Object.fromEntries(s.pending.drops.map(d=>[d.key,'sell']))));
function debug(){const s=fresh(e);s.settings.debugMode=true;return s;}
test('debug balances support zero and large exact integers; normal gameplay and disabled debug retain valid accounting',()=>{
 let s=debug();s=setDebugValue(s,e,'balance','999999999999999999999999');validate(s,e,items);assert.equal(s.balance,'999999999999999999999999');
 s=setDebugValue(s,e,'balance','0');validate(s,e,items);s=done(openBox(s,e,items,0,1,random));validate(s,e,items);
 s.settings.debugMode=false;validate(JSON.parse(JSON.stringify(s)),e,items);assert.throws(()=>setDebugValue(s,e,'balance','1'),/调试模式/);
});
test('EXP changes queue unlocks once and preserve claimed grants and used free openings after lowering EXP',()=>{
 let s=debug();const xp=String(e.progression.paid_tier_unlock_total_xp[5]);s=setDebugValue(s,e,'xp',xp);validate(s,e,items);assert.equal(s.containerUnlocks[6],'pending');
 const rewardBalance=s.balance;s=setDebugValue(s,e,'xp','0');validate(s,e,items);s=setDebugValue(s,e,'xp',xp);assert.equal(s.balance,rewardBalance);validate(s,e,items);
 s.containerUnlocks[6]='ready';s=done(openBox(s,e,items,6,1,random));validate(s,e,items);s=setDebugValue(s,e,'xp','0');validate(s,e,items);s=setDebugValue(s,e,'xp',xp);assert.equal(s.containerUnlocks[6],'used');validate(s,e,items);
 s.settings.debugMode=false;s=done(openBox(s,e,items,1,1,random));validate(JSON.parse(JSON.stringify(s)),e,items);
});
test('debug master switch alone does not alter drops; optional high drops apply to every container',()=>{
 let s=setDebugValue(debug(),e,'xp',String(e.progression.paid_tier_unlock_total_xp[5]));s=setDebugValue(s,e,'balance','999999999999');
 assert.ok(openBox(s,e,items,6,1,random).pending.drops.every(d=>items[d.id].grade!==8));
 s.settings.debugHighDrop=true;for(let tier=0;tier<=6;tier++){const next=openBox(s,e,items,tier,1,random);assert.ok(next.pending.drops.some(d=>items[d.id].grade===8));validate(next,e,items);}
 s.settings.debugMode=false;assert.ok(openBox(s,e,items,6,1,random).pending.drops.every(d=>items[d.id].grade!==8));
});
test('debug values reject malformed, unsafe and pending-result edits',()=>{
 const s=debug();for(const value of ['-1','1.5','abc','01'])assert.throws(()=>setDebugValue(s,e,'xp',value));assert.throws(()=>setDebugValue(s,e,'xp','9007199254740992'));
 assert.throws(()=>setDebugValue(s,e,'balance','-1'));assert.throws(()=>setDebugValue(openBox(s,e,items,0,1,random),e,'balance','0'),/结果/);
 assert.throws(()=>validate({...s,debugAdjustments:{balance:'x',xp:0}},e,items),/调试调整/);
});
