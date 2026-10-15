export const SCHEMA = 1;
export const CONTENT = 'items-world-v1';
export function migrateTestItems(state, items){
  const legacy=migrateLegacyItems(state,items);
  if(!items || !legacy || state.contentVersion===CONTENT)return legacy;
  if(!['items-test-v1','items-test-v2-single-ex','items-test-v3-turtle-red','polygon-v1'].includes(state.contentVersion))return legacy;
  const s=copy(legacy);
  for(const [oldId,newId] of [['g2-04','g2-02'],['g3-04','g1-05']]){
    if(s.seen[oldId]){
      const old=s.seen[oldId],existing=s.seen[newId];
      s.seen[newId]=existing?{...existing,count:existing.count+old.count,firstAt:Math.min(existing.firstAt,old.firstAt)}:old;
      delete s.seen[oldId];
    }
    if(s.inventory[oldId]){
      const old=s.inventory[oldId],existing=s.inventory[newId];
      s.inventory[newId]={qty:old.qty+(existing?.qty||0),price:items[newId].price,locked:old.locked||!!existing?.locked};
      delete s.inventory[oldId];
    }
    s.display=s.display.map(id=>id===oldId?newId:id);
    if(s.pending)for(const drop of s.pending.drops)if(drop.id===oldId){drop.id=newId;drop.price=items[newId].price;}
    if(s.warehousePositions)for(const key of Object.keys(s.warehousePositions))if(key.startsWith(oldId+'#'))delete s.warehousePositions[key];
  }
  s.contentVersion=CONTENT;s.revision++;s.updatedAt=Date.now();return s;
}
function migrateLegacyItems(state, items){
  if(state?.contentVersion==='items-test-v2-single-ex'){
    assert(items?.['g6-04'] && items?.['g1-01'], '物品迁移缺少内容目录');
    const s=copy(state);
    for(const [oldId,newId] of [['g1-03','g1-01'],['g5-02','g6-04']]){
      if(s.seen[oldId]){
        const old=s.seen[oldId],existing=s.seen[newId];
        s.seen[newId]=existing?{...existing,count:existing.count+old.count,firstAt:Math.min(existing.firstAt,old.firstAt)}:old;
        delete s.seen[oldId];
      }
      if(s.inventory[oldId]){
        const old=s.inventory[oldId],existing=s.inventory[newId];
        s.inventory[newId]={qty:old.qty+(existing?.qty||0),price:items[newId].price,locked:old.locked||!!existing?.locked};
        delete s.inventory[oldId];
      }
      s.display=s.display.map(id=>id===oldId?newId:id);
      if(s.pending)for(const drop of s.pending.drops)if(drop.id===oldId){drop.id=newId;drop.price=items[newId].price;}
      if(s.warehousePositions)for(const key of Object.keys(s.warehousePositions))if(key.startsWith(oldId+'#'))delete s.warehousePositions[key];
    }
    s.contentVersion=CONTENT;s.revision++;s.updatedAt=Date.now();return s;
  }
  if(state?.contentVersion==='items-test-v1'){
    const s=copy(state);
    for(const id of ['ex-2','ex-3']){
      if(s.seen[id]){
        const old=s.seen[id],existing=s.seen['ex-1'];
        s.seen['ex-1']=existing?{...existing,count:existing.count+old.count,firstAt:Math.min(existing.firstAt,old.firstAt)}:old;
        delete s.seen[id];
      }
      if(s.inventory[id]){
        const old=s.inventory[id],existing=s.inventory['ex-1'];
        assert(old.price==='27499999975'&&int(old.qty)&&old.qty>0&&typeof old.locked==='boolean','旧EX记录无效');
        s.inventory['ex-1']=existing?{...existing,qty:existing.qty+old.qty,locked:existing.locked||old.locked}:old;
        delete s.inventory[id];
      }
    }
    s.display=s.display.map(id=>id==='ex-2'||id==='ex-3'?'ex-1':id);
    if(s.pending)for(const drop of s.pending.drops)if(drop.id==='ex-2'||drop.id==='ex-3')drop.id='ex-1';
    if(s.warehousePositions)for(const key of Object.keys(s.warehousePositions))if(key.startsWith('ex-2#')||key.startsWith('ex-3#'))delete s.warehousePositions[key];
    s.contentVersion=CONTENT;s.revision++;s.updatedAt=Date.now();
    return s;
  }
  if(state?.contentVersion!=='polygon-v1')return state;
  return {...copy(state),contentVersion:CONTENT,inventory:{},seen:{},display:Array(6).fill(null),pending:null,warehousePositions:{},clearedDropCount:Object.values(state.seen).reduce((n,e)=>n+e.count,0),revision:state.revision+1,updatedAt:Date.now()};
}
const copy = x => structuredClone(x);
const int = x => Number.isSafeInteger(x) && x >= 0;
const amount = x => typeof x === 'string' && /^(0|[1-9]\d{0,79})$/.test(x);
const assert = (ok, message) => { if (!ok) throw new Error(message); };
export function migrateEconomy(state, e, items) {
  if (state.economyVersion === e.version) return state;
  const old = e.previous_economy;
  assert(old && state.economyVersion === old.version, '存档版本不兼容');
  const legacy = {...e, version:old.version, previous_economy:undefined,
    boxes:e.boxes.map((box,i)=>({...box,price:old.box_prices[i]}))};
  validate(state, legacy, items);
  const s = copy(state);
  s.economyHistory = {version:old.version, opens:[...s.stats.opens]};
  s.economyVersion = e.version;
  s.revision++;
  return validate(s, e, items);
}
export function uniform(max) {
  assert(Number.isSafeInteger(max) && max > 0 && max <= 2 ** 48, '随机范围无效');
  const range = 2 ** 48, limit = range - range % max;
  const data = new Uint32Array(2);
  let value;
  do { crypto.getRandomValues(data); value = (data[0] & 65535) * 2 ** 32 + data[1]; } while (value >= limit);
  return value % max;
}
export function weighted(weights, random = uniform) {
  let value = random(weights.reduce((a, b) => a + b, 0));
  for (let i = 0; i < weights.length; i++) { if (value < weights[i]) return i; value -= weights[i]; }
  throw new Error('概率权重无效');
}
export function weightsFor(economy, tier, paidIndex) {
  const weights = [...economy.ordinary.grade_weights[tier]];
  if (tier > 0) {
    const phase = economy.newcomer.phases.find(p => paidIndex >= p.paid_open_index_start && paidIndex <= p.paid_open_index_end);
    if (phase) {
      const first = economy.newcomer.shift_from_grade_by_tier?.[tier] !== undefined ? economy.newcomer.shift_from_grade_by_tier[tier] - 1 : weights.findIndex(w => w > 0);
      const shift = Math.round(phase.shift_lowest_to_next * economy.ordinary.grade_weight_denominator);
      weights[first] -= shift; weights[first + 1] += shift;
    }
  }
  return weights;
}
export function fresh(e, now = Date.now()) {
  return { schemaVersion: SCHEMA, economyVersion: e.version, contentVersion: CONTENT, revision: 0,
    balance: String(e.currency.starting_balance), xp: 0, paidOpens: 0, grants: [true, false, false, false, false, false],
    inventory: {}, warehouseUpgrades: 0, seen: {}, display: Array(6).fill(null), pending: null, nextAt: 0,
    createdAt: now, updatedAt: now, stats: { opens: Array(7).fill(0), saleIncome: '0', spent: '0' },
    settings: { sound: true, music: true, musicMode: 'rotate', reducedMotion: false, debugMode: false, autoSellEnabled:false, autoSellBelow:'0' }, tutorialDone: false };
}
export function unlocked(e, tier, xp) { return tier === 0 || xp >= e.progression.paid_tier_unlock_total_xp[tier - 1]; }
export function setDebugValue(state,e,field,value){
  assert(state.settings.debugMode,'请先开启调试模式');
  assert(!state.pending,'请先处理上一次开箱结果');
  assert(field==='balance'||field==='xp','未知调试选项');
  const s=copy(state);s.debugAdjustments ||= {balance:'0',xp:0};
  if(field==='balance'){
    assert(amount(value),'金币须为非负整数，最多80位');
    s.debugAdjustments.balance=String(BigInt(s.debugAdjustments.balance)+BigInt(value)-BigInt(s.balance));s.balance=value;
  }else{
    assert(typeof value==='string'&&/^(0|[1-9]\d*)$/.test(value)&&int(Number(value)),'EXP 须为安全范围内的非负整数');
    const xp=Number(value);s.debugAdjustments.xp+=xp-s.xp;s.xp=xp;
    for(let i=0;i<6;i++)if(!s.grants[i]&&unlocked(e,i+1,xp)){
      s.grants[i]=true;s.balance=String(BigInt(s.balance)+BigInt(e.progression.one_time_unlock_grants[i]));
    }
    for(const b of e.boxes)if(b.tier>0&&!unlocked(e,b.tier,state.xp)&&unlocked(e,b.tier,xp)){
      s.containerUnlocks ||= {};if(!s.containerUnlocks[b.tier])s.containerUnlocks[b.tier]='pending';
    }
  }
  return s;
}
export function openBox(state, e, items, tier, now = Date.now(), random = uniform) {
  assert(int(tier) && tier <= 6, '未知箱子');
  assert(!state.pending, '请先处理上一次开箱结果');
  assert(unlocked(e, tier, state.xp), '这个箱子尚未解锁');
  const box = e.boxes[tier];
  const free = state.containerUnlocks?.[tier] === "ready", cost = free ? "0" : box.price;
  assert(BigInt(state.balance) >= BigInt(cost), '游戏币不足，可先探索免费的下水道');
  const s = copy(state), drops = [], previous = new Set(Object.keys(state.seen)), usedNew = new Set();
  const weights = weightsFor(e, tier, state.paidOpens + 1);
  for (let n = 0; n < box.item_count; n++) {
    let id;
    if (s.settings.debugMode && s.settings.debugHighDrop && n === 0) {
      const grade=box.ex_numerator_per_million>0?8:weights.findLastIndex(w=>w>0)+1;
      const pool=Object.values(items).filter(item=>item.grade===grade);id=pool[random(pool.length)].id;
    }
    else if (random(1000000) < box.ex_numerator_per_million) id = `ex-${weighted(e.ex.conditional_weights, random) + 1}`;
    else {
      const grade = weighted(weights, random) + 1;
      const pool = Object.values(items).filter(item => item.grade === grade);
      id = pool[random(pool.length)].id;
    }
    drops.push({ key: `${s.revision + 1}-${n}`, id, price: items[id].price, status: null });
  }
  // Recovery is measured in resale value, never gross sale income alone.
  s.recovery = s.recovery || {};
  const recovery = s.recovery[tier + 1];
  let floor = tier > 0 ? BigInt(e.boxes[tier - 1].price) : 0n;
  if (e.profitability?.guaranteed_profit_tiers.includes(tier)) {
    const required = BigInt(box.price) + BigInt(e.profitability.minimum_net_by_tier?.[tier] ?? 1);
    if (required > floor) floor = required;
  }
  if (recovery) {
    const remaining = BigInt(Math.max(1, Math.min(e.recovery.target_opens, e.recovery.max_opens) - recovery.opens));
    const required = BigInt(box.price) + (BigInt(recovery.deficit) + remaining - 1n) / remaining;
    if (required > floor) floor = required;
  }
  let total = drops.reduce((sum, d) => sum + BigInt(d.price), 0n);
  // Upgrade ordinary drops only; EX results and fixed item prices remain intact.
  while (total < floor) {
    const d = drops.filter(d => items[d.id].grade < 7).sort((a,b) => items[a.id].grade - items[b.id].grade)[0];
    assert(d, '掉落池无法满足回收保底');
    const next = items[`g${items[d.id].grade + 1}-${d.id.split('-')[1]}`] || items[`g${items[d.id].grade + 1}-01`];
    total += BigInt(next.price) - BigInt(d.price);
    d.id = next.id; d.price = next.price;
  }
  if (recovery) {
    const deficit = BigInt(recovery.deficit) - (total - BigInt(box.price));
    if (deficit <= 0n) delete s.recovery[tier + 1];
    else s.recovery[tier + 1] = { deficit: String(deficit), opens: recovery.opens + 1 };
  }
  if (tier > 0) {
    const deficit = BigInt(box.price) - total;
    if (deficit > 0n) s.recovery[tier] = { deficit: String(deficit), opens: 0 };
    else delete s.recovery[tier];
  }
  for (const d of drops) {
    const isNew = !previous.has(d.id);
    d.isNew = isNew; d.keepSuggested = isNew && !usedNew.has(d.id);
    if (isNew) usedNew.add(d.id);
    s.seen[d.id] = { count: (s.seen[d.id]?.count || 0) + 1, firstAt: s.seen[d.id]?.firstAt ?? now };
  }
  if(free)s.containerUnlocks[tier]="used";
  s.balance = String(BigInt(s.balance) - BigInt(cost));
  s.stats.spent = String(BigInt(s.stats.spent) + BigInt(cost));
  s.stats.opens[tier]++;
  s.xp += e.progression.xp_per_open[tier];
  for(const b of e.boxes)if(b.tier>0&&!unlocked(e,b.tier,state.xp)&&unlocked(e,b.tier,s.xp)){s.containerUnlocks ||= {};if(!s.containerUnlocks[b.tier])s.containerUnlocks[b.tier]="pending";}
  if (tier > 0) s.paidOpens++;
  const rewards = [];
  for (let i = 1; i < 6; i++) if (!s.grants[i] && s.xp >= e.progression.paid_tier_unlock_total_xp[i]) {
    s.grants[i] = true;
    const reward = e.progression.one_time_unlock_grants[i];
    s.balance = String(BigInt(s.balance) + BigInt(reward));
    rewards.push({ tier: i + 1, reward });
  }
  s.nextAt = 0;
  s.pending = { tier, cost: String(cost), freeUnlock:free, openedAt: now, drops, rewards };
  return s;
}
export function settle(state, choices) {
  assert(state.pending, '没有待处理的结果');
  const s = copy(state);
  for (const drop of s.pending.drops) {
    const action = choices[drop.key];
    if (drop.status || !action) continue;
    assert(action === 'keep' || action === 'sell', '无效处理方式');
    if (action === 'keep') {
      const entry = s.inventory[drop.id] || { qty: 0, price: drop.price, locked: false };
      entry.qty++; s.inventory[drop.id] = entry;
    } else {
      s.balance = String(BigInt(s.balance) + BigInt(drop.price));
      s.stats.saleIncome = String(BigInt(s.stats.saleIncome) + BigInt(drop.price));
    }
    drop.status = action;
  }
  return s;
}
export function autoSellDrops(state){
 if(!state.pending||!state.settings.autoSellEnabled)return state;
 const threshold=BigInt(state.settings.autoSellBelow||'0'),choices={};
 for(const d of state.pending.drops)if(!d.status&&BigInt(d.price)<threshold&&!state.inventory[d.id]?.locked&&!exhibited(state,d.id))choices[d.key]='sell';
 return settle(state,choices);
}
export function finish(state) {
  assert(state.pending && state.pending.drops.every(d => d.status), '还有物品未处理');
  const s = copy(state); s.pending = null; s.tutorialDone = true; return s;
}
export function exhibited(state, id) { return state.display.filter(x => x === id).length; }
export function sellInventory(state, id, qty) {
  const entry = state.inventory[id];
  assert(entry && !entry.locked, '该物品已锁定或不存在');
  assert(int(qty) && qty > 0 && qty <= entry.qty - exhibited(state, id), '可出售数量不足，展品不能出售');
  const s = copy(state), value = BigInt(entry.price) * BigInt(qty);
  s.inventory[id].qty -= qty;
  if (!s.inventory[id].qty) delete s.inventory[id];
  s.balance = String(BigInt(s.balance) + value);
  s.stats.saleIncome = String(BigInt(s.stats.saleIncome) + value);
  return s;
}
export function toggleLock(state, id) {
  assert(state.inventory[id], '物品不存在');
  const s = copy(state); s.inventory[id].locked = !s.inventory[id].locked; return s;
}
export function setDisplay(state, slot, id) {
  assert(int(slot) && slot < 6, '展位不存在');
  if (id !== null) assert(state.inventory[id] && state.inventory[id].qty > exhibited(state, id) - (state.display[slot] === id ? 1 : 0), '可摆放数量不足');
  const s = copy(state); s.display[slot] = id; return s;
}
export function validate(s, e, items) {
  assert(s?.warehouseUpgrades === undefined || (int(s.warehouseUpgrades) && s.warehouseUpgrades <= 256), '仓库升级记录无效');
  if(s?.warehousePositions!==undefined){assert(s.warehousePositions&&typeof s.warehousePositions==='object'&&!Array.isArray(s.warehousePositions),'仓库位置记录无效');for(const p of Object.values(s.warehousePositions))assert(p&&int(p.x)&&p.x<20&&int(p.y)&&(p.rotated===undefined||typeof p.rotated==='boolean'),'仓库位置记录无效');}
  if(s?.recovery!==undefined){
    assert(s.recovery && typeof s.recovery==='object' && !Array.isArray(s.recovery), '回收保底记录无效');
    for(const [tier,r] of Object.entries(s.recovery)) assert(/^[1-6]$/.test(tier) && r && amount(r.deficit) && BigInt(r.deficit)>0n && BigInt(r.deficit)<=BigInt(s.economyHistory ? e.previous_economy.box_prices[Number(tier)] : e.boxes[Number(tier)].price) && int(r.opens) && r.opens<e.recovery.max_opens, '回收保底记录无效');
  }
  const known = id => typeof id === 'string' && Object.hasOwn(items, id);
  assert(s && s.schemaVersion === SCHEMA && s.economyVersion === e.version && s.contentVersion === CONTENT, '存档版本不兼容');
  assert(amount(s.balance) && int(s.xp) && int(s.paidOpens) && int(s.revision) && int(s.createdAt) && int(s.updatedAt) && int(s.nextAt), '存档金额或计数无效');
  assert(s.stats && Array.isArray(s.stats.opens) && s.stats.opens.length === 7 && s.stats.opens.every(int) && amount(s.stats.saleIncome) && amount(s.stats.spent), '存档统计无效');
  assert(s.debugAdjustments===undefined || (s.debugAdjustments && typeof s.debugAdjustments==='object' && Number.isSafeInteger(s.debugAdjustments.xp) && typeof s.debugAdjustments.balance==='string' && /^-?(0|[1-9]\d{0,80})$/.test(s.debugAdjustments.balance)), '调试调整记录无效');
  assert(s.xp === (s.debugAdjustments?.xp||0) + s.stats.opens.reduce((a, n, i) => a + n * e.progression.xp_per_open[i], 0) && s.paidOpens === s.stats.opens.slice(1).reduce((a, b) => a + b, 0), '成长记录不一致');
  assert(Array.isArray(s.grants) && s.grants.length === 6 && s.grants.every((x, i) => typeof x === 'boolean' && (x === (s.xp >= e.progression.paid_tier_unlock_total_xp[i]) || (!!s.debugAdjustments && x))), '解锁奖励记录不一致');
  assert(s.inventory && typeof s.inventory === 'object' && !Array.isArray(s.inventory) && s.seen && typeof s.seen === 'object' && !Array.isArray(s.seen), '物品记录无效');
  for (const [id, entry] of Object.entries(s.seen)) assert(known(id) && entry && int(entry.count) && entry.count > 0 && int(entry.firstAt), '图鉴记录无效');
  const found = Object.values(s.seen).reduce((n, entry) => n + entry.count, 0);
  assert(int(s.clearedDropCount??0)&&int(found) && found+(s.clearedDropCount??0) === s.stats.opens.reduce((n, count, i) => n + count * e.boxes[i].item_count, 0), '发现数量不一致');
  const history = s.economyHistory;
  if (history !== undefined) assert(history && e.previous_economy && history.version === e.previous_economy.version && Array.isArray(history.opens) && history.opens.length === 7 && history.opens.every((n,i)=>int(n)&&n<=s.stats.opens[i]), '旧经济记录无效');
  assert(s.containerUnlocks===undefined || (s.containerUnlocks && typeof s.containerUnlocks==='object' && !Array.isArray(s.containerUnlocks) && Object.entries(s.containerUnlocks).every(([tier,status])=> /^[1-6]$/.test(tier) && ['pending','ready','used'].includes(status) && (unlocked(e,Number(tier),s.xp)||!!s.debugAdjustments) && (status!=='used'||s.stats.opens[Number(tier)]>(s.economyHistory?.opens[Number(tier)]||0)))), '容器解锁记录无效');
  const freeSavings=Object.entries(s.containerUnlocks||{}).reduce((n,[tier,status])=>n+(status==='used'?BigInt(e.boxes[Number(tier)].price):0n),0n);
  const expectedSpent = s.stats.opens.reduce((n, count, i) => {
    const oldCount = history?.opens[i] || 0;
    return n + BigInt(oldCount) * BigInt(e.previous_economy?.box_prices[i] || 0) + BigInt(count-oldCount) * BigInt(e.boxes[i].price);
  }, 0n) - freeSavings;
  const grantsValue = s.grants.reduce((n, claimed, i) => n + (claimed ? BigInt(e.progression.one_time_unlock_grants[i]) : 0n), 0n);
  const warehouseSpent=1500n*(2n**BigInt(s.warehouseUpgrades||0)-1n);
  assert(BigInt(s.stats.spent) === expectedSpent && BigInt(s.balance) === BigInt(s.debugAdjustments?.balance||0) + BigInt(e.currency.starting_balance) + grantsValue + BigInt(s.stats.saleIncome) - expectedSpent - warehouseSpent, '货币记录不一致');
  for (const [id, entry] of Object.entries(s.inventory)) assert(known(id) && entry && int(entry.qty) && entry.qty > 0 && entry.qty <= (s.seen[id]?.count || 0) && amount(entry.price) && entry.price === items[id].price && typeof entry.locked === 'boolean', '仓库记录无效');
  assert(Array.isArray(s.display) && s.display.length === 6, '展位记录无效');
  for (const id of s.display) assert(id === null || (known(id) && s.inventory[id] && exhibited(s, id) <= s.inventory[id].qty), '展位缺少对应实物');
  assert(s.settings && (s.settings.music === undefined || typeof s.settings.music === 'boolean') && typeof s.settings.sound === 'boolean' && typeof s.settings.reducedMotion === 'boolean' && typeof s.tutorialDone === 'boolean', '设置记录无效');
  assert(s.settings.debugHighDrop===undefined||typeof s.settings.debugHighDrop==='boolean','高爆率设置无效');
  assert(s.settings.debugMode === undefined || typeof s.settings.debugMode === 'boolean', '调试模式设置无效');
  assert(s.settings.musicMode === undefined || ['rotate','starlight','sunshine'].includes(s.settings.musicMode), '背景音乐播放方式无效');
  assert((s.settings.autoSellEnabled===undefined||typeof s.settings.autoSellEnabled==='boolean')&&(s.settings.autoSellBelow===undefined||amount(s.settings.autoSellBelow)), '自动出售设置无效');
  if (s.pending !== null) {
    const p = s.pending;
    const cost = p && int(p.tier) && p.tier <= 6 ? (history && history.opens[p.tier] === s.stats.opens[p.tier] ? e.previous_economy.box_prices[p.tier] : e.boxes[p.tier].price) : undefined;
    assert(p && int(p.tier) && p.tier <= 6 && p.cost === String(p.freeUnlock ? 0 : cost) && (p.freeUnlock===undefined || typeof p.freeUnlock==='boolean') && (!p.freeUnlock || s.containerUnlocks?.[p.tier]==='used') && int(p.openedAt) && Array.isArray(p.drops) && p.drops.length === e.boxes[p.tier].item_count && Array.isArray(p.rewards), '开箱记录无效');
    const keys = new Set();
    for (const d of p.drops) {
      assert(d && typeof d.key === 'string' && !keys.has(d.key) && known(d.id) && d.price === items[d.id].price && [null, 'sell', 'keep'].includes(d.status) && typeof d.isNew === 'boolean' && typeof d.keepSuggested === 'boolean' && s.seen[d.id], '掉落记录无效');
      keys.add(d.key);
    }
    for (const r of p.rewards) assert(r && int(r.tier) && r.tier >= 2 && r.tier <= 6 && r.reward === e.progression.one_time_unlock_grants[r.tier - 1] && s.grants[r.tier - 1], '奖励记录无效');
    for (const id of new Set(p.drops.map(d => d.id))) assert((s.inventory[id]?.qty || 0) + p.drops.filter(d => d.id === id && d.status === null).length <= s.seen[id].count, '待处理物品与仓库数量冲突');
  }
  return s;
}
