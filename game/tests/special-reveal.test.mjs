import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceSpecialStep, specialPhaseMarkup, specialFinalWaves} from '../dist/special-reveal.js';

test('manual reveal enforces cooldown including fast repeated input',()=>{
  assert.equal(advanceSpecialStep(7,1,499,500),1);
  assert.equal(advanceSpecialStep(7,1,500,500),2);
  assert.equal(advanceSpecialStep(7,2,500,1000),2);
  assert.equal(advanceSpecialStep(7,2,1000,1000),3);
  assert.equal(advanceSpecialStep(7,3,1500,1500),3);
});
test('EX requires a fourth click and stays at its final stage',()=>{
  assert.equal(advanceSpecialStep(8,2,1000,1000),3);
  assert.equal(advanceSpecialStep(8,3,1500,1500),4);
  assert.equal(advanceSpecialStep(8,4,2000,2000),4);
  assert.equal(advanceSpecialStep(6,1,1000,1000),1);
});
test('white rings use three for grade 7 and three then six for EX',()=>{
  assert.equal(specialPhaseMarkup(1),'');
  assert.equal((specialPhaseMarkup(2,7).match(/class="ex-energy-ring/g)||[]).length,3);
  assert.equal((specialPhaseMarkup(2,8).match(/class="ex-energy-ring/g)||[]).length,3);
  assert.equal((specialPhaseMarkup(3,8).match(/class="ex-energy-ring/g)||[]).length,6);
  assert.equal((specialFinalWaves(7).match(/class="reveal-final-wave/g)||[]).length,2);
  assert.equal((specialFinalWaves(8).match(/class="reveal-final-wave/g)||[]).length,2);
  for(const step of [1,2,3]) assert.doesNotMatch(specialPhaseMarkup(step),/rainbow|<img/);
});
