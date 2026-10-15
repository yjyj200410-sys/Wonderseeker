import test from 'node:test';
import assert from 'node:assert/strict';
import { nextSpecialReveal } from '../dist/reveal-queue.js';
const items={normal:{grade:2},seven:{grade:7},ex:{grade:8}};
const drops=['normal','normal','seven','normal','ex'].map(id=>({id}));
test('skip selects the next special in queue order, then overview',()=>{
 assert.equal(nextSpecialReveal(drops,items,0),2);
 assert.equal(nextSpecialReveal(drops,items,2),4);
 assert.equal(nextSpecialReveal(drops,items,4),5);
});
test('opening can include the first item; ordinary-only queue goes to overview',()=>{
 assert.equal(nextSpecialReveal([{id:'ex'}],items,0,true),0);
 assert.equal(nextSpecialReveal([{id:'normal'}],items,0),1);
});
