// Isolated visual QA fixture. This is never imported by the deployed application.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { makeItems } from '../dist/content.js';
import { fresh, openBox, settle, finish, weightsFor, validate, setDisplay } from '../dist/engine.js';
const e = JSON.parse(await readFile(new URL('../dist/economy.json', import.meta.url), 'utf8'));
const items = makeItems(e);
let s = fresh(e, 10000), now = 10000;
function box(draws, choices) {
  let index = 0;
  s = openBox(s,e,items,1,now,() => draws[index++ % draws.length]);
  s = settle(s,Object.fromEntries(s.pending.drops.map((d,i)=>[d.key,choices?.[i] || 'keep'])));
  s = finish(s); now += 3000;
}
box([0,0],['keep','sell','sell']);
for(let g=0;g<7;g++)for(let slot=0;slot<20;slot++) {
  const weights=weightsFor(e,1,s.paidOpens+1);
  box([999999,weights.slice(0,g).reduce((a,b)=>a+b,0),slot]);
}
box([0,0]);box([0,0]);
for(let slot=0;slot<6;slot++)s=setDisplay(s,slot,['g1-01','g2-05','g3-08','g4-12','g5-17','ex-1'][slot]);
s.tutorialDone=true;s.settings.sound=false;s.nextAt=0;
validate(s,e,items);
await mkdir(new URL('./fixtures/',import.meta.url),{recursive:true});
await writeFile(new URL('./fixtures/all-items.json',import.meta.url),JSON.stringify(s,null,2));
console.log('Visual QA fixture: 143 discovered items; independent from production saves.');
