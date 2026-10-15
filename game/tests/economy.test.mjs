import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fresh,openBox,settle,finish,validate,migrateEconomy,weightsFor,setDisplay,toggleLock} from '../dist/engine.js';
import {makeItems} from '../dist/content.js';
import {boxMetrics} from '../../docs/economy_metrics.mjs';
const e=JSON.parse(await readFile(new URL('../dist/economy.json',import.meta.url),'utf8'));
const items=makeItems(e),worst=max=>max===1000000?max-1:0;
const sell=s=>finish(settle(s,Object.fromEntries(s.pending.drops.map(d=>[d.key,'sell']))));
const legacy={...e,version:e.previous_economy.version,previous_economy:undefined,profitability:undefined,boxes:e.boxes.map((b,i)=>({...b,price:e.previous_economy.box_prices[i]}))};

test('tiers 1–3 guarantee profit even after newcomer bonuses expire',()=>{
 for(const tier of [1,2,3]){
  const config=structuredClone(e);config.currency.starting_balance=config.boxes[tier].price;config.progression.paid_tier_unlock_total_xp.fill(0);config.progression.one_time_unlock_grants.fill(0);
  let s=fresh(config);s.grants.fill(true);
  for(let n=0;n<350;n++){
   const before=BigInt(s.balance);s=sell(openBox(s,config,items,tier,n,worst));
   assert(BigInt(s.balance)>before);validate(s,config,items);
  }
 }
});
test('higher boxes win most draws, have positive ordinary returns, and boost rare drops',()=>{
 for(const tier of [4,5,6]){
  const box=e.boxes[tier],actual=boxMetrics(e,items,tier),ordinary=boxMetrics(e,items,tier,301,false);
  assert(Math.abs(actual.probability_mass-1)<1e-10);
  assert(actual.minimum_net<0);assert(actual.win_probability>=[.7752,.7917,.8362][tier-4]);
  assert(ordinary.expected_net>box.price*.5);assert(box.ex_numerator_per_million>e.boxes[tier-1].ex_numerator_per_million);
 }
});
test('V1 saves migrate with exact money, collections, upgrades, pending results and recovery',()=>{
 let s=fresh(legacy);
 s=finish(settle(openBox(s,legacy,items,1,1,worst),{'1-0':'keep','1-1':'sell','1-2':'sell'}));
 s=toggleLock(setDisplay(s,0,'g1-01'),'g1-01');
 s.warehouseUpgrades=1;s.balance=String(BigInt(s.balance)-1500n);
 s=openBox(s,legacy,items,0,2,worst);s=settle(s,{[s.pending.drops[0].key]:'sell'});
 validate(s,legacy,items);
 const old=structuredClone(s),m=migrateEconomy(s,e,items);
 for(const key of ['balance','inventory','seen','display','settings','stats','pending','recovery','warehouseUpgrades'])assert.deepEqual(m[key],s[key]);
 assert.deepEqual(s,old);assert.equal(m.economyVersion,e.version);assert.equal(migrateEconomy(m,e,items),m);
 let next=finish(m);next=sell(openBox(next,e,items,1,3,worst));validate(next,e,items);
 assert.equal(BigInt(next.stats.spent)-BigInt(m.stats.spent),BigInt(e.boxes[1].price));
 const loaded=validate(JSON.parse(JSON.stringify(next)),e,items);assert.deepEqual(loaded,next);
 const bad=structuredClone(next);bad.economyHistory.opens[1]++;assert.throws(()=>validate(bad,e,items));
 assert.throws(()=>migrateEconomy({...old,balance:'9999999'},e,items),/货币/);
});
test('partially settled paid V1 pending keeps its old cost through reload and later new opens',()=>{
 let old=openBox(fresh(legacy),legacy,items,1,1,worst);
 old=settle(old,{[old.pending.drops[0].key]:'sell'});
 const m=migrateEconomy(old,e,items);assert.equal(m.pending.cost,'1500');validate(m,e,items);
 let next=sell(m);next=openBox(next,e,items,1,2,worst);assert.equal(next.pending.cost,'1200');validate(next,e,items);
 next=sell(next);next=openBox(next,e,items,0,3,worst);validate(next,e,items);
});
test('large legacy recovery deficits survive the lower box prices and still recover',()=>{
 for(const tier of [4,5,6]){
  const config=structuredClone(e);config.currency.starting_balance=legacy.boxes[tier].price;
  config.progression.paid_tier_unlock_total_xp.fill(0);config.progression.one_time_unlock_grants.fill(0);
  const oldConfig={...config,version:legacy.version,previous_economy:undefined,profitability:undefined,boxes:legacy.boxes};
  let s=fresh(oldConfig);s.grants.fill(true);s=sell(openBox(s,oldConfig,items,tier,1,worst));
  s=migrateEconomy(s,config,items);validate(s,config,items);
  for(let n=0;s.recovery[tier]&&n<7;n++){
   s=sell(openBox(s,config,items,tier-1,n+2,worst));validate(s,config,items);
  }
  assert.equal(s.recovery[tier],undefined);
 }
});
test('expanded ranges add one lower grade and the added grade can survive settlement',()=>{
 for(const tier of [3,4,5,6]){
  const config=structuredClone(e);config.currency.starting_balance=e.boxes[tier].price;
  config.progression.paid_tier_unlock_total_xp.fill(0);config.progression.one_time_unlock_grants.fill(0);
  const w=weightsFor(config,tier,1),added=tier-2;
  assert.equal(w.findIndex(n=>n>0)+1,added);
  const grades=[7,...Array(e.boxes[tier].item_count-1).fill(added)];let slot=0;
  let s=fresh(config);s.grants.fill(true);
  s=openBox(s,config,items,tier,1,max=>max===1e6?999999:w.slice(0,grades[slot++]-1).reduce((a,n)=>a+n,0));
  assert(s.pending.drops.some(d=>d.id===`g${added}-01`));
  s=sell(s);validate(s,config,items);
 }
});
test('newcomer shifts keep targeting the original bulk grade and improve high-tier win probability',()=>{
 for(const tier of [4,5,6]){
  const a=boxMetrics(e,items,tier,1),b=boxMetrics(e,items,tier,201),c=boxMetrics(e,items,tier,301);
  assert(a.win_probability>b.win_probability&&b.win_probability>c.win_probability);
 }
});
test('earlier V2 pending drops and recovery stay intact without a save reset or repricing',()=>{
 const old=structuredClone(e);old.profitability=undefined;delete old.newcomer.shift_from_grade_by_tier;
 old.ordinary.grade_weights[4]=[0,0,780000000000,200000000000,16000000000,3000000000,1000000000];
 old.progression.paid_tier_unlock_total_xp.fill(0);old.progression.one_time_unlock_grants.fill(0);old.currency.starting_balance=old.boxes[4].price;
 const next=structuredClone(e);next.progression=old.progression;next.currency=old.currency;
 let s=fresh(old);s.grants.fill(true);s=openBox(s,old,items,4,1,worst);
 const snapshot=structuredClone(s);assert.equal(migrateEconomy(s,next,items),s);
 validate(s,next,items);assert.deepEqual(s,snapshot);s=sell(s);validate(s,next,items);
 s=sell(openBox(s,next,items,3,2,worst));validate(s,next,items);
});
