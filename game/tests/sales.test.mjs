import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fresh,openBox,settle,finish,autoSellDrops,validate} from '../dist/engine.js';
import {makeItems} from '../dist/content.js';
import {sellWarehouseInstances} from '../dist/warehouse.js';
const economy=JSON.parse(await readFile(new URL('../dist/economy.json',import.meta.url),'utf8')),items=makeItems(economy),random=max=>max===1000000?999999:0;
test('automatic sale strictly below threshold is idempotent and records discovery',()=>{
 let s=fresh(economy);s.settings.autoSellEnabled=true;s.settings.autoSellBelow=items['g1-01'].price;
 const opened=openBox(s,economy,items,1,10000,random);assert.ok(autoSellDrops(opened).pending.drops.every(d=>d.status===null));
 s.settings.autoSellBelow=String(BigInt(items['g1-01'].price)+1n);const sold=autoSellDrops(openBox(s,economy,items,1,10000,random));
 assert.ok(sold.pending.drops.every(d=>d.status==='sell'));assert.equal(sold.seen['g1-01'].count,3);assert.deepEqual(autoSellDrops(sold),sold);validate(finish(sold),economy,items);
});
test('automatic sale respects existing locked collections',()=>{
 let s=openBox(fresh(economy),economy,items,1,10000,random);s=finish(settle(s,Object.fromEntries(s.pending.drops.map(d=>[d.key,'keep']))));
 s.inventory['g1-01'].locked=true;s.settings.autoSellEnabled=true;s.settings.autoSellBelow='999999';
 assert.ok(autoSellDrops(openBox(s,economy,items,0,20000,random)).pending.drops.every(d=>d.status===null));
});
test('selected copies sell once, preserve surviving positions and reject display or locked copies',()=>{
 let s=openBox(fresh(economy),economy,items,1,10000,random);s=finish(settle(s,Object.fromEntries(s.pending.drops.map(d=>[d.key,'keep']))));
 s.warehousePositions={'g1-01#0':{x:0,y:0},'g1-01#1':{x:4,y:2},'g1-01#2':{x:8,y:3}};
 const sold=sellWarehouseInstances(s,['g1-01#1','g1-01#1']);assert.equal(sold.inventory['g1-01'].qty,2);assert.deepEqual(sold.warehousePositions['g1-01#1'],{x:8,y:3});assert.equal(BigInt(sold.balance)-BigInt(s.balance),BigInt(items['g1-01'].price));validate(sold,economy,items);
 s.display[0]='g1-01';assert.throws(()=>sellWarehouseInstances(s,['g1-01#0']),/展出/);s.inventory['g1-01'].locked=true;assert.throws(()=>sellWarehouseInstances(s,['g1-01#2']),/锁定/);
});
