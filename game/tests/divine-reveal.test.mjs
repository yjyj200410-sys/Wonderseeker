import test from 'node:test';
import assert from 'node:assert/strict';
import {divineFrame} from '../dist/divine-reveal.js';
test('EX has one additional charge and only releases at phase four',()=>{
 for(const phase of [1,2,3]){
  const frame=divineFrame(8,phase,2,5);
  assert.equal(frame.baseAge,0);assert.equal(frame.extra,0);assert.equal(frame.isEX,true);
 }
 const ex=divineFrame(8,4,2,6);
 assert.equal(ex.baseAge,2);assert.ok(ex.extra>0&&ex.extra<1);
 assert.equal(divineFrame(7,3,2,5).baseAge,2);
 assert.equal(divineFrame(7,3,2,5).extra,0);
});
test('EX unfolds once with a slowing tail and reduced motion settles immediately',()=>{
 const values=[0,.5,1,2,6].map(age=>divineFrame(8,4,age,age).extra);
 assert.equal(values[0],0);assert.equal(values.at(-1),1);
 for(let i=1;i<values.length;i++)assert.ok(values[i]>values[i-1]);
 assert.ok(values[1]-values[0]>values[2]-values[1]);
 const quiet=divineFrame(8,4,0,0,true);
 assert.equal(quiet.extra,1);assert.equal(quiet.age,6);assert.equal(quiet.baseAge,6);
});

import {singleRevealStep} from '../dist/special-reveal.js';
test('single-shot grade 7 and EX enter the final visual phase directly',()=>{assert.equal(singleRevealStep(7),3);assert.equal(singleRevealStep(8),4);assert.equal(singleRevealStep(6),0);});
