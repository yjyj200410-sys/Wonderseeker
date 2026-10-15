import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fresh,openBox,settle,finish,validate} from '../dist/engine.js';
import {makeItems} from '../dist/content.js';
const config=JSON.parse(await readFile(new URL('../dist/economy.json',import.meta.url),'utf8'));
const worst=max=>max===1000000?max-1:0;
const sell=s=>finish(settle(s,Object.fromEntries(s.pending.drops.map(d=>[d.key,'sell']))));
for(let tier=1;tier<=6;tier++)test(`tier ${tier}: worst-case resale funds every step and recovers within ten lower opens`,()=>{
 const e=structuredClone(config); e.currency.starting_balance=e.boxes[tier].price;
 e.progression.paid_tier_unlock_total_xp.fill(0);e.progression.one_time_unlock_grants.fill(0);
 const items=makeItems(e);let s=fresh(e);s.grants.fill(true);
 s=sell(openBox(s,e,items,tier,1,worst));validate(s,e,items);
 assert(BigInt(s.balance)>=BigInt(e.boxes[tier-1].price));
 let count=0;
 while(BigInt(s.balance)<BigInt(e.boxes[tier].price)&&count<10){
   const before=BigInt(s.balance);
   s=openBox(s,e,items,tier-1,1,worst);
   // Save/reload both before and after settlement must retain guarantee.
   s=validate(JSON.parse(JSON.stringify(s)),e,items);
   s=sell(s);validate(s,e,items);
   assert(BigInt(s.balance)>before);
   count++;
 }
 assert(BigInt(s.balance)>=BigInt(e.boxes[tier].price));assert(count<=e.recovery.target_opens);
 assert.equal(s.recovery[tier],undefined);
 console.log(`tier ${tier}: ${count} lower opens`);
});
test('old saves without recovery remain valid; malformed recovery rejected',()=>{
 const items=makeItems(config),s=fresh(config);validate(s,config,items);
 for(const recovery of [[],{'7':{deficit:'1',opens:0}},{'1':{deficit:'1',opens:10}},{'1':{deficit:'-1',opens:0}}])assert.throws(()=>validate({...s,recovery},config,items),/回收/);
});
