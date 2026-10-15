import test from 'node:test';
import assert from 'node:assert/strict';
import { tidyWarehouse, packWarehouse } from '../dist/warehouse.js';
test('tidy prioritizes exact high prices, packs from top, persists and preserves inventory',()=>{
 const items={a:{footprint:[2,2]},b:{footprint:[1,1]},c:{footprint:[1,3]}};
 const state={balance:'500',inventory:{a:{qty:2,price:'9007199254740994',locked:true},b:{qty:2,price:'9007199254740993',locked:false},c:{qty:2,price:'50',locked:false}},display:['a'],warehousePositions:{'a#0':{x:18,y:50},'b#0':{x:1,y:20}}};
 const before=structuredClone(state),next=tidyWarehouse(state,items),layout=packWarehouse(next,items);
 assert.deepEqual(next.inventory,state.inventory);assert.equal(next.balance,state.balance);assert.deepEqual(next.display,state.display);assert.deepEqual(state,before);
 assert.deepEqual(next.warehousePositions['a#0'],{x:0,y:0});assert.deepEqual(next.warehousePositions['a#1'],{x:2,y:0});assert.equal(next.warehousePositions['b#0'].x,4);
 assert.equal(layout.placed.length,6);assert(layout.placed.every(p=>p.y===0));assert.equal(layout.rows,10);
 const occupied=new Set();for(const p of layout.placed)for(let y=p.y;y<p.y+p.height;y++)for(let x=p.x;x<p.x+p.width;x++){const key=`${x},${y}`;assert(!occupied.has(key));occupied.add(key);}
 assert.deepEqual(tidyWarehouse(next,items).warehousePositions,next.warehousePositions);
});
test('tidy clears empty stale positions and rotates a rectangle to fill a top-row gap',()=>{
 assert.deepEqual(tidyWarehouse({inventory:{},warehousePositions:{old:{x:0,y:99}}},{}).warehousePositions,{});
 const items={wide:{footprint:[19,2]},long:{footprint:[3,1]}};
 const state={inventory:{wide:{qty:1,price:'100'},long:{qty:1,price:'50'}},warehousePositions:{}};
 const next=tidyWarehouse(state,items);assert.deepEqual(next.warehousePositions['long#0'],{x:19,y:0,rotated:true});
 const packed=packWarehouse(next,items);assert.equal(packed.placed.find(p=>p.id==='long').width,1);
});
