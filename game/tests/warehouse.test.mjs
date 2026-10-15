import test from 'node:test';
import assert from 'node:assert/strict';
import {packWarehouse,moveWarehouseItem,warehouseDropTarget} from '../dist/warehouse.js';
test('warehouse expands for saved positions without upgrades or payment',()=>{
 const s={balance:'10000',inventory:{a:{qty:1}},warehousePositions:{'a#0':{x:0,y:1000}}};
 const layout=packWarehouse(s,{a:{grade:1,shape:0}});
 assert.equal(layout.placed[0].y,1000);assert.ok(layout.rows>1000);assert.equal(s.balance,'10000');
});
test('drag positions persist and reject outside moves',()=>{
 const s={inventory:{a:{qty:1},b:{qty:1}},balance:'5000'},items={a:{grade:1,shape:0},b:{grade:1,shape:4}};
 const moved=moveWarehouseItem(s,items,'a#0',8,6),restored=JSON.parse(JSON.stringify(moved));
 assert.deepEqual(packWarehouse(restored,items).placed.find(p=>p.id==='a'),{id:'a',key:'a#0',x:8,y:6,width:1,height:1});
 const swapped=moveWarehouseItem(moved,items,'b#0',8,6);
 assert.deepEqual(swapped.warehousePositions['a#0'],moved.warehousePositions['b#0']);
 assert.throws(()=>moveWarehouseItem(moved,items,'b#0',19,9),/移出仓库/);
 assert.equal(s.warehousePositions,undefined);
});

test('equal footprints swap and survive save reload',()=>{
 const items={a:{footprint:[2,2]},b:{footprint:[2,2]}},state={inventory:{a:{qty:1},b:{qty:1}},warehousePositions:{'a#0':{x:0,y:0},'b#0':{x:6,y:3}}};
 const layout=packWarehouse(state,items),target=warehouseDropTarget(layout,'a#0',6.5,3.5);
 assert.equal(target.valid,true);assert.equal(target.swapKey,'b#0');
 const next=moveWarehouseItem(state,items,'a#0',target.x,target.y,target.rotated);
 const reloaded=packWarehouse(JSON.parse(JSON.stringify(next)),items);
 assert.deepEqual(next.warehousePositions,{'a#0':{x:6,y:3},'b#0':{x:0,y:0}});
 assert.equal(reloaded.placed.find(p=>p.key==='b#0').x,0);
 assert.equal(state.warehousePositions['a#0'].x,0);
});

test('different footprints swap only if both new spaces are free',()=>{
 const items={a:{footprint:[1,1]},b:{footprint:[2,3]},c:{footprint:[1,1]}},state={inventory:{a:{qty:1},b:{qty:1},c:{qty:1}},warehousePositions:{'a#0':{x:0,y:0},'b#0':{x:6,y:3},'c#0':{x:4,y:0}}};
 const next=moveWarehouseItem(state,items,'a#0',6,3);
 assert.deepEqual(next.warehousePositions['b#0'],{x:0,y:0});
 const blocked=structuredClone(state);blocked.warehousePositions['c#0']={x:1,y:0};
 assert.equal(warehouseDropTarget(packWarehouse(blocked,items),'a#0',6,3).valid,false);
 assert.throws(()=>moveWarehouseItem(blocked,items,'a#0',6,3),/空间不足/);
 const edge=structuredClone(state);edge.warehousePositions['a#0']={x:19,y:0};
 assert.throws(()=>moveWarehouseItem(edge,items,'a#0',6,3),/空间不足/);
});

test('swaps reject overlapping new footprints and multiple targets, preserving rotations',()=>{
 const items={a:{footprint:[1,1]},b:{footprint:[2,3]},c:{footprint:[1,1]}},state={inventory:{a:{qty:1},b:{qty:1}},warehousePositions:{'a#0':{x:0,y:0},'b#0':{x:1,y:0,rotated:true}}};
 assert.throws(()=>moveWarehouseItem(state,items,'a#0',1,0),/空间不足/);
 state.warehousePositions['b#0']={x:7,y:3,rotated:true};
 const next=moveWarehouseItem(state,items,'a#0',7,3);
 assert.deepEqual(next.warehousePositions['b#0'],{x:0,y:0,rotated:true});
 const multi={inventory:{a:{qty:1},b:{qty:1},c:{qty:1}},warehousePositions:{'a#0':{x:0,y:0},'b#0':{x:6,y:0},'c#0':{x:7,y:0}}};
 const multiItems={a:{footprint:[2,1]},b:{footprint:[1,1]},c:{footprint:[1,1]}};
 assert.throws(()=>moveWarehouseItem(multi,multiItems,'a#0',6,0),/空间不足/);
});
test('rectangular footprints pack without overlaps and excess items remain recoverable',()=>{
 const inventory={},items={};for(let i=0;i<150;i++){const id=`item-${i}`;inventory[id]={qty:3};items[id]={grade:8,shape:0};}
 const layout=packWarehouse({inventory},items),cells=new Set();
 for(const p of layout.placed){assert.equal(p.width*p.height,6);assert.ok(p.x+p.width<=20&&p.y+p.height<=layout.rows);for(let y=p.y;y<p.y+p.height;y++)for(let x=p.x;x<p.x+p.width;x++){const key=`${x},${y}`;assert.ok(!cells.has(key));cells.add(key);}}
 assert.equal(layout.placed.length+layout.overflow.length,450);assert.equal(layout.overflow.length,0);assert.equal(layout.placed.length,450);assert.ok(layout.rows>10);
});
test('auto rotation adapts at the edge and saves the rotated rectangle',()=>{
 const state={inventory:{a:{qty:1}},balance:'5000'},items={a:{grade:8,shape:0}},layout=packWarehouse(state,items);
 const target=warehouseDropTarget(layout,'a#0',19,8,false);
 assert.equal(target.valid,true);assert.equal(target.rotated,true);assert.equal(target.width,2);assert.equal(target.height,3);
 assert.equal(warehouseDropTarget(layout,'a#0',19,8,false,false).valid,false);
 const moved=moveWarehouseItem(state,items,'a#0',target.x,target.y,target.rotated);
 const p=packWarehouse(JSON.parse(JSON.stringify(moved)),items).placed[0];assert.equal(p.rotated,true);assert.equal(p.width,2);assert.equal(p.height,3);
 assert.equal(warehouseDropTarget(packWarehouse(moved,items),'a#0',-4,-4,true).valid,false);
});
