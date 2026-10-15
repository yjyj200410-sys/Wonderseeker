// Enumerate unordered drop combinations and ask the deployed engine to price
// their actual results, including profit floors and entry-cost recovery floors.
import {fresh,openBox,weightsFor} from '../game/dist/engine.js';
const factorial=[1];for(let n=1;n<=12;n++)factorial[n]=factorial[n-1]*n;
export function boxMetrics(e,items,tier,paidIndex=301,includeEX=true){
 const config=structuredClone(e),box=config.boxes[tier];
 if(!includeEX)box.ex_numerator_per_million=0;
 config.currency.starting_balance=1000000000000;
 config.progression.paid_tier_unlock_total_xp.fill(0);config.progression.one_time_unlock_grants.fill(0);
 const base=fresh(config);base.grants.fill(true);base.paidOpens=paidIndex-1;
 const weights=weightsFor(config,tier,paidIndex),ex=box.ex_numerator_per_million/1e6,pool=[];
 for(let g=0;g<7;g++)if(weights[g])pool.push({id:`g${g+1}-01`,p:(1-ex)*weights[g]/config.ordinary.grade_weight_denominator,draw:[999999,weights.slice(0,g).reduce((a,n)=>a+n,0),0]});
 if(ex){const scale=config.ex.conditional_weights.reduce((a,n)=>a+n,0);for(let i=0;i<config.ex.conditional_weights.length;i++)pool.push({id:`ex-${i+1}`,p:ex*config.ex.conditional_weights[i]/scale,draw:[0,config.ex.conditional_weights.slice(0,i).reduce((a,n)=>a+n,0)]});}
 let mass=0,win=0,expected=0,min=Infinity,upgraded=0;
 const counts=Array(pool.length).fill(0);
 function visit(index,remaining){
  if(index<pool.length-1){for(let n=0;n<=remaining;n++){counts[index]=n;visit(index+1,remaining-n);}return;}
  counts[index]=remaining;
  let probability=factorial[box.item_count],raw=0;const draws=[];
  for(let i=0;i<pool.length;i++){
   probability*=pool[i].p**counts[i]/factorial[counts[i]];
   raw+=Number(items[pool[i].id].price)*counts[i];
   for(let n=0;n<counts[i];n++)draws.push(...pool[i].draw);
  }
  let at=0;const opened=openBox(base,config,items,tier,1,()=>draws[at++]);
  const total=opened.pending.drops.reduce((sum,d)=>sum+Number(d.price),0),net=total-box.price;
  mass+=probability;if(net>0)win+=probability;if(total>raw)upgraded+=probability;
  expected+=probability*net;min=Math.min(min,net);
 }
 visit(0,box.item_count);
 return {probability_mass:mass,win_probability:win,expected_net:expected,minimum_net:min,upgraded_probability:upgraded};
}
