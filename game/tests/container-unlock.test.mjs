import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fresh,openBox,settle,finish,validate} from '../dist/engine.js';
import {makeItems} from '../dist/content.js';
const e=JSON.parse(await readFile(new URL('../dist/economy.json',import.meta.url),'utf8')),items=makeItems(e);
const random=max=>max===1000000?max-1:0;
function done(s){return finish(settle(s,Object.fromEntries(s.pending.drops.map(d=>[d.key,'sell']))));}
function reachUnlock(){let s=fresh(e);while(!s.containerUnlocks?.[2])s=done(openBox(s,e,items,1,Date.now(),random));return s;}
test('threshold queues one persistent unlock; free opening charges zero exactly once and survives validation',()=>{
 let s=reachUnlock();assert.equal(s.containerUnlocks[2],'pending');validate(s,e,items);
 s=JSON.parse(JSON.stringify(s));s.containerUnlocks[2]='ready';
 const balance=BigInt(s.balance),spent=s.stats.spent,opens=s.stats.opens[2];
 s=openBox(s,e,items,2,Date.now(),random);
 assert.equal(s.containerUnlocks[2],'used');assert.equal(s.pending.cost,'0');assert.equal(s.stats.spent,spent);assert.equal(s.stats.opens[2],opens+1);
 const grants=s.pending.rewards.reduce((n,r)=>n+BigInt(r.reward),0n);assert.equal(BigInt(s.balance),balance+grants);validate(s,e,items);
 s=done(s);validate(JSON.parse(JSON.stringify(s)),e,items);
 const before=BigInt(s.balance);s=openBox(s,e,items,2,Date.now(),random);assert.equal(s.pending.cost,String(e.boxes[2].price));assert.equal(BigInt(s.balance),before-BigInt(e.boxes[2].price));validate(s,e,items);
});
test('old saves do not replay unlocked tiers; malformed free claims fail validation',()=>{
 const s=reachUnlock();delete s.containerUnlocks;validate(s,e,items);
 const next=done(openBox(s,e,items,1,Date.now(),random));assert.equal(next.containerUnlocks?.[2],undefined);
 assert.throws(()=>validate({...next,containerUnlocks:{6:'ready'}},e,items),/解锁/);
 assert.throws(()=>validate({...next,containerUnlocks:{2:'used'}},e,items));
});
