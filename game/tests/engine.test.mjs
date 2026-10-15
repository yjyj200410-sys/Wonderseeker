import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fresh, weightsFor, weighted, openBox, settle, finish, sellInventory, toggleLock, setDisplay, validate, uniform, migrateTestItems } from '../dist/engine.js';
import { makeItems } from '../dist/content.js';
const e = JSON.parse(await readFile(new URL('../dist/economy.json', import.meta.url), 'utf8'));
const items = makeItems(e);
const ordinary = max => max === 1000000 ? max - 1 : 0;
const ex = () => 0;
const sellAll = s => settle(s, Object.fromEntries(s.pending.drops.map(d => [d.key, 'sell'])));
const keepAll = s => settle(s, Object.fromEntries(s.pending.drops.map(d => [d.key, 'keep'])));
test('content has expanded textured collections per ordinary grade and one EX value', () => {
  assert.equal(Object.keys(items).length, 42);
  for (let g = 1; g <= 7; g++){const group=Object.values(items).filter(i=>i.grade===g);assert.equal(group.length,[6,6,6,5,4,9,5][g-1]);assert.ok(group[0].texture);assert.equal(group[0].price,String(e.ordinary.value_slots[g-1][0]));}
  assert.equal(items['ex-1'].price, '27499999975');
});
test('old item migration clears collections once while preserving money and progression',()=>{
 const old={...fresh(e),contentVersion:'polygon-v1',balance:'9234',xp:6,paidOpens:2,stats:{opens:[0,2,0,0,0,0,0],spent:String(e.boxes[1].price*2),saleIncome:String(9234-3000+e.boxes[1].price*2)},inventory:{'g1-02':{qty:3,price:'466',locked:false}},seen:{'g1-02':{count:6,firstAt:1}},display:['g1-02',null,null,null,null,null],pending:{old:true}};
 const next=migrateTestItems(old);assert.equal(next.balance,'9234');assert.equal(next.xp,6);assert.equal(next.paidOpens,2);assert.deepEqual(next.inventory,{});assert.deepEqual(next.seen,{});assert.ok(next.display.every(x=>x===null));assert.equal(next.pending,null);assert.equal(migrateTestItems(next),next);assert.equal(old.inventory['g1-02'].qty,3);validate(next,e,items);
});
test('normal weights normalize and newcomer boundaries preserve high grades and EX', () => {
  for (let tier = 0; tier <= 6; tier++) {
    for (const index of [1,200,201,300,301]) {
      const w = weightsFor(e,tier,index);
      assert.equal(w.reduce((a,b)=>a+b),1e12);assert(w.every(x=>Number.isSafeInteger(x)&&x>=0));
    }
    assert.deepEqual(weightsFor(e,tier,301),e.ordinary.grade_weights[tier]);
    if(tier){const first=(e.newcomer.shift_from_grade_by_tier?.[tier]??e.ordinary.grade_weights[tier].findIndex(x=>x>0)+1)-1;assert.equal(weightsFor(e,tier,200)[first],e.ordinary.grade_weights[tier][first]-8e10);assert.equal(weightsFor(e,tier,201)[first],e.ordinary.grade_weights[tier][first]-4e10);assert.deepEqual(weightsFor(e,tier,201),weightsFor(e,tier,300));}
  }
  assert.deepEqual(weightsFor(e,0,1),e.ordinary.grade_weights[0]);
});
test('weighted intervals and single EX pool', () => {
  assert.deepEqual(e.ex.conditional_weights,[1]);assert.equal(weighted(e.ex.conditional_weights,()=>0),0);
  assert.equal(weighted([0,2,0,3],()=>0),1);assert.equal(weighted([0,2,0,3],()=>2),3);
});
test('removed EX collectibles migrate without losing money, copies, display or pending drops',()=>{
  const oldEconomy=structuredClone(e);oldEconomy.ex.conditional_weights=[2,2,1];oldEconomy.ex.values=Array(3).fill(e.ex.values[0]);
  const oldItems={...items,'ex-2':{...items['ex-1'],id:'ex-2'},'ex-3':{...items['ex-1'],id:'ex-3'}};
  let old=openBox(fresh(oldEconomy),oldEconomy,oldItems,1,10000,max=>max===1000000?0:2);
  old=finish(settle(old,Object.fromEntries(old.pending.drops.map(d=>[d.key,'keep']))));
  old.display[0]='ex-2';old.warehousePositions={'ex-2#0':{x:0,y:0}};
  old=openBox(old,oldEconomy,oldItems,1,20000,max=>max===1000000?0:4);
  old.contentVersion='items-test-v1';const snapshot=structuredClone(old);
  const next=migrateTestItems(old);
  assert.equal(next.balance,old.balance);assert.equal(next.inventory['ex-1'].qty,3);assert.equal(next.seen['ex-1'].count,6);
  assert.equal(next.display[0],'ex-1');assert(next.pending.drops.every(d=>d.id==='ex-1'));
  assert(!next.inventory['ex-2']&&!next.seen['ex-3']);assert.deepEqual(next.warehousePositions,{});
  validate(next,e,items);assert.deepEqual(old,snapshot);assert.equal(migrateTestItems(next),next);
});
test('each box has fixed count, and EX replaces every ordinary slot', () => {
  for(let tier=0;tier<=6;tier++) {
    const s=fresh(e);s.xp=7200;s.balance='999999999999';
    const opened=openBox(s,e,items,tier,10000,ordinary);
    assert.equal(opened.pending.drops.length,e.boxes[tier].item_count);
    assert(opened.pending.drops.every(d=>e.ordinary.grade_weights[tier][items[d.id].grade-1]>0));
    const jackpot=openBox(s,e,items,tier,10000,ex);
    assert.equal(jackpot.pending.drops.length,e.boxes[tier].item_count);assert(jackpot.pending.drops.every(d=>d.id==='ex-1'));
  }
});
test('EX threshold is independent per slot', () => {
  for(let tier=0;tier<=6;tier++) {
    const s=fresh(e);s.xp=7200;s.balance='999999999999';
    const p=e.boxes[tier].ex_numerator_per_million;
    const hit=openBox(s,e,items,tier,10000,max=>max===1000000?p-1:0);
    const miss=openBox(s,e,items,tier,10000,max=>max===1000000?p:0);
    assert(hit.pending.drops.every(d=>d.id==='ex-1'));assert(miss.pending.drops.every(d=>d.id.startsWith('g')));
  }
});
test('opening is immutable, pays once, tracks discovery and one suggested new copy', () => {
  const s=fresh(e),opened=openBox(s,e,items,1,10000,ordinary);
  assert.equal(s.balance,'3000');assert.equal(s.pending,null);
  assert.equal(opened.balance,String(3000-e.boxes[1].price));assert.equal(opened.xp,3);assert.equal(opened.paidOpens,1);
  assert.equal(opened.seen['g1-01'].count,3);assert(opened.pending.drops.every(d=>d.isNew));assert.equal(opened.pending.drops.filter(d=>d.keepSuggested).length,1);
  validate(opened,e,items);
});
test('cannot open locked tiers, without funds or before settling; no cooldown after results', () => {
  const s=fresh(e);
  assert.throws(()=>openBox(s,e,items,2,10000,ordinary),/未解锁/);
  const poor={...s,balance:'0'};assert.throws(()=>openBox(poor,e,items,1,10000,ordinary),/不足/);
  let opened=openBox(s,e,items,1,10000,ordinary);assert.throws(()=>openBox(opened,e,items,0,15000,ordinary),/上一次/);
  opened=finish(sellAll(opened));assert(openBox(opened,e,items,0,10000,ordinary));assert.equal(opened.nextAt,0);
  assert(openBox(poor,e,items,0,10000,ordinary));
});
test('sewer does not use newcomer count and cannot have empty drops', () => {
  const s=openBox(fresh(e),e,items,0,10000,ordinary);assert.equal(s.paidOpens,0);assert.equal(s.xp,1);assert.equal(s.pending.drops.length,1);assert.equal(s.balance,'3000');
});
test('partial and repeated settlement is idempotent, reload preserves exact drops', () => {
  let s=openBox(fresh(e),e,items,1,10000,ordinary);const first=s.pending.drops[0];
  s=settle(s,{[first.key]:'sell'});assert.equal(s.balance,String(3000-e.boxes[1].price+Number(items['g1-01'].price)));
  s=settle(s,{[first.key]:'sell'});assert.equal(s.balance,String(3000-e.boxes[1].price+Number(items['g1-01'].price)));assert.throws(()=>finish(s),/未处理/);
  const reloaded=validate(JSON.parse(JSON.stringify(s)),e,items);assert.deepEqual(reloaded.pending,s.pending);
  s=keepAll(reloaded);assert.equal(s.inventory['g1-01'].qty,2);assert.equal(s.balance,String(3000-e.boxes[1].price+Number(items['g1-01'].price)));
  s=finish(s);assert.equal(s.pending,null);assert.equal(s.seen['g1-01'].count,3);validate(s,e,items);
});
test('EX balances stay exact beyond 32-bit and Number safe limits', () => {
  let s=finish(sellAll(openBox(fresh(e),e,items,1,10000,ex)));
  assert.equal(s.balance,String(BigInt(e.currency.starting_balance-e.boxes[1].price)+27499999975n*3n));validate(s,e,items);
  s.inventory['ex-1']={qty:1000000,price:'27499999975',locked:false};s.seen['ex-1'].count+=1000000;
  const before=BigInt(s.balance);const sold=sellInventory(s,'ex-1',1000000);assert.equal(BigInt(sold.balance)-before,27499999975n*1000000n);
});
test('twenty paid boxes unlock tier 2 and pay 18000 once', () => {
  let s=fresh(e);
  for(let n=0;n<21;n++){s=openBox(s,e,items,1,10000+n*3000,ex);if(n===19){assert.equal(s.xp,60);assert.deepEqual(s.pending.rewards,[{tier:2,reward:18000}]);}if(n===20)assert.deepEqual(s.pending.rewards,[]);s=finish(sellAll(s));validate(s,e,items);}
  assert.equal(s.grants[1],true);
});
test('all progression grants, phase boundaries and conservation survive 301 openings', () => {
  let s=fresh(e),now=10000;
  for(let n=0;n<301;n++){
    const tier=e.boxes.filter(b=>b.tier>0&&s.xp>=e.progression.paid_tier_unlock_total_xp[b.tier-1]).at(-1).tier;
    s=finish(sellAll(openBox(s,e,items,tier,now,ex)));now+=3000;validate(s,e,items);
  }
  assert.equal(s.paidOpens,301);assert.deepEqual(s.grants,[true,true,true,true,true,true]);
});
test('display consumes quantities and locks protect bulk sale paths', () => {
  let s=finish(keepAll(openBox(fresh(e),e,items,1,10000,ordinary)));
  s=setDisplay(s,0,'g1-01');s=setDisplay(s,1,'g1-01');s=setDisplay(s,2,'g1-01');validate(s,e,items);
  assert.throws(()=>setDisplay(s,3,'g1-01'),/不足/);assert.throws(()=>sellInventory(s,'g1-01',1),/不足/);
  s=setDisplay(s,0,null);s=toggleLock(s,'g1-01');assert.throws(()=>sellInventory(s,'g1-01',1),/锁定/);
  s=toggleLock(s,'g1-01');s=sellInventory(s,'g1-01',1);assert.equal(s.inventory['g1-01'].qty,2);assert(s.seen['g1-01']);validate(s,e,items);
});
test('invalid imports are rejected without mutating source', () => {
  const original=fresh(e);for(const fn of [s=>s.balance='-1',s=>s.balance='9000',s=>s.xp=60,s=>s.grants[1]=true,s=>s.schemaVersion=99,s=>s.settings.sound='yes',s=>s.inventory.fake={qty:1,price:'100',locked:false},s=>s.display[0]='g1-01',s=>s.seen.constructor={count:1,firstAt:0}]){const bad=structuredClone(original);fn(bad);assert.throws(()=>validate(bad,e,items));}assert.equal(original.balance,'3000');validate(original,e,items);
});
test('48-bit unbiased sampler supports trillion weights and rejects ranges', () => {
  for(const max of [5,20,1000000,1e12])for(let i=0;i<100;i++){const n=uniform(max);assert(Number.isSafeInteger(n)&&n>=0&&n<max);}
  assert.throws(()=>uniform(0));assert.throws(()=>uniform(2**49));
});


test('optional debug high drops guarantee the highest grade and preserve valid saves', () => {
  let s = fresh(e);
  assert.equal(s.settings.debugMode, false);
  const legacy = structuredClone(s); delete legacy.settings.debugMode; validate(legacy,e,items);
  const invalid = structuredClone(s); invalid.settings.debugMode = 'yes';
  assert.throws(() => validate(invalid,e,items), /调试模式/);
  while (s.xp < e.progression.paid_tier_unlock_total_xp[5]) {
    s = finish(sellAll(openBox(s,e,items,1,10000,ex)));
  }
  s.settings.debugMode = true; s.settings.debugHighDrop = true;
  for (const random of [ordinary, ex]) {
    for (let n=0;n<3;n++) {
      const opened = openBox(s,e,items,6,10000,random);
      assert.equal(opened.pending.drops.length,e.boxes[6].item_count);
      assert(opened.pending.drops.some(d=>items[d.id].grade===8));
      validate(opened,e,items);
      s=finish(sellAll(opened));validate(s,e,items);
    }
  }
  const lower=openBox(s,e,items,1,10000,ordinary);
  assert(lower.pending.drops.some(d=>items[d.id].grade===8));
  s.settings.debugMode=false;
  const normal=openBox(s,e,items,6,10000,ordinary);
  assert(normal.pending.drops.every(d=>items[d.id].grade!==8));
  assert.equal(JSON.parse(JSON.stringify(s)).settings.debugMode,false);
});
