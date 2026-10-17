import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fresh,openBox,settle,settleInterruptedOpen,validate} from '../dist/engine.js';
import {makeItems} from '../dist/content.js';
const e=JSON.parse(await readFile(new URL('../dist/economy.json',import.meta.url),'utf8')),items=makeItems(e);
const roll=n=>n===1000000?n-1:0;
const reload=s=>JSON.parse(JSON.stringify(s));
const count=s=>Object.values(s.inventory).reduce((n,i)=>n+i.qty,0);
test('refresh during reveal keeps all drops and finishes without another charge',()=>{
 const opened=openBox(fresh(e),e,items,1,123,roll),before=reload(opened);
 const recovered=settleInterruptedOpen(reload(opened));validate(recovered,e,items);
 assert.equal(recovered.pending,null);assert.equal(count(recovered),opened.pending.drops.length);
 assert.equal(recovered.balance,opened.balance);assert.deepEqual(recovered.stats,opened.stats);
 assert.deepEqual(opened,before);assert.equal(settleInterruptedOpen(recovered),recovered);
 validate(settleInterruptedOpen(reload(recovered)),e,items);
});
test('partial keep and sale survive recovery without duplicate items or sale income',()=>{
 const opened=openBox(fresh(e),e,items,1,123,roll);
 const partial=settle(opened,{[opened.pending.drops[0].key]:'keep',[opened.pending.drops[1].key]:'sell'});
 const recovered=settleInterruptedOpen(reload(partial));validate(recovered,e,items);
 assert.equal(count(recovered),opened.pending.drops.length-1);
 assert.equal(recovered.balance,partial.balance);assert.equal(recovered.stats.saleIncome,partial.stats.saleIncome);
 assert.equal(recovered.pending,null);
});
test('recovery honors auto-sale and preserves locked drops',()=>{
 const opened=openBox(fresh(e),e,items,1,123,roll);
 opened.settings.autoSellEnabled=true;opened.settings.autoSellBelow='999999999999';
 const recovered=settleInterruptedOpen(reload(opened));validate(recovered,e,items);
 assert.equal(count(recovered),0);assert.equal(recovered.pending,null);
 const locked=reload(opened),id=locked.pending.drops[0].id;
 locked.inventory[id]={qty:0,price:items[id].price,locked:true};
 const kept=settleInterruptedOpen(locked);assert.ok(kept.inventory[id].qty>0);assert.equal(kept.inventory[id].locked,true);
});
