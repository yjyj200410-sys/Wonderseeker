import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {makeItems,itemSVG} from '../dist/content.js';
import {fresh,openBox,settle,finish,validate} from '../dist/engine.js';
const e=JSON.parse(await readFile(new URL('../dist/economy.json',import.meta.url)));
const items=makeItems(e);
test('new collection drops, settles and reloads at every grade',async()=>{
 for(const item of Object.values(items).filter(i=>i.texture?.endsWith('-v2.png'))){
  const grade=item.grade;
  const config=structuredClone(e);config.ordinary.grade_weights[0]=Array.from({length:7},(_,i)=>i===grade-1?1e12:0);
  let state=openBox(fresh(config),config,items,0,10000,max=>max===1000000?999999:max===Object.values(items).filter(i=>i.grade===grade).length?Object.values(items).filter(i=>i.grade===grade).findIndex(i=>i.id===item.id):0);
  const id=item.id;assert.equal(state.pending.drops[0].id,id);
  state=finish(settle(state,{[state.pending.drops[0].key]:'keep'}));
  validate(JSON.parse(JSON.stringify(state)),config,items);assert.equal(state.inventory[id].qty,1);
  assert.equal(items[id].price,items[`g${grade}-01`].price);
  assert.ok(itemSVG(items[id]).includes(items[id].texture));
  await access(new URL('../dist/'+items[id].texture,import.meta.url));
 }
});

for(const series of ['03','04'])test(`Chinese series ${series} drops, settles and reloads`,async()=>{
 for(const grade of series==='03'?[2,3,4,5,6,7]:[1]){
  const config=structuredClone(e);config.ordinary.grade_weights[0]=Array.from({length:7},(_,i)=>i===grade-1?1e12:0);
  const pool=Object.values(items).filter(i=>i.grade===grade),id=`g${grade}-${series}`,index=pool.findIndex(i=>i.id===id);
  let state=openBox(fresh(config),config,items,0,10000,max=>max===1000000?999999:max===pool.length?index:0);
  assert.equal(state.pending.drops[0].id,id);
  state=finish(settle(state,{[state.pending.drops[0].key]:'keep'}));
  validate(JSON.parse(JSON.stringify(state)),config,items);assert.equal(state.inventory[id].qty,1);
  assert.equal(items[id].price,items[`g${grade}-01`].price);
  await access(new URL('../dist/'+items[id].texture,import.meta.url));
 }
});
