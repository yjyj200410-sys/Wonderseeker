// Uses the deployed rules and current ten-item pool; no dependencies required.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fresh,openBox,settle,finish,validate,weightsFor} from '../game/dist/engine.js';
import {makeItems,tierNames} from '../game/dist/content.js';
import {boxMetrics} from './economy_metrics.mjs';
const e=JSON.parse(await readFile(new URL('../game/dist/economy.json',import.meta.url),'utf8'));
const source=JSON.parse(await readFile(new URL('./GAME_ECONOMY_V2.json',import.meta.url),'utf8'));
assert.deepEqual(e,source);
const items=makeItems(e),scale=e.ordinary.grade_weight_denominator;
let seed=20261014;
const random=max=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/2**32*max);};
const report={version:e.version,balance_revision:e.balance_revision,date:e.date,basis:'sell all drops; exact deployed-engine enumeration includes profit and entry-cost floors',simulation_opens_per_tier:20000,tiers:[]};
for(const b of e.boxes){
 const w=weightsFor(e,b.tier,301),first=w.findIndex(n=>n>0),low=Number(items[`g${first+1}-01`].price);
 assert.equal(w.reduce((a,n)=>a+n),scale);assert(w.every(n=>Number.isSafeInteger(n)&&n>=0));
 const actual=boxMetrics(e,items,b.tier),ordinary=boxMetrics(e,items,b.tier,301,false);
 assert(Math.abs(actual.probability_mass-1)<1e-10);
 const ex=b.ex_numerator_per_million/1e6;
 const win=actual.win_probability;
 if(b.tier>=4){
  assert(low*b.item_count<b.price);
  assert(win>=[.7752,.7917,.8362][b.tier-4]);assert(ordinary.expected_net>0);
 }else {assert(actual.minimum_net>0);assert(Math.abs(win-1)<1e-10);}
 const phases=[1,201,301].map(index=>{
  return {paid_index:index,win_probability:boxMetrics(e,items,b.tier,index).win_probability};
 });
 // Exclude EX entirely to prove sustainable profit without jackpots or grants.
 const sim=structuredClone(e);sim.boxes.forEach(box=>box.ex_numerator_per_million=0);
 sim.newcomer.phases=[];sim.currency.starting_balance=1000000000000;
 sim.progression.paid_tier_unlock_total_xp.fill(0);sim.progression.one_time_unlock_grants.fill(0);
 let s=fresh(sim),wins=0,losses=0,minNet=Infinity,totalNet=0;s.grants.fill(true);
 for(let n=0;n<report.simulation_opens_per_tier;n++){
  const before=BigInt(s.balance);s=openBox(s,sim,items,b.tier,n,random);
  s=finish(settle(s,Object.fromEntries(s.pending.drops.map(d=>[d.key,'sell']))));
  const net=Number(BigInt(s.balance)-before);totalNet+=net;minNet=Math.min(minNet,net);
  if(net>0)wins++;else if(net<0)losses++;
 }
 validate(s,sim,items);assert(totalNet>0);
 if(b.tier<4)assert.equal(losses,0);else assert(wins/report.simulation_opens_per_tier>.75);
 report.tiers.push({tier:b.tier,name:tierNames[b.tier],ordinary_grade_range:[first+1,w.findLastIndex(n=>n>0)+1],price:b.price,count:b.item_count,minimum_net:actual.minimum_net,standard_win_probability:win,ordinary_expected_net:ordinary.expected_net,profit_floor_upgrade_probability:ordinary.upgraded_probability,ex_per_item:ex,ex_per_box:1-(1-ex)**b.item_count,phases,simulation_without_ex:{wins,losses,min_net:minNet,total_net:totalNet,mean_net:totalNet/report.simulation_opens_per_tier}});
}
if(process.argv.includes('--write'))await writeFile(new URL(e.balance_revision?'./GAME_ECONOMY_RANGE_VALIDATION.json':'./GAME_ECONOMY_V2_VALIDATION.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
