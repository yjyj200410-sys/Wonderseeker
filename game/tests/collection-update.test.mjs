import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fresh,migrateTestItems,validate} from '../dist/engine.js';
import {makeItems} from '../dist/content.js';
const e=JSON.parse(await readFile(new URL('../dist/economy.json',import.meta.url)));
const items=makeItems(e);

test('retired soda and replaced frog migrate inventory, display and pending drops once',()=>{
 const old=fresh(e);old.contentVersion='items-test-v3-turtle-red';old.xp=3;old.stats.opens[0]=3;
 old.seen={'g2-04':{count:1,firstAt:10},'g3-04':{count:2,firstAt:20}};
 old.inventory={'g2-04':{qty:1,price:String(e.ordinary.value_slots[1][0]),locked:true},'g3-04':{qty:1,price:String(e.ordinary.value_slots[2][0]),locked:false}};
 old.display=['g2-04','g3-04',null,null,null,null];
 old.pending={tier:0,cost:'0',openedAt:1,rewards:[],drops:[{key:'pending-frog',id:'g3-04',price:String(e.ordinary.value_slots[2][0]),status:null,isNew:false,keepSuggested:false}]};
 const snapshot=structuredClone(old),next=migrateTestItems(old,items);
 validate(next,e,items);assert.equal(next.balance,old.balance);
 assert.equal(next.inventory['g2-02'].qty,1);assert.equal(next.inventory['g2-02'].locked,true);
 assert.equal(next.inventory['g1-05'].qty,1);assert.equal(next.inventory['g1-05'].price,items['g1-05'].price);
 assert.deepEqual(next.display.slice(0,2),['g2-02','g1-05']);assert.equal(next.pending.drops[0].id,'g1-05');
 assert(!items['g2-04']&&!items['g3-04']);assert.equal(migrateTestItems(next,items),next);assert.deepEqual(old,snapshot);
});
test('retired shoes and upgraded turtle preserve copies, locks, pending and money on reload',()=>{
 const old=fresh(e);old.contentVersion='items-test-v2-single-ex';old.xp=4;old.stats.opens[0]=4;
 old.seen={'g1-01':{count:1,firstAt:20},'g1-03':{count:1,firstAt:10},'g5-02':{count:2,firstAt:30}};
 old.inventory={'g1-01':{qty:1,price:items['g1-01'].price,locked:false},'g1-03':{qty:1,price:items['g1-01'].price,locked:true},'g5-02':{qty:1,price:String(e.ordinary.value_slots[4][0]),locked:true}};
 old.display=['g1-03','g5-02',null,null,null,null];old.warehousePositions={'g1-03#0':{x:0,y:0},'g5-02#0':{x:2,y:0}};
 old.pending={tier:0,cost:'0',openedAt:1,rewards:[],drops:[{key:'pending-0',id:'g5-02',price:String(e.ordinary.value_slots[4][0]),status:null,isNew:false,keepSuggested:false}]};
 const snapshot=structuredClone(old),next=migrateTestItems(old,items);
 validate(next,e,items);assert.equal(next.balance,old.balance);assert.equal(next.inventory['g1-01'].qty,2);assert.equal(next.inventory['g1-01'].locked,true);
 assert.equal(next.seen['g1-01'].firstAt,10);assert.equal(next.inventory['g6-04'].qty,1);assert.equal(next.inventory['g6-04'].locked,true);assert.equal(items['g6-04'].grade,6);
 assert.equal(next.inventory['g6-04'].price,String(e.ordinary.value_slots[5][0]));assert.equal(next.pending.drops[0].id,'g6-04');assert.equal(next.display[1],'g6-04');assert(!items['g1-03']&&!items['g5-02']);
 assert.equal(migrateTestItems(next,items),next);assert.deepEqual(old,snapshot);
});
