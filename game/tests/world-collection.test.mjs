import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {makeItems,itemSVG} from '../dist/content.js';
import {fresh,openBox,settle,finish,validate} from '../dist/engine.js';
import {packWarehouse,moveWarehouseItem} from '../dist/warehouse.js';
const economy=JSON.parse(await readFile(new URL('../dist/economy.json',import.meta.url)));
const items=makeItems(economy);

test('nine-cell phone keeps deep saved positions and rotates without losing its footprint',()=>{
 const id='g6-w18',key=id+'#0';
 const s={inventory:{[id]:{qty:1}},warehousePositions:{[key]:{x:0,y:30}}};
 const layout=packWarehouse(s,items);
 assert.equal(layout.overflow.length,0);
 assert.deepEqual(layout.placed[0],{id,key,x:0,y:30,width:1,height:9});
 const rotated=moveWarehouseItem(s,items,key,2,30,true);
 const reloaded=packWarehouse(JSON.parse(JSON.stringify(rotated)),items).placed[0];
 assert.equal(reloaded.width,9);assert.equal(reloaded.height,1);assert.equal(reloaded.x,2);assert.equal(reloaded.y,30);
 assert.equal(items['g6-w19'].pixelArt,true);assert(itemSVG(items['g6-w19']).includes('pixel-art'));
});

test('world collection assets are cached and every item can drop, settle and reload',async()=>{
 const cache=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
 const world=Object.values(items).filter(item=>item.texture?.includes('/world-'));
 assert.equal(world.length,20);
 for(const item of world){
  await access(new URL('../dist/'+item.texture,import.meta.url));
  assert(cache.includes(item.texture));
  assert(itemSVG(item).includes(item.texture));
  const e=structuredClone(economy);
  e.ordinary.grade_weights[0]=Array.from({length:7},(_,i)=>i===item.grade-1?1e12:0);
  const pool=Object.values(items).filter(other=>other.grade===item.grade);
  const random=max=>max===1000000?999999:max===pool.length?pool.findIndex(other=>other.id===item.id):0;
  let s=openBox(fresh(e),e,items,0,10000,random);
  assert.equal(s.pending.drops[0].id,item.id);
  s=finish(settle(s,{[s.pending.drops[0].key]:'keep'}));
  validate(JSON.parse(JSON.stringify(s)),e,items);
  assert.equal(s.inventory[item.id].qty,1);
 }
 assert(!items['g2-04']&&!items['g3-04']);
 assert.equal(items['g1-05'].grade,1);
});
