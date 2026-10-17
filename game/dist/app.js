import { createUnlockSounds } from './unlock-sounds.js';
import { renderCoverTitle, renderCoverButton } from './cover-title.js';
import { createWaitingMusic } from './waiting-music.js';
import { makeItems, gradeNames, colors, lootColors, tierNames, tierSubtitles, itemSVG, lootArt, crateSVG } from './content.js';
import { fresh, validate, setDebugValue, openBox, settle, finish, sellInventory, toggleLock, setDisplay, exhibited, unlocked, weightsFor, migrateTestItems, migrateEconomy, autoSellDrops, settleInterruptedOpen } from './engine.js';
import { connect, read, write } from './storage.js';
import { packWarehouse, moveWarehouseItem, warehouseDropTarget, sellableInstance, sellWarehouseInstances, tidyWarehouse } from './warehouse.js';
import { createMusic } from './music.js';
import { advanceSpecialStep, singleRevealStep } from './special-reveal.js';
import {createDivineReveal} from './divine-reveal.js';
const divineReveal=createDivineReveal();

const $ = selector => document.querySelector(selector);
const app = $('#app'), modalRoot = $('#modal-root');
const settlementSound=new Audio('./assets/audio/musiclab-settlement-music-box-v1.wav');
settlementSound.preload='auto';settlementSound.volume=.65;
window.addEventListener('pagehide',()=>settlementSound.pause());
let settlementTimers=[],settlementVoices=[];
function stopSettlementSounds(){
 for(const timer of settlementTimers)clearTimeout(timer);
 for(const player of settlementVoices)player.pause();
 settlementTimers=[];settlementVoices=[];
}
window.addEventListener('pagehide',stopSettlementSounds);
function playSettlementSequence(count){
 for(let i=0;i<count;i++)settlementTimers.push(setTimeout(()=>{
   if(!state?.settings.sound||route!=='container'||rewardIndex>=0||!state.pending)return;
   const player=settlementSound.cloneNode();player.volume=settlementSound.volume;
   settlementVoices.push(player);player.play().catch(()=>{});
 },i*90));
}
let specialStep=0,specialVoices=[];
const specialSounds={grade7:Array.from({length:3},(_,i)=>new Audio(`./assets/audio/reveals/musiclab-grade7-step-${i+1}-brass-v14.wav`)),ex:Array.from({length:4},(_,i)=>new Audio(i===3?'./assets/audio/reveals/musiclab-ex-single-choir-v15.wav':`./assets/audio/reveals/musiclab-ex-step-${i+1}-brass-v14.wav`))};
for(const players of Object.values(specialSounds))for(const player of players)player.preload='auto';
function stopSpecialSounds(){for(const player of specialVoices){player.pause();player.currentTime=0;}specialVoices=[];}
function playSpecialSound(grade,step){if(!state.settings.sound)return;const player=specialSounds[grade===8?'ex':'grade7'][step-1].cloneNode();player.volume=.8;specialVoices.push(player);player.play().catch(()=>{});}
window.addEventListener('pagehide',stopSpecialSounds);
const gradeRevealSounds = Array.from({length:6},(_,i)=>{
  const player=new Audio(`./assets/audio/reveals/musiclab-arcade-grade-${i+1}.wav`);
  player.preload='auto';player.volume=.65;return player;
});
function stopGradeRevealSounds(){for(const player of gradeRevealSounds){player.pause();player.currentTime=0;}}
window.addEventListener('pagehide',stopGradeRevealSounds);
let unlockScene=null, unlockTimer=null;
const unlockSounds=createUnlockSounds({canPlay:()=>!!unlockScene&&!unlockScene.ready&&state?.settings.sound&&!document.hidden});
window.addEventListener('pagehide',()=>unlockSounds.stop());
document.addEventListener('visibilitychange',()=>{if(document.hidden)unlockSounds.stop();});
let exWaiting = false, grade7Finale = false;
const musicPlayer = new Audio('./assets/audio/musiclab-daily-starlight.mp3');
musicPlayer.playbackRate = 1;
musicPlayer.preservesPitch = true;
const music = createMusic(musicPlayer, { fadeInMs: 2500, playlist: [
  './assets/audio/musiclab-daily-starlight.mp3',
  './assets/audio/musiclab-daily-sunshine.mp3',
] });
const waitingMusic=createWaitingMusic();
const waitingSoundPaths=[
  "./assets/audio/waiting/musiclab-sewer-wait.wav",
  "./assets/audio/waiting/musiclab-wood-wait.wav",
  "./assets/audio/waiting/musiclab-iron-wait.wav",
  "./assets/audio/waiting/musiclab-rune-wait.wav",
  "./assets/audio/waiting/musiclab-amethyst-wait.wav",
  "./assets/audio/waiting/musiclab-royal-wait.wav",
  "./assets/audio/waiting/musiclab-star-crown-wait.wav"
];
function unlockWaitingSounds(){waitingMusic.unlock();}
function syncWaitingSounds(){
 if(unlockScene){waitingMusic.update(unlockScene.ready&&state?.settings.sound&&!document.hidden?waitingSoundPaths[unlockScene.tier]:null);return;}
 const active=enteredGame&&!!state&&state.settings.sound&&route==='container'&&!state.pending&&!openingInFlight&&!unlockScene&&!document.hidden;
 waitingMusic.update(active?(waitingSoundPaths[selected]):null);
}
window.addEventListener('pagehide',()=>waitingMusic.update(null));

const homeClick = new Audio('./assets/audio/buttons/mixkit-cool-interface-click-tone-2568.wav');
const codexPageSound = new Audio('./assets/audio/mixkit-paper-slide-1530.wav');
codexPageSound.preload='auto';codexPageSound.volume=.6;
window.addEventListener('pagehide',()=>codexPageSound.pause());
function playCodexPageSound(){
 if(!state?.settings.sound)return;
 codexPageSound.pause();codexPageSound.currentTime=0;
 codexPageSound.play().catch(()=>{});
}
const warehouseDragSound = new Audio('./assets/audio/mixkit-coins-sound-2003.wav');
warehouseDragSound.playbackRate = 1.2;
const warehouseDropSound = new Audio('./assets/audio/mixkit-money-bag-drop-1989.wav');
for(const player of [warehouseDragSound,warehouseDropSound])player.preload='auto';
function playWarehouseSound(player){
 if(!state?.settings.sound)return;
 player.currentTime=0;player.play().catch(()=>{});
}
homeClick.preload = 'auto';
homeClick.volume = .6;
const carouselClick = new Audio('./assets/audio/buttons/03-crystal.wav');
carouselClick.preload = 'auto';
carouselClick.volume = .6;
const chestOpenSound = new Audio('./assets/audio/mixkit-kitchen-toaster-pops-1821.wav');
const chestCoinsSound = new Audio('./assets/audio/mixkit-coins-handling-1939.wav');
chestCoinsSound.preload='auto';chestCoinsSound.volume=.6;
window.addEventListener('pagehide',()=>chestCoinsSound.pause());
chestOpenSound.preload = 'auto';
chestOpenSound.volume = .6;
const openingPlaybackSpeed = 2;
const openingDurationMs = 800 / openingPlaybackSpeed;
chestOpenSound.playbackRate = .8 * openingPlaybackSpeed;
const manholeOpenSound = new Audio('./assets/audio/manhole-click-clack-41196.wav');
manholeOpenSound.preload = 'auto';
manholeOpenSound.volume = .6;
manholeOpenSound.playbackRate = 1.5 * openingPlaybackSpeed;
function playCarouselClick() {
  if (!state.settings.sound) return;
  carouselClick.pause();
  carouselClick.currentTime = 0;
  carouselClick.play().catch(() => { /* Audio failure must not block scrolling. */ });
}
function playHomeClick() {
  if (!state.settings.sound) return;
  homeClick.pause();
  homeClick.currentTime = 0;
  homeClick.play().catch(() => { /* Sound playback must not block navigation. */ });
}
function playInterfaceClick(target){
  if(!state)return;
  const control=target.closest('button,a[href],input,textarea,[role="button"]');
  if((route==='open'||route==='container')&&!control?.matches('.treasure-exit[data-action="nav"]'))return;
  if(!control||control.matches(':disabled')||control.closest('[inert],[aria-disabled="true"]'))return;
  if(control.closest('.home-scene')||control.dataset.action==='enter-game')return;
  if(['codex-page','sell-item','bulk-sell','execute-sale-selection','execute-detail-sale','execute-bulk-sale','settle-one','settle-all','open'].includes(control.dataset.action))return;
  playHomeClick();
}
let enteredGame = false;
const syncMusic = () => {
  syncWaitingSounds();
  music.update(!!state && state.settings.music !== false, !document.hidden, unlockScene||route==='container'||modal==='result' ? 0 : .18, state?.settings.musicMode ?? 'rotate');
};
document.addEventListener('visibilitychange', syncMusic);
window.addEventListener('pagehide', () => music.update(false));
let economy;
try { economy = await fetch('./economy.json').then(r => { if (!r.ok) throw new Error('数值配置加载失败'); return r.json(); }); }
catch(error) { app.innerHTML='<div class="unavailable"><h1>收藏所暂时无法打开</h1><p>数值资源未能加载，请恢复网络后刷新页面。</p></div>'; throw error; }
const items = makeItems(economy), allItems = Object.values(items);
let state, db, busy = false, saveError = '', route = 'home', selected = 1, gradeFilter = 'all', query = '', sort = 'grade', modal = null, revealAt = 0, audio;
const money = value => BigInt(value).toLocaleString('zh-CN');
let codexPage=0;
let warehouseSelling=false,warehouseSelection=new Set(),saleGrade=1;
let openingInFlight=false,revealTimer,rewardIndex=-1,overviewUntil=0,nextRevealAt=0;
function skipRevealQueue(){
 if(busy||route!=='container'||!state.pending||rewardIndex<0)return;
 showRewardReveal(state.pending.drops.length);
}
function advanceSpecialReveal(){
 if(!exWaiting||busy||!state.pending)return;
 const grade=items[state.pending.drops[rewardIndex].id].grade;
 const next=advanceSpecialStep(grade,specialStep,Date.now(),nextRevealAt);
 if(next===specialStep)return;
 specialStep=next;nextRevealAt=Date.now()+500;playSpecialSound(grade,specialStep);
 if(specialStep===(grade===8?4:3)){exWaiting=false;grade7Finale=true;}
 render();
}
function showRewardReveal(index){
 clearTimeout(revealTimer);revealAt=0;
 stopSettlementSounds();
 stopGradeRevealSounds();
 divineReveal.stop();stopSpecialSounds();specialStep=0;exWaiting=false;grade7Finale=false;
 if(!state.pending)return;
 rewardIndex=index<state.pending.drops.length?index:-1;
 const grade=rewardIndex>=0?items[state.pending.drops[rewardIndex].id].grade:0;
 nextRevealAt=Date.now()+500;
 if(grade===7 || grade===8){
   specialStep=singleRevealStep(grade);exWaiting=false;grade7Finale=true;playSpecialSound(grade,specialStep);
 }
 overviewUntil=rewardIndex<0?Date.now()+(state.pending.drops.length-1)*90+180:0;render();
 if(rewardIndex<0&&state.settings.sound)playSettlementSequence(state.pending.drops.length);
 if(grade>=1&&grade<=6&&state.settings.sound)gradeRevealSounds[grade-1].play().catch(()=>{});
}
const compactMoney = value => { const n=BigInt(value); if(n<100000000n)return money(value); return `${n/100000000n}.${String((n%100000000n)/1000000n).padStart(2,'0')} 亿`; };
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const icons = {
  box: '<path d="m4 7 8-4 8 4v10l-8 4-8-4Zm0 0 8 4 8-4M12 11v10"/>',
  bag: '<path d="M5 8h14l1 13H4Zm3 0V6a4 4 0 0 1 8 0v2"/>',
  book: '<path d="M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3ZM12 6v15M6 8h3M15 8h3M6 12h3M15 12h3"/>',
  gallery: '<path d="M3 4h18v17H3ZM3 16h18M8 16V9h3v7M15 16v-5h3v5"/>',
  settings: '<path d="M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6"/>',
  coin: '<path d="m12 2 9 5v10l-9 5-9-5V7Zm0 5v10M8 9h7M8 14h7"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  lock: '<path d="M6 10h12v11H6Zm2 0V6a4 4 0 0 1 8 0v4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
  sound: '<path d="M4 9h4l5-5v16l-5-5H4ZM17 8a6 6 0 0 1 0 8"/>',
  music: '<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
const btn = (label, action, extra = '', cls = 'button secondary') => `<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
function toast(message) {
  $('#toast').textContent = message; $('#toast').classList.add('visible');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 4000);
}
function playSound(kind = 'open') {
  if (!state.settings.sound) return;
  if (kind === 'open') {
    const openingSound = state.pending?.tier === 0 ? manholeOpenSound : chestOpenSound;
    openingSound.pause();
    openingSound.currentTime = 0;
    openingSound.play().catch(() => { /* Audio failure must not block opening. */ });
    if(state.pending?.tier>0){chestCoinsSound.pause();chestCoinsSound.currentTime=0;chestCoinsSound.play().catch(()=>{});}
    return;
  }
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume();
    const notes = kind === 'open' ? [220, 330, 440] : kind === 'rare' ? [440, 660, 880, 1100] : [520, 700];
    notes.forEach((freq, i) => {
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'sine'; osc.frequency.value = freq; gain.gain.setValueAtTime(0, audio.currentTime + i * .08);
      gain.gain.linearRampToValueAtTime(.045, audio.currentTime + i * .08 + .01);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + i * .08 + .19);
      osc.connect(gain); gain.connect(audio.destination); osc.start(audio.currentTime + i * .08); osc.stop(audio.currentTime + i * .08 + .2);
    });
  } catch { /* Audio is optional when the browser does not support it. */ }
}
function discovered() { return Object.keys(state.seen).length; }
function highest() { return economy.boxes.filter(b => unlocked(economy, b.tier, state.xp)).at(-1).tier; }
function nextUnlock() { return economy.boxes.find(b => b.tier > 0 && !unlocked(economy, b.tier, state.xp)); }
function newbie() {
  const index = state.paidOpens + 1;
  const phase = economy.newcomer.phases.find(p => index >= p.paid_open_index_start && index <= p.paid_open_index_end);
  return phase ? { label: `新手加成 +${Math.round(phase.shift_lowest_to_next * 100)}%`, left: phase.paid_open_index_end - state.paidOpens, phase } : { label: '标准掉落阶段', left: 0 };
}
function render() {
  if (!state) return;
  if(!enteredGame||route!=='container'||!state.pending||rewardIndex<0||(!exWaiting&&!grade7Finale))divineReveal.stop();
  if(!state.settings.sound){unlockSounds.stop();codexPageSound.pause();stopGradeRevealSounds();settlementSound.pause();stopSettlementSounds();chestCoinsSound.pause();}
  if(route!=='container'||!state.pending)stopSettlementSounds();
  document.body.classList.toggle('grade7-animating', exWaiting && rewardIndex>=0 && state.pending && items[state.pending.drops[rewardIndex].id].grade>=7);
  syncMusic();
  document.body.classList.toggle('reduce-motion', state.settings.reducedMotion);
  if (!enteredGame && route!=='settings') {
    document.body.classList.remove('gallery-active', 'codex-active', 'warehouse-active', 'treasure-active');
    document.body.classList.add('home-active');
    const utilityAction=document.activeElement?.closest('.home-utilities [data-action]')?.dataset.action;
    const coverUtilities=app.querySelector('.entrance-scene .home-utilities');
    if(coverUtilities)coverUtilities.innerHTML=utilityButtons('home-utility');
    else app.innerHTML = renderEntrance();
    requestAnimationFrame(() => $(utilityAction?`.home-utilities [data-action="${utilityAction}"]`:'[data-action="enter-game"]')?.focus({ preventScroll: true }));
    return;
  }
  if(!saveError && !state.pending && !modal && ['home','open'].includes(route)){
    const tier=Object.entries(state.containerUnlocks||{}).find(([tier,status])=>status==='pending'&&unlocked(economy,Number(tier),state.xp))?.[0];
    if(tier && !unlockScene){unlockScene={tier:Number(tier),ready:false,startedAt:Date.now(),backdrop:route==='home'?renderHome():renderCarousel()};unlockSounds.start({reducedMotion:state.settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches});clearTimeout(unlockTimer);unlockTimer=setTimeout(async()=>{
      if(!unlockScene)return;
      const tier=unlockScene.tier;
      if(await mutate(s=>({...s,containerUnlocks:{...s.containerUnlocks,[tier]:'ready'}}))){unlockScene.ready=true;selected=tier;render();syncWaitingSounds();}else{unlockSounds.stop();unlockScene=null;route='home';render();}
    },state.settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches?100:3100);}
  }
  if(unlockScene){
    syncMusic();
    document.body.classList.toggle('home-active',route==='home');document.body.classList.remove('gallery-active','warehouse-active','codex-active');document.body.classList.add('treasure-active');
    const tier=unlockScene.tier;
    app.innerHTML=`<div class="unlock-backdrop" inert aria-hidden="true">${unlockScene.backdrop}</div><main style="--unlock-elapsed:-${(Date.now()-unlockScene.startedAt)/1000}s" class="treasure-page unlock-scene ${unlockScene.ready?'unlock-ready':''}" aria-label="容器解锁" aria-live="polite"><h1 class="container-name outlined-text">${tierNames[tier]} · ${unlockScene.ready?'已解锁':'正在解锁'}</h1><button class="bouncing-container" data-container-grade="${tier+1}" style="--container-glow:${lootColors[tier]};--container-mask:url('./assets/containers/container-${tier}-v2.png')" data-action="claim-unlock" ${unlockScene.ready?'':'disabled'} aria-label="免费开启一次${tierNames[tier]}"><span class="container-wait-glow glow-far"><span></span></span><span class="container-wait-glow glow-near"><span></span></span>${crateSVG(tier)}<span class="container-chains unlock-chain-fragments" role="img" aria-label="卡通锁与交叉锁链">${[
 ['0 0,50% 0,50% 50%,0 50%',-95,-65,-55],['50% 0,100% 0,100% 50%,50% 50%',95,-65,60],
 ['0 50%,50% 50%,50% 100%,0 100%',-90,100,-85],['50% 50%,100% 50%,100% 100%,50% 100%',90,100,90]
 ].map(([clip,x,y,r])=>`<img class="unlock-chain-piece" src="./assets/ui/container-cross-chains-lock-v2.png" alt="" style="clip-path:polygon(${clip});--shard-x:${x}px;--shard-y:${y}px;--shard-turn:${r}deg">`).join('')}</span></button><div class="unlock-caption outlined-text">${unlockScene.ready?'点击容器 · 免费开启一次':'EXP 已达成'}</div></main>`;
    waitingMusic.update(unlockScene.ready&&state.settings.sound&&!document.hidden?waitingSoundPaths[tier]:null);return;
  }
  document.body.classList.toggle('home-active', route === 'home');
  if(route==='settings'){
    document.body.classList.remove('gallery-active','codex-active','warehouse-active','treasure-active');
    document.body.classList.toggle('reduce-motion',state.settings.reducedMotion);
    const setting=document.activeElement?.dataset.setting;
    app.innerHTML=renderSettingsPage();
    if(setting)document.querySelector(`[data-setting="${setting}"]`)?.focus({preventScroll:true});
    return;
  }
  document.body.classList.toggle('gallery-active', route==='gallery');
  if(route==='gallery'){document.body.classList.remove('warehouse-active','treasure-active','codex-active');app.innerHTML=renderGallery();return;}
  document.body.classList.toggle('codex-active', route==='codex');
  if(route==='codex'){document.body.classList.remove('warehouse-active','treasure-active');app.innerHTML=renderBookCodex();return;}
  document.body.classList.toggle('warehouse-active', route === 'inventory');
  if(route==='inventory'){const previousScroll=$('.warehouse-scroll'),scrollLeft=previousScroll?.scrollLeft||0,scrollTop=previousScroll?.scrollTop||0;app.innerHTML=renderWarehouse();setupWarehouseDrag();$('.warehouse-scroll').scrollLeft=scrollLeft;$('.warehouse-scroll').scrollTop=scrollTop;return;}
  document.body.classList.toggle('treasure-active', route === 'open' || route === 'container');
  document.body.classList.toggle('reduce-motion', state.settings.reducedMotion);
  if (route === 'open' || route === 'container') {
    app.innerHTML = route === 'open' ? renderCarousel() : renderContainerPage();
    if (route === 'open') setupCarousel();
    const divineHost=app.querySelector('[data-divine-grade]');
    if(divineHost)divineReveal.sync(divineHost,{grade:Number(divineHost.dataset.divineGrade),phase:specialStep,quiet:state.settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches});
    return;
  }
  if (route === 'home') {
    app.innerHTML = renderHome();
    if (modal === 'result') renderResult();
    return;
  }
  const active = document.activeElement;
  const focus = active?.id, selection = active?.selectionStart;
  const nav = [['home', 'arrow', '返回主页'], ['open', 'box', '开箱工作台'], ['inventory', 'bag', '我的仓库'], ['codex', 'book', '神秘图鉴'], ['gallery', 'gallery', '收藏馆']];
  const titles = { open: ['开箱工作台', '从未知中，发现你的下一件珍藏。'], inventory: ['我的仓库', '每一次选择，都会留下独一无二的收藏。'], codex: ['神秘图鉴', '收集世界的碎片，让未知逐渐成为记忆。'], gallery: ['收藏馆', '把值得珍藏的故事，放在看得见的地方。'] };
  const n = nextUnlock(), level = highest(), phase = newbie();
  document.body.classList.toggle('reduce-motion', state.settings.reducedMotion);
  app.innerHTML = `<div class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="#" data-action="nav" data-route="home" aria-label="Wonderseeker 首页"><img src="./icon.svg" alt=""><span>Wonderseeker<small>异想寻宝家</small></span></a>
      <div class="nav-label">COLLECTOR'S DESK</div>
      <nav aria-label="游戏导航">${nav.map(([id, name, label]) => `<button aria-label="${label}" data-action="nav" data-route="${id}" class="nav-button ${route === id ? 'active' : ''}" ${route === id ? 'aria-current="page"' : ''}>${icon(name)}<span>${label}</span>${id === 'codex' ? `<small>${discovered()}</small>` : ''}</button>`).join('')}</nav>
      <div class="sidebar-bottom"><div class="local-status"><i></i> 单机 · 本地自动保存</div>${btn(icon('settings') + '设置与存档', 'settings', '', 'nav-button')}<span class="version">POLYGON EDITION / MVP 0.1</span></div>
    </aside>
    <div class="workspace">
      <header class="topbar"><div class="breadcrumb">收藏所 <span>/</span> ${titles[route][0]}</div><div class="top-actions">${utilityButtons('icon-button')}<button class="balance" data-action="wallet" aria-label="查看完整游戏币余额" title="${money(state.balance)} 游戏币">${icon('coin')}<span><small>游戏币</small><strong id="balance">${compactMoney(state.balance)}</strong></span></button><span class="profile" aria-label="本地收藏家">R</span></div></header>
      <main><div class="page-heading"><div><div class="eyebrow">${route === 'open' ? 'DISCOVER SOMETHING EXTRAORDINARY' : 'YOUR PERSONAL COLLECTION'}</div><h1>${titles[route][0]}</h1><p>${titles[route][1]}</p></div><div class="edition-badge">${icon('spark')} 多边形世界</div></div>
      ${saveError ? `<div class="error-banner" role="alert"><span>${escapeHTML(saveError)}</span>${btn('重试保存', 'retry')}</div>` : ''}
      ${route === 'open' ? renderOpen() : route === 'gallery' ? renderGallery() : renderCollection()}
      <footer><span>Wonderseeker · 每一件收藏，都来自一次发现。</span><span><i></i> <span id="save-status">${saveError ? '保存已暂停' : busy ? '正在保存…' : '进度已保存在此浏览器'}</span> · ${btn('规则说明', 'rules', '', 'text-button')}</span></footer>
      </main>
    </div></div>`;
  if (focus && document.getElementById(focus)) {
    document.getElementById(focus).focus({ preventScroll: true });
    if (typeof selection === 'number') document.getElementById(focus).setSelectionRange?.(selection, selection);
  }
  updateOpenButton();
  if (modal === 'result') renderResult();
}
function audioIcon(name,on) {
  const art=icon(name);
  return on?art:art.replace('</svg>','<path d="M3 3 21 21" stroke="#152b55" stroke-width="4"/><path d="M3 3 21 21" stroke-width="2"/></svg>');
}
function musicButton(cls) {
  const on=state.settings.music!==false;
  return btn(audioIcon('music',on),'music',`aria-label="${on?'关闭':'开启'}背景音乐" aria-pressed="${on}" title="背景音乐：${on?'开':'关'}"`,cls);
}
function utilityButtons(cls) {
  const on=state.settings.sound;
  return btn(icon('settings'),'settings','aria-label="打开设置" title="设置与存档"',cls)+musicButton(cls)+btn(audioIcon('sound',on),'sound',`aria-label="${on?'关闭':'开启'}音效" aria-pressed="${on}" title="音效：${on?'开':'关'}"`,cls);
}
function renderEntrance() {
  return `<main class="home-scene entrance-scene" aria-label="进入游戏页面">
    <img class="home-background" src="./assets/home-ui/background-home-no-character.png" alt="" fetchpriority="high">
    <div class="home-utilities">${utilityButtons('home-utility')}</div>
    <div class="entrance-content"><div class="entrance-title">${renderCoverTitle()}<p>每一次寻宝，都有新的故事。</p></div>${renderCoverButton()}</div>
  </main>`;
}
function renderHome() {
  const asset = name => `./assets/home-ui/${name}.png`;
  const next = nextUnlock(), level = highest();
  const base = economy.progression.paid_tier_unlock_total_xp[Math.max(0, level - 1)];
  const target = next ? economy.progression.paid_tier_unlock_total_xp[next.tier - 1] : state.xp;
  const percent = next ? Math.max(0, Math.min(100, (state.xp - base) / (target - base) * 100)) : 100;
  const entries = [['inventory', 'warehouse', '仓库'], ['codex', 'encyclopedia', '图鉴'], ['gallery', 'gallery', '收藏馆']];
  return `<main class="home-scene" aria-label="寻宝基地主页">
    <img class="home-background" src="${asset('background-home-no-character')}" alt="" fetchpriority="high">
    <h1 class="sr-only">寻宝基地</h1>
    <section class="home-exp" aria-label="探索经验">
      <div class="home-exp-heading outlined-text"><strong>EXP</strong><span>探索等级 ${level}</span></div>
      <div class="home-exp-bar" role="progressbar" aria-label="下一档容器解锁进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percent)}" aria-valuetext="${next ? `${state.xp} / ${target} EXP` : `${state.xp} EXP，全部容器已解锁`}">
        <img src="${asset('panel-exp-frame-v1')}" alt="" draggable="false">
        <div class="home-exp-channel"><span style="width:${percent}%"></span></div>
        <strong class="home-exp-value outlined-text">${state.xp.toLocaleString()} / ${next ? target.toLocaleString() : 'MAX'}</strong>
      </div>
      <small class="home-exp-next outlined-text">${next ? `再获 ${(target - state.xp).toLocaleString()} EXP 解锁${tierNames[next.tier]}` : '全部容器已解锁'}</small>
    </section>
    <div class="home-utilities">${utilityButtons('home-utility')}</div>
    <button class="home-wallet" data-action="wallet" aria-label="查看完整游戏币余额" title="${money(state.balance)} 游戏币">
      <img class="home-wallet-plate" src="${asset('panel-currency')}" alt="">
      <img class="home-coin" src="${asset('icon-coin')}" alt="">
      <strong id="balance">${compactMoney(state.balance)}</strong>
    </button>
    <nav class="home-nav" aria-label="基地导航">${entries.map(([id, art, label]) => `<button class="home-nav-button" data-action="nav" data-route="${id}" aria-label="${label}"><img class="home-button-plate" src="${asset('button-sidebar-blue')}" alt=""><img class="home-nav-icon" src="${asset('icon-'+art)}" alt=""><span class="game-label">${label}</span></button>`).join('')}</nav>
    <button class="home-start" data-action="nav" data-route="open" aria-label="开始寻宝"><img class="home-start-plate" src="${asset('button-start-gold')}" alt=""><img class="home-compass" src="${asset('icon-compass')}" alt=""><img class="home-start-lettering" src="${asset('text-start-white-v1')}" alt="" draggable="false"></button>
    ${saveError ? `<div class="home-save-error error-banner" role="alert"><span>${escapeHTML(saveError)}</span>${btn('重试保存', 'retry')}</div>` : ''}
    <div class="home-save-status" role="status">${busy ? '正在保存…' : saveError ? '保存已暂停' : '进度已自动保存'}</div>
  </main>`;
}
function renderCarousel() {
  return `<main class="treasure-page" aria-label="容器选择"><button class="treasure-exit outlined-text" data-action="nav" data-route="home" aria-label="退出寻宝"><img src="./assets/ui/button-back-left-yellow-v1.png" alt="" draggable="false"></button><div class="treasure-wallet"><img src="./assets/home-ui/icon-coin.png" alt=""><strong class="outlined-text">${compactMoney(state.balance)}</strong></div><h1 id="container-name" class="container-name outlined-text">${tierNames[selected]}</h1><div class="container-carousel" aria-label="横向容器轮播" tabindex="0">${economy.boxes.map(b=>`<button class="carousel-container ${b.tier===selected?'centered':''}" data-action="choose-container" data-tier="${b.tier}" aria-label="${tierNames[b.tier]}" aria-pressed="${b.tier===selected}">${crateSVG(b.tier)}${!unlocked(economy,b.tier,state.xp)?'<img class="container-chains" src="./assets/ui/container-cross-chains-lock-v2.png" alt="未解锁">':''}</button>`).join('')}</div><div class="container-price ${state.containerUnlocks?.[selected]==='ready'||BigInt(state.balance)>=BigInt(economy.boxes[selected].price)?'affordable':'unaffordable'}" aria-label="开启价格"><img src="./assets/home-ui/icon-coin.png" alt="金币"><strong id="container-price-value" class="outlined-text">${(state.containerUnlocks?.[selected]==='ready'?'免费一次':money(economy.boxes[selected].price))}</strong></div></main>`;
}
function renderWarehouse(){
 const layout=packWarehouse(state,items);
 for(const key of warehouseSelection)if(!sellableInstance(state,key))warehouseSelection.delete(key);
 const selectedValue=[...warehouseSelection].reduce((n,key)=>n+BigInt(state.inventory[key.split('#')[0]].price),0n);
 return `<main class="warehouse-page ${warehouseSelling?'selling-mode':''}" aria-label="仓库"><button class="treasure-exit outlined-text" data-action="nav" data-route="home" aria-label="返回主页"><img src="./assets/ui/button-back-left-yellow-v1.png" alt="" draggable="false"></button><div class="treasure-wallet"><img src="./assets/home-ui/icon-coin.png" alt=""><strong class="outlined-text">${compactMoney(state.balance)}</strong></div><div class="warehouse-scroll"><div class="warehouse-grid" style="--rows:${layout.rows}" aria-label="20列${layout.rows}排仓库">${Array.from({length:20*layout.rows},(_,i)=>`<div class="warehouse-cell" style="grid-column:${i%20+1};grid-row:${Math.floor(i/20)+1}" aria-hidden="true"></div>`).join('')}${layout.placed.map(p=>`<button class="warehouse-item ${p.rotated?'item-rotated':''} ${warehouseSelection.has(p.key)?'sale-selected':''} ${warehouseSelling&&!sellableInstance(state,p.key)?'sale-protected':''}" data-action="${warehouseSelling?'toggle-sale-item':'detail'}" data-id="${p.id}" data-instance="${p.key}" data-grade="${items[p.id].grade}" style="--quality-color:${items[p.id].grade===1?'#aeb5bf':items[p.id].grade>=7?'#e8dbff':lootColors[items[p.id].grade-1]};--footprint-width:${p.width};--footprint-height:${p.height};grid-column:${p.x+1}/span ${p.width};grid-row:${p.y+1}/span ${p.height}" aria-label="${items[p.id].name}，1件，占${p.width*p.height}格">${itemSVG(items[p.id])}${warehouseSelling&&warehouseSelection.has(p.key)?'<span class="sale-check">✓</span>':''}</button>`).join('')}</div>${layout.overflow.length?`<div class="warehouse-overflow" aria-label="待整理物品">${layout.overflow.map(({id,key})=>`<button data-action="${warehouseSelling?'toggle-sale-item':'detail'}" data-instance="${key}" data-id="${id}" data-grade="${items[id].grade}" style="--quality-color:${items[id].grade===1?'#aeb5bf':items[id].grade>=7?'#e8dbff':lootColors[items[id].grade-1]}" class="${warehouseSelection.has(key)?'sale-selected':''}" aria-label="待整理：${items[id].name}">${itemSVG(items[id])}</button>`).join('')}</div>`:''}</div><div class="warehouse-sale-controls">${warehouseSelling?`<div class="sale-toolbar"><div class="sale-grade-field"><span id="sale-grade-label">品质</span><button id="sale-grade" class="sale-grade-trigger" data-action="toggle-sale-grade-menu" aria-haspopup="menu" aria-expanded="false" aria-controls="sale-grade-menu" aria-labelledby="sale-grade-label sale-grade-value"><span id="sale-grade-value">${saleGrade}级及以下</span><span class="sale-grade-arrow" aria-hidden="true">▾</span></button><div id="sale-grade-menu" class="sale-grade-menu" popover="auto" role="menu" aria-label="选择出售品质">${Array.from({length:7},(_,i)=>`<button class="sale-grade-option" role="menuitemradio" aria-checked="${saleGrade===i+1}" data-action="choose-sale-grade" data-grade="${i+1}"><span class="sale-grade-dot" style="--grade-color:${i===0?'#aeb5bf':i===6?'#e8dbff':lootColors[i]}" aria-hidden="true"></span><span>${i+1}级及以下</span><span class="sale-grade-check" aria-hidden="true">✓</span></button>`).join('')}</div></div>${btn('一键勾选','select-sale-grade')}${btn('取消','toggle-sale-mode')}<span>已选 ${warehouseSelection.size} 件 · ${money(selectedValue)} 金币</span>${btn('出售所选','confirm-sale-selection',warehouseSelection.size?'':'disabled','button primary')}</div>`:btn('一键整理','tidy-warehouse','','button primary')+btn('出售','toggle-sale-mode','','button primary')}${btn('自动出售','auto-sell-settings','','button secondary')}</div><span class="warehouse-unlimited outlined-text">容量不限 · 自动扩展</span></main>`;
}
function renderBookCodex(){
 const pages=Math.ceil(allItems.length/12);codexPage=Math.max(0,Math.min(pages-1,codexPage));
 const entries=allItems.slice(codexPage*12,codexPage*12+12);
 const slots=half=>entries.slice(half*6,half*6+6).map(item=>{const known=!!state.seen[item.id];return `<button class="codex-book-item ${known?'':'undiscovered'}" data-action="detail" data-id="${item.id}" aria-label="${known?item.name:'未发现物品'}" ${known?'':'disabled'}>${itemSVG(item,!known)}<span>${known?item.name:'???'}</span></button>`;}).join('');
 return `<main class="codex-book-page" aria-label="图鉴"><button class="treasure-exit outlined-text" data-action="nav" data-route="home" aria-label="返回主页"><img src="./assets/ui/button-back-left-yellow-v1.png" alt="" draggable="false"></button><div class="treasure-wallet"><img src="./assets/home-ui/icon-coin.png" alt=""><strong class="outlined-text">${compactMoney(state.balance)}</strong></div><section class="codex-book" aria-label="展开的图鉴"><img class="codex-book-carrier" src="./assets/codex/book-open-blank.png" alt=""><div class="codex-paper left-paper"><h1>${codexPage===11?'特别收藏':'收藏图鉴'}</h1><div class="codex-paper-items">${slots(0)}</div></div><div class="codex-paper right-paper"><p class="codex-discovered">已发现 ${discovered()} / ${allItems.length}</p><div class="codex-paper-items">${slots(1)}</div></div></section><nav class="codex-pagination" aria-label="图鉴翻页"><button class="outlined-text" data-action="codex-page" data-step="-1" aria-label="上一页" ${codexPage===0?'disabled':''}>‹</button><span class="outlined-text">${codexPage+1} / ${pages}</span><button class="outlined-text" data-action="codex-page" data-step="1" aria-label="下一页" ${codexPage===pages-1?'disabled':''}>›</button></nav></main>`;
}
function setupWarehouseDrag(){
 const grid=$('.warehouse-grid'),scroll=$('.warehouse-scroll');let drag=null,suppressClick=false,frame=0;
 const preview=document.createElement('div');preview.className='warehouse-drop-preview';preview.hidden=true;grid.append(preview);
 const update=()=>{
  if(!drag?.moved)return;
  const rect=grid.getBoundingClientRect(),cell=rect.width/20;
  drag.target=warehouseDropTarget(drag.layout,drag.position.key,(drag.clientX-rect.left)/cell,(drag.clientY-rect.top)/cell,drag.rotated,!drag.manual);
  const t=drag.target;preview.hidden=false;preview.classList.toggle('invalid',!t.valid);
  Object.assign(preview.style,{left:`${t.x*cell}px`,top:`${t.y*cell}px`,width:`${t.width*cell}px`,height:`${t.height*cell}px`});
  Object.assign(drag.ghost.style,{left:`${drag.clientX-t.width*cell/2}px`,top:`${drag.clientY-t.height*cell/2}px`,width:`${t.width*cell}px`,height:`${t.height*cell}px`});
  drag.ghost.style.setProperty('--cell',`${cell}px`);
  drag.ghost.style.setProperty('--footprint-width',t.width);
  drag.ghost.style.setProperty('--footprint-height',t.height);
  drag.ghost.classList.toggle('item-rotated',t.rotated);
 };
 const autoScroll=()=>{
  if(!drag?.moved)return;
  const r=scroll.getBoundingClientRect(),edge=42,speed=12;
  const dx=drag.clientX<r.left+edge?-speed:drag.clientX>r.right-edge?speed:0,dy=drag.clientY<r.top+edge?-speed:drag.clientY>r.bottom-edge?speed:0;
  if(dx||dy){scroll.scrollBy(dx,dy);update();}frame=requestAnimationFrame(autoScroll);
 };
 grid.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;}},true);
 grid.addEventListener('pointerdown',event=>{
  const button=event.target.closest('.warehouse-item');if(!button||busy||event.button!==0)return;
  const position=packWarehouse(state,items).placed.find(p=>p.key===button.dataset.instance);
  drag={button,position,layout:packWarehouse(state,items),startX:event.clientX,startY:event.clientY,clientX:event.clientX,clientY:event.clientY,moved:false,rotated:!!position.rotated,manual:false};button.focus({preventScroll:true});button.setPointerCapture(event.pointerId);
 });
 grid.addEventListener('pointermove',event=>{
  if(!drag)return;const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
  if(!drag.moved&&Math.hypot(dx,dy)<7)return;
  drag.clientX=event.clientX;drag.clientY=event.clientY;
  if(!drag.moved){drag.moved=true;playWarehouseSound(warehouseDragSound);drag.button.classList.add('drag-source');drag.ghost=document.createElement('div');drag.ghost.className='warehouse-drag-ghost';drag.ghost.dataset.grade=drag.button.dataset.grade;drag.ghost.innerHTML=drag.button.innerHTML;document.body.append(drag.ghost);frame=requestAnimationFrame(autoScroll);}
  update();
 });
 const stop=async(event,cancel=false)=>{
  if(!drag)return;if(event?.clientX!==undefined){drag.clientX=event.clientX;drag.clientY=event.clientY;}update();const current=drag;drag=null;cancelAnimationFrame(frame);current.button.classList.remove('drag-source');current.ghost?.remove();preview.hidden=true;
  if(!current.moved)return;suppressClick=true;
  if(cancel){setTimeout(()=>{suppressClick=false;},0);return;}
  playWarehouseSound(warehouseDropSound);
  const t=current.target;if(!t?.valid){toast('这个位置无法放置');return;}
  await mutate(s=>moveWarehouseItem(s,items,current.position.key,t.x,t.y,t.rotated));
 };
 grid.addEventListener('pointerup',event=>stop(event));grid.addEventListener('pointercancel',event=>stop(event,true));
 grid.addEventListener('keydown',async event=>{
  if(drag&&event.key==='Escape'){event.preventDefault();stop(null,true);return;}
  if(drag?.moved&&event.key.toLowerCase()==='r'){event.preventDefault();drag.rotated=!drag.target.rotated;drag.manual=true;update();return;}
  const button=event.target.closest('.warehouse-item');if(!button||!event.altKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
  event.preventDefault();const p=packWarehouse(state,items).placed.find(p=>p.key===button.dataset.instance);
  if(await mutate(s=>moveWarehouseItem(s,items,p.key,p.x+(event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0),p.y+(event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0)))){playHomeClick();$(`.warehouse-item[data-instance="${p.key}"]`)?.focus();}
 });
 scroll.addEventListener('scroll',update,{passive:true});
}
function setupCarousel() {
  const rail = $('.container-carousel');
  const cards = [...rail.children];
  const center = tier => { const card=cards[tier]; rail.scrollTo({left:card.offsetLeft-(rail.clientWidth-card.offsetWidth)/2,behavior:'instant'}); };
  requestAnimationFrame(()=>center(selected));
  rail.addEventListener('scroll',()=>{
    const midpoint=rail.scrollLeft+rail.clientWidth/2;
    const previous=selected;
    selected=cards.reduce((best,card,i)=>Math.abs(card.offsetLeft+card.offsetWidth/2-midpoint)<Math.abs(cards[best].offsetLeft+cards[best].offsetWidth/2-midpoint)?i:best,0);
    if(selected!==previous)playCarouselClick();
    $('#container-name').textContent=tierNames[selected];
    $('#container-price-value').textContent=(state.containerUnlocks?.[selected]==='ready'?'免费一次':money(economy.boxes[selected].price));
    const price=$('.container-price'),affordable=state.containerUnlocks?.[selected]==='ready'||BigInt(state.balance)>=BigInt(economy.boxes[selected].price);
    price.classList.toggle('affordable',affordable);price.classList.toggle('unaffordable',!affordable);
    cards.forEach((card,i)=>{card.classList.toggle('centered',i===selected);card.setAttribute('aria-pressed',String(i===selected));});
  },{passive:true});
  rail.addEventListener('wheel',event=>{if(Math.abs(event.deltaY)>Math.abs(event.deltaX)){event.preventDefault();rail.scrollBy({left:event.deltaY,behavior:'smooth'});}},{passive:false});
  rail.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();const tier=Math.max(0,Math.min(6,selected+(event.key==='ArrowRight'?1:-1)));const card=cards[tier];rail.scrollTo({left:card.offsetLeft-(rail.clientWidth-card.offsetWidth)/2,behavior:'smooth'});}});
}
function renderContainerPage() {
  const pending=state.pending;
  if(pending) {
    const skip='';
    const remainingBadge=(index)=>{
      const remaining=pending.drops.length-index-1;
      const rare=pending.drops.slice(index+1).some(drop=>items[drop.id]?.grade>=6);
      return remaining>0?`<span class="reveal-remaining${rare?' has-rare-remaining':''}" role="status" aria-label="剩余 ${remaining} 件">${remaining}</span>`:'';
    };
    if(exWaiting){
      const grade=items[pending.drops[rewardIndex].id].grade;
      return `<main class="treasure-page divine-reveal" data-divine-grade="${grade}" data-action="advance-special" role="button" tabindex="0" aria-label="点击继续${grade===8?'EX':'7级'}揭示，第 ${specialStep} 步"></main>`;
    }
    if(Date.now()<revealAt){const openingColor='#e8eaed';return `<main class="treasure-page revealing" style="--opening-color:${openingColor}" aria-label="正在揭晓"><div class="reveal-flash"></div>${skip}${remainingBadge(0)}</main>`;}
    const single=rewardIndex>=0,drops=single?[pending.drops[rewardIndex]]:pending.drops;
    const revealGrade=single?items[drops[0].id].grade:0;
    const revealColor=revealGrade===1?'#aeb5bf':lootColors[revealGrade-1];
    return `<main class="treasure-page reward-page ${single?'single-reveal':''} ${single&&revealGrade<=6?'grade-color-reveal':''} ${single&&grade7Finale?'divine-reveal divine-final':''} ${single&&grade7Finale&&items[drops[0].id].grade===8?'ex-reward-finale':''}" ${single&&grade7Finale?`data-divine-grade="${revealGrade}"`: ''} data-reveal-index="${single?rewardIndex:'all'}" ${single&&revealGrade<=6?`style="--reveal-background:${revealColor}"`: ''} data-action="dismiss-rewards" tabindex="0" role="button" aria-label="${single?'点击继续揭晓下一件':'点击任意位置保留物品并继续'}"><div class="treasure-rewards">${drops.map((d,i)=>`<div class="treasure-item ${single?'':'overview-item'}" data-grade="${items[d.id].grade}" style="--loot-color:${lootColors[items[d.id].grade-1]};--overview-delay:${i*90}ms" aria-label="${items[d.id].name}">${lootArt(items[d.id])}</div>`).join('')}</div>${single?`<span class="reveal-item-name">${escapeHTML(items[drops[0].id].name)}</span>`:''}${single?skip:''}${single?remainingBadge(rewardIndex):`<div class="settlement-total" role="status" aria-label="本次掉落价值总计"><span>价值总计</span><strong>${money(drops.reduce((sum,d)=>sum+BigInt(d.price),0n))} <small>金币</small></strong></div>`}</main>`;
  }
  return `<main class="treasure-page" aria-label="开启${tierNames[selected]}"><button class="treasure-exit outlined-text" data-action="nav" data-route="open" aria-label="返回宝箱选择"><img src="./assets/ui/button-back-left-yellow-v1.png" alt="" draggable="false"></button><button class="bouncing-container" data-container-grade="${selected+1}" style="--container-glow:${lootColors[selected]};--container-mask:url('./assets/containers/container-${selected}-v2.png')" data-action="open-container" aria-label="开启${tierNames[selected]}${state.containerUnlocks?.[selected]==='ready'?'，免费一次':''}" ${busy?'disabled':''}><span class="container-wait-glow glow-far" aria-hidden="true"><span></span></span><span class="container-wait-glow glow-near" aria-hidden="true"><span></span></span>${crateSVG(selected)}</button></main>`;
}
function renderOpen() {
  const box = economy.boxes[selected], n = nextUnlock(), phase = newbie(), allowed = unlocked(economy, selected, state.xp);
  const range = economy.ordinary.grade_weights[selected].map((w, i) => w > 0 ? i + 1 : null).filter(Boolean);
  const opened = state.stats.opens.reduce((a,b) => a+b, 0);
  const latest = Object.keys(state.seen).sort((a,b) => state.seen[b].firstAt - state.seen[a].firstAt).slice(0,3);
  const progressBase = economy.progression.paid_tier_unlock_total_xp[Math.max(0, highest() - 1)];
  const target = n ? economy.progression.paid_tier_unlock_total_xp[n.tier - 1] : state.xp;
  const percent = n ? Math.max(0, Math.min(100, (state.xp - progressBase) / (target - progressBase) * 100)) : 100;
  return `<div class="desk-layout"><section class="workbench" aria-label="开箱区域">
    <div class="bench-top"><span class="status-tag">${allowed ? '<i></i> 可探索' : icon('lock') + '待解锁'}</span><span class="mono">CONTAINER / ${String(selected).padStart(2, '0')}</span></div>
    <div class="box-stage" style="--accent:${colors[Math.max(0, selected - 1)]}"><div class="stage-orbit orbit-one"></div><div class="stage-orbit orbit-two"></div><div class="stage-grid"></div><span class="stage-coordinate">Wonderseeker FIELD ARCHIVE<br>SECTOR ${String(selected).padStart(2, '0')} / SEALED</span>${crateSVG(selected, true)}<span class="stage-number">${String(selected).padStart(2, '0')}</span><div class="stage-floor"></div></div>
    <div class="box-description"><div class="eyebrow">${selected === 0 ? 'FREE EXPLORATION' : `TIER ${selected} COLLECTION`}</div><h2>${tierNames[selected]}</h2><p>${tierSubtitles[selected]}</p></div>
    <div class="box-facts"><span><small>固定掉落</small><strong>${box.item_count} 件物品</strong></span><span><small>普通等级</small><strong>${range[0]} — ${range.at(-1)} 级</strong></span><span><small>单件 EX 概率</small><strong>${(box.ex_numerator_per_million / 10000).toFixed(4)}%</strong></span>${btn('查看概率 ↗', 'probability', '', 'text-button')}</div>
    <div class="open-control"><span class="open-price"><small>本次开启费用</small><strong>${icon('coin')}${box.price ? money(box.price) : '免费'}</strong></span><button id="open-button" class="button primary" data-action="open"><span>开启箱子</span>${icon('arrow')}</button></div>
    ${!state.tutorialDone ? '<div class="intro-note">从一档箱开始：开出物品后，可以保留收藏，也可以出售换取游戏币。</div>' : ''}
    </section>
    <aside class="desk-rail"><section class="panel growth-panel"><div class="section-label">${icon('spark')} 收藏家成长</div><div class="level-line"><span class="level-emblem">${highest()}</span><div><small>探索等级</small><h3>${highest() === 6 ? '远古探索者' : '初阶收藏家'}</h3></div></div><div class="xp-label"><span>${n ? `距离 ${n.tier} 级箱` : '全部箱子已解锁'}</span><strong>${state.xp.toLocaleString()} <small>/ ${n ? target.toLocaleString() : 'MAX'} XP</small></strong></div><div class="progress-track"><span style="width:${percent}%"></span></div><p>${n ? `解锁奖励 ${money(economy.progression.one_time_unlock_grants[n.tier - 1])} 游戏币` : '继续探索，寻找尚未发现的珍藏。'}</p><div class="newbie-note"><span class="tag">${phase.left ? '新手福利' : '标准阶段'}</span><strong>${phase.label}</strong><small>${phase.left ? `本阶段剩余 ${phase.left} 次付费开箱` : '新手阶段已完成，使用标准概率'}</small></div></section>
    <section class="panel collection-progress"><div class="section-label">${icon('book')} 收藏进度 ${btn('查看', 'nav', 'data-route="codex"', 'text-button')}</div><div class="collection-total">${discovered()}<span>/ ${allItems.length}</span></div><div class="progress-track"><span style="width:${discovered()/allItems.length*100}%"></span></div><div class="mini-stats"><span><small>累计开箱</small><strong>${opened.toLocaleString()} 次</strong></span><span><small>EX 发现</small><strong>${Object.keys(state.seen).filter(id=>items[id].grade===8).length} / ${allItems.filter(item=>item.grade===8).length}</strong></span></div></section>
    <section class="panel latest-panel"><div class="section-label">最近发现</div>${latest.length ? latest.map(id=>`<button class="recent-item" data-action="detail" data-id="${id}"><span class="recent-art" data-grade="${items[id].grade}" style="--grade-color:${colors[items[id].grade-1]}">${itemSVG(items[id])}</span><span><strong>${items[id].name}</strong><small>${gradeNames[items[id].grade - 1]}</small></span><span class="tiny-arrow">↗</span></button>`).join('') : '<div class="small-empty">未知的收藏，正在等你发现。<br>开启第一个箱子，留下旅途的起点。</div>'}</section></aside></div>
    <section class="box-selector"><div class="section-heading"><h2>选择你的下一次探索</h2><span>7 种箱子 · 无钥匙 · 单次开启</span></div><div class="box-list">${economy.boxes.map(b=>{ const open = unlocked(economy,b.tier,state.xp); return `<button data-action="select-box" data-tier="${b.tier}" class="box-option ${selected===b.tier?'selected':''} ${open?'':'locked'}" aria-pressed="${selected===b.tier}">${!open?`<span class="lock-mark">${icon('lock')}</span>`:''}${crateSVG(b.tier)}<strong>${tierNames[b.tier]}</strong><small>${open ? b.price ? money(b.price) : '免费探索' : `${economy.progression.paid_tier_unlock_total_xp[b.tier-1].toLocaleString()} XP 解锁`}</small><span class="box-tier">${b.tier ? `T${b.tier}` : 'FREE'}</span></button>`; }).join('')}</div></section>`;
}
function filteredItems() {
  return allItems.filter(item => (route === 'codex' || state.inventory[item.id]) && (gradeFilter === 'all' || String(item.grade) === gradeFilter) && (!query || (state.seen[item.id] && item.name.includes(query)) || item.id.includes(query)))
    .sort((a,b) => sort === 'value' ? (BigInt(a.price) > BigInt(b.price) ? -1 : BigInt(a.price) < BigInt(b.price) ? 1 : a.id.localeCompare(b.id)) : a.grade - b.grade || a.id.localeCompare(b.id));
}
function renderCollection() {
  const list = filteredItems(), inv = route === 'inventory';
  const count = Object.values(state.inventory).reduce((n,e)=>n+e.qty,0);
  return `<div class="collection-summary"><span>${inv ? '当前持有' : '已发现'} <strong>${inv ? count.toLocaleString()+' 件' : discovered()+' / '+allItems.length}</strong></span><span>${inv ? '不同收藏' : '完成度'} <strong>${inv ? Object.keys(state.inventory).length+' 种' : (discovered()/allItems.length*100).toFixed(1)+'%'}</strong></span>${inv ? btn('出售未锁定物品', 'bulk-sell', '', 'button secondary') : '<span class="summary-note">首次掉落即记录 · 出售后仍保留发现</span>'}</div>
    <div class="collection-toolbar"><div class="grade-tabs" role="group" aria-label="物品等级">${['all',1,2,3,4,5,6,7,8].map(g=>`<button style="--grade-color:${g==='all'?colors[0]:colors[Number(g)-1]}" data-grade="${g}" class="filter-button ${String(g)===gradeFilter?'active':''}" data-action="filter">${g==='all'?'全部':g===8?'EX':g+'级'}${!inv && g !== 'all' ? `<small>${allItems.filter(i=>i.grade===g&&state.seen[i.id]).length}/${g===8?3:20}</small>`:''}</button>`).join('')}</div><div class="filter-controls"><input id="search" type="search" placeholder="搜索名称或编号" aria-label="搜索物品" value="${escapeHTML(query)}"><select id="sort" aria-label="物品排序"><option value="grade" ${sort==='grade'?'selected':''}>按等级排序</option><option value="value" ${sort==='value'?'selected':''}>价值从高到低</option></select></div></div>
    ${list.length ? `<div class="item-grid">${list.map(item=>{const known=!!state.seen[item.id], entry=state.inventory[item.id]; return `<button data-grade="${item.grade}" class="item-card ${known?'':'unknown'}" data-action="detail" data-id="${item.id}" ${known?'':'disabled'} style="--grade-color:${colors[item.grade-1]}"><div class="item-card-top"><span class="grade-tag">${item.grade===8?'EX':`LEVEL ${item.grade}`}</span><span>${entry?.locked ? icon('lock') : ''}${exhibited(state,item.id) ? icon('gallery') : ''}</span></div><div class="item-art">${itemSVG(item,!known)}</div><h3>${known?item.name:'未发现的收藏'}</h3><p>${known?money(entry?.price || item.price)+' 游戏币':`档案 ${item.id.toUpperCase()}`}</p><div class="item-card-bottom"><span>${known?gradeNames[item.grade-1]:'等待探索'}</span><strong>${entry?'× '+entry.qty:known?'已发现':'?'}</strong></div></button>`;}).join('')}</div>` : `<div class="empty-state">${icon(inv?'bag':'book')}<h2>${query || gradeFilter !== 'all' ? '没有符合条件的物品' : '你的仓库，等待第一件收藏'}</h2><p>${query || gradeFilter !== 'all' ? '试试其他等级或搜索名称。' : '开启一个箱子，选择保留喜欢的物品，它就会来到这里。'}</p>${btn('前往开箱', 'nav', 'data-route="open"', 'button primary')}</div>`}`;
}
function renderGallery() {
 return `<main class="gallery-only-page" aria-label="收藏馆"><button class="treasure-exit outlined-text" data-action="nav" data-route="home" aria-label="退出收藏馆"><img src="./assets/ui/button-back-left-yellow-v1.png" alt="" draggable="false"></button><section class="gallery-room gallery-only-room" aria-label="收藏展台"><div class="display-grid">${state.display.map((id,index)=>`<div class="display-slot ${id?'filled':''}" data-grade="${id?items[id].grade:0}" style="--grade-color:${id?colors[items[id].grade-1]:colors[0]};--loot-color:${id?lootColors[items[id].grade-1]:'transparent'}"><button class="display-art" data-action="choose-display" data-slot="${index}" aria-label="${id?'替换 '+items[id].name:'为第 '+(index+1)+' 个展位选择物品'}"><img class="magic-display-platform" src="./assets/gallery/magic-display-platform.png" alt="">${id?lootArt(items[id]):''}</button></div>`).join('')}</div></section></main>`;
}
function updateOpenButton() {
  const button = $('#open-button'); if (!button || !state) return;
  const waiting = 0;
  const reason = saveError ? '保存暂停' : busy ? '正在保存…' : state.pending ? '继续处理结果' : !unlocked(economy,selected,state.xp) ? `${economy.progression.paid_tier_unlock_total_xp[selected-1]} XP 解锁` : BigInt(state.balance) < BigInt(economy.boxes[selected].price) ? '游戏币不足' : waiting ? `准备中 ${waiting}s` : '开启箱子';
  button.disabled = !!saveError || busy || (!state.pending && (!unlocked(economy,selected,state.xp) || BigInt(state.balance) < BigInt(economy.boxes[selected].price) || waiting > 0));
  button.innerHTML = `<span>${reason}</span>${icon(state.pending?'arrow':'box')}`;
}
async function mutate(fn, { allowRetry = false } = {}) {
  if (busy) return false;
  if (saveError && !allowRetry) { toast('请先恢复保存，再继续操作'); return false; }
  busy = true; updateOpenButton(); document.body.classList.add('saving');
  try {
    const next = fn(state); next.revision = state.revision + 1; next.updatedAt = Date.now();
    validate(next,economy,items);
    try { await write(db,next); } catch(error) { saveError = error.message; throw error; }
    state = next; saveError = ''; render(); return true;
  } catch (error) { toast(error.message); render(); return false; }
  finally { busy = false; document.body.classList.remove('saving'); const containerButton=$('[data-action="open-container"]');if(containerButton)containerButton.disabled=false; updateOpenButton(); if($('#save-status'))$('#save-status').textContent=saveError?'保存已暂停':'进度已保存在此浏览器'; }
}
let detailAnchor = null, detailSource = null;
function closeModal() { modalRoot.querySelector('dialog')?.close(); modalRoot.innerHTML=''; modal=null; syncMusic(); }
function positionDetails() {
  const dialog=modalRoot.querySelector('.detail-paper'); if(!dialog || !detailAnchor)return;
  if(detailSource){
    const source=Array.from(app.querySelectorAll('[data-action="detail"],[data-action="choose-display"]')).find(el=>detailSource.slot!==undefined?el.dataset.slot===detailSource.slot:detailSource.instance?el.dataset.instance===detailSource.instance:el.dataset.id===detailSource.id);
    if(source)detailAnchor=source.getBoundingClientRect();
  }
  const margin=12, gap=14, width=dialog.offsetWidth, height=dialog.offsetHeight;
  const right=detailAnchor.right+gap, left=detailAnchor.left-gap-width;
  const x=right+width<=innerWidth-margin?right:left>=margin?left:Math.max(margin,Math.min(innerWidth-width-margin,detailAnchor.left));
  const y=Math.max(margin,Math.min(innerHeight-height-margin,detailAnchor.top+(detailAnchor.height-height)/2));
  dialog.style.left=`${x}px`; dialog.style.top=`${y}px`;
}
window.addEventListener('resize',positionDetails);
document.addEventListener('scroll',event=>{if((modal==='detail'||modal==='picker')&&!event.target.closest?.('.detail-paper,.gallery-drawer'))closeModal();},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&(modal==='detail'||modal==='picker')){event.preventDefault();closeModal();}});
document.addEventListener('click',event=>{
  if((modal==='detail'||modal==='picker')&&!event.target.closest('.detail-paper,.gallery-drawer,[data-action="detail"],[data-action="choose-display"]'))closeModal();
},true);
function showDialog(title, body, { wide=false, type='generic', canClose=true }={}) {
  const wasOpen = !!modalRoot.querySelector('dialog')?.open;
  const focusKey = document.activeElement?.dataset.key;
  modalRoot.innerHTML = `<dialog class="dialog ${wide?'wide':''}"><div class="dialog-heading"><div><div class="eyebrow">Wonderseeker / FIELD ARCHIVE</div><h2>${title}</h2></div>${canClose?btn('<img src="./assets/ui/button-close-gold-v1.png" alt="" draggable="false">','close-modal','aria-label="关闭浮窗" title="关闭"','dialog-close'):''}</div>${body}</dialog>`;
  modal=type; syncMusic(); const dialog=modalRoot.querySelector('dialog');
  if(type==='wallet'){
    dialog.classList.add('wallet-page');
    dialog.setAttribute('aria-label','我的金币');
    dialog.querySelector('.eyebrow').remove();
    dialog.showModal();
  }else if(type==='picker'){
    dialog.classList.add('gallery-drawer');
    dialog.querySelector('.eyebrow').remove();
    dialog.show();
    const rail=dialog.querySelector('.display-picker');
    rail?.addEventListener('wheel',event=>{if(rail.scrollWidth>rail.clientWidth&&Math.abs(event.deltaY)>Math.abs(event.deltaX)){event.preventDefault();rail.scrollLeft+=event.deltaY;}},{passive:false});
  }else if(type==='detail'){
    dialog.classList.add('detail-paper');
    dialog.querySelector('.eyebrow').remove();
    dialog.show(); positionDetails();
  }else if(type==='sale-confirm'||type==='auto-sell'){
    dialog.classList.add('sale-confirm-page');
    if(type==='auto-sell')dialog.classList.add('auto-sell-page');
    dialog.querySelector('.eyebrow').remove();
    dialog.setAttribute('aria-label',title);
    dialog.showModal();
  }else dialog.showModal();
  dialog.addEventListener('cancel',event=>{if(!canClose) event.preventDefault(); else {event.preventDefault(); closeModal();}});
  if(canClose) dialog.addEventListener('click',event=>{if(event.target===dialog) {const rect=dialog.getBoundingClientRect(); if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeModal();}});
  if(wasOpen && focusKey) modalRoot.querySelector(`[data-key="${focusKey}"]`)?.focus();
}
function renderResult() {
  if (!state.pending) { if(modal==='result')closeModal(); return; }
  const p=state.pending, revealing=Date.now()<revealAt, left=p.drops.filter(d=>!d.status).length;
  const total=p.drops.reduce((n,d)=>n+BigInt(d.price),0n), sold=p.drops.filter(d=>d.status==='sell').reduce((n,d)=>n+BigInt(d.price),0n), kept=p.drops.filter(d=>d.status==='keep').length;
  const body=revealing ? `<div class="opening-animation">${crateSVG(p.tier,true)}<h3>正在开启 ${tierNames[p.tier]}…</h3><p>未知的收藏，即将揭晓</p></div>` : `
    <div class="result-subheading"><span>${tierNames[p.tier]} · ${p.drops.length} 件掉落</span><span>${p.drops.filter(d=>d.isNew).length} 件首次发现</span></div>
    ${p.rewards.length?`<div class="reward-banner">${icon('spark')}${p.rewards.map(r=>`${r.tier} 级箱已解锁 · 奖励 ${money(r.reward)} 游戏币`).join('<br>')}</div>`:''}
    <div class="result-items">${p.drops.map(d=>{const item=items[d.id]; return `<article data-grade="${item.grade}" class="result-card ${d.status?'processed':''}" style="--grade-color:${colors[item.grade-1]}"><div class="result-art">${itemSVG(item)}</div><div class="result-info"><span class="grade-tag">${item.grade===8?'EX':item.grade+'级'} ${d.isNew?'<b>首次发现</b>':'· 重复收藏'}</span><h3>${item.name}</h3><p>${money(d.price)} 游戏币</p></div><div class="result-choices">${d.status?`<span class="processed-label">${icon('check')}${d.status==='keep'?'已保留':'已出售'}</span>`:btn('保留','settle-one',`data-key="${d.key}" data-choice="keep"`,'button small secondary')+btn('出售','settle-one',`data-key="${d.key}" data-choice="sell"`,'button small ghost')}</div></article>`;}).join('')}</div>
    <div class="result-account"><span><small>开箱成本</small><strong>${money(p.cost)}</strong></span><span><small>掉落总估值</small><strong>${money(total)}</strong></span><span><small>出售已到账</small><strong class="mint">${money(sold)}</strong></span><span><small>已保留</small><strong>${kept} 件</strong></span></div>
    <div class="result-footer">${left?`<span>${left} 件待处理</span><div>${btn('全部保留','settle-all','data-mode="keep"')}${btn('留新卖重复','settle-all','data-mode="new"')}${btn('全部出售','settle-all','data-mode="sell"','button primary')}</div>`:`<span>${icon('check')} 本次结果已保存</span>${btn('完成，继续探索','finish','','button primary')}`}</div><p class="dialog-note">估值包含保留物品；仅出售金额会计入余额。结果已固定保存，关闭网页后可继续处理。</p>`;
  showDialog(revealing?'开启封存箱':'你的探索发现',body,{wide:true,type:'result',canClose:false});
}
function showDetails(id, anchor) {
  if(anchor){detailAnchor=anchor.getBoundingClientRect();detailSource={id:anchor.dataset.id,instance:anchor.dataset.instance};}
  const item=items[id], entry=state.inventory[id]; if(!state.seen[id])return;
  const available=entry?entry.qty-exhibited(state,id):0;
  showDialog(item.name,`<div class="detail-body" data-grade="${item.grade}" style="--grade-color:${colors[item.grade-1]}"><div class="detail-art">${itemSVG(item)}</div><span class="grade-tag" style="color:${colors[item.grade-1]}">${gradeNames[item.grade-1]} · ${item.grade===8?'EX':item.grade+' 级'}</span><p>${item.description}</p><dl><div><dt>单件价值</dt><dd class="detail-price"><span>${money(entry?.price||item.price)}</span><img src="./assets/home-ui/icon-coin.png" alt="金币" width="24" height="24" draggable="false"></dd></div><div><dt>累计发现</dt><dd>${state.seen[id].count} 件</dd></div><div><dt>当前持有</dt><dd>${entry?.qty||0} 件 · 展出 ${exhibited(state,id)} 件</dd></div></dl>${route==='codex'?'':entry?`<div class="detail-controls">${btn(entry.locked?'解除锁定':'锁定物品','toggle-lock',`data-id="${id}"`)}<label>出售数量 <input id="sale-qty" type="number" min="1" max="${available}" value="${available?1:0}" ${!available||entry.locked?'disabled':''}></label>${btn('出售','sell-item',`data-id="${id}" ${!available||entry.locked?'disabled':''}`,'button primary')}</div>`:'<div class="dialog-note">你曾发现这件物品，目前没有持有实物。</div>'}</div>`,{type:'detail'});
}
function saleConfirmationBody(count,total,{ex=false,name='',action='execute-sale-selection',attributes='',cancelAction='close-modal',cancelAttributes=''}={}) {
  return `<div class="sale-confirm-content"><p class="sale-confirm-count">${name?escapeHTML(name)+' · ':''}出售 <strong>${count}</strong> 件物品</p><div class="sale-confirm-value"><img src="./assets/home-ui/icon-coin.png" alt=""><span>预计到账</span><strong>${money(total)}</strong><span class="sale-confirm-unit">金币</span></div>${ex?'<p class="sale-confirm-warning">包含 EX 稀有收藏，请确认后出售</p>':''}<div class="sale-confirm-actions">${btn('取消',cancelAction,cancelAttributes,'button')}${btn('确认出售',action,attributes,'button primary')}</div></div>`;
}
function showSettings() {
  closeModal();route='settings';render();window.scrollTo({top:0,behavior:'auto'});
}
function renderSettingsPage() {
  return `<main class="settings-page" aria-label="设置与存档"><header class="settings-page-header">${btn('<img src="./assets/ui/button-back-left-yellow-v1.png" alt="" draggable="false">','nav',`data-route="home" aria-label="${enteredGame?'返回主页':'返回封面'}"`,'button settings-return arrow-back')}<h1>设置与存档</h1></header><div class="settings-body"><div class="setting-row"><span><strong>屏幕显示</strong><small>横屏游玩可使用浏览器全屏</small></span><button type="button" class="button secondary" data-display-fullscreen>${document.fullscreenElement||document.webkitFullscreenElement?'退出全屏':'全屏游玩'}</button></div><label class="setting-row"><span><strong>背景音乐</strong><small>轻柔的《星光小憩》与欢快管乐版《晴光漫游》</small></span><input type="checkbox" data-setting="music" ${state.settings.music!==false?'checked':''}></label><label class="setting-row music-mode-row"><span><strong>播放方式</strong><small>选择单曲循环，或按顺序轮换两首音乐；自动保存并立即生效</small></span><select class="music-mode-select" data-setting="musicMode" aria-label="背景音乐播放方式">${[['rotate','两首轮换'],['starlight','星光小憩 · 轻柔'],['sunshine','晴光漫游 · 欢快管乐']].map(([value,label])=>`<option value="${value}" ${(state.settings.musicMode??'rotate')===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="setting-row"><span><strong>游戏音效</strong><small>开启、掉落和出售的简短反馈</small></span><input type="checkbox" data-setting="sound" ${state.settings.sound?'checked':''}></label><label class="setting-row"><span><strong>减少动画</strong><small>快速展示掉落，仍遵守最低开启间隔</small></span><input type="checkbox" data-setting="reducedMotion" ${state.settings.reducedMotion?'checked':''}></label><label class="setting-row"><span><strong>调试模式</strong><small>展开高爆率、金币和 EXP 调试选项</small></span><input type="checkbox" data-setting="debugMode" ${state.settings.debugMode?'checked':''}></label>${state.settings.debugMode?`<section class="debug-options" aria-label="隐藏调试选项"><label class="setting-row"><span><strong>高爆率模式</strong><small>每箱必出 EX 和 7 级各一件；免费下水道改为掉落两件。关闭调试模式后不生效</small></span><input type="checkbox" data-setting="debugHighDrop" ${state.settings.debugHighDrop?'checked':''}></label><div class="debug-value-row"><label for="debug-balance">设置金币数</label><div><input id="debug-balance" type="text" inputmode="numeric" maxlength="80" value="${state.balance}" aria-label="调试金币数">${btn('应用金币','set-debug-value','data-field="balance"','button secondary')}</div></div><div class="debug-value-row"><label for="debug-xp">设置 EXP</label><div><input id="debug-xp" type="text" inputmode="numeric" maxlength="16" value="${state.xp}" aria-label="调试 EXP">${btn('应用 EXP','set-debug-value','data-field="xp"','button secondary')}</div><small>设置为指定总量；达到新门槛后，返回首页或容器选择页播放解锁动画。已领取奖励不会重复发放。</small></div></section>`:''}<div class="settings-section"><h3>本地存档</h3><p>进度保存在当前浏览器的网站数据中。清除网站数据或换设备后不会自动恢复，请定期导出备份。</p><div class="settings-buttons">${btn('导出存档','export','','button primary')}<label class="button secondary file-button">导入存档<input id="import-file" type="file" accept=".json,application/json"></label></div><small>版本：${state.economyVersion} · 最近保存 ${new Date(state.updatedAt).toLocaleString('zh-CN')}</small></div><div class="settings-section"><h3>离线游玩</h3><p id="offline-status">${navigator.serviceWorker?.controller?'网页资源已缓存，可断网继续游玩。':'正在准备资源缓存，首次打开需联网。'}</p></div><div class="settings-section danger"><h3>重新开始</h3><p>删除当前收藏、货币和成长进度，建立新的本地存档。</p>${btn('重置存档','reset','','button danger-button')}</div></div></main>`;
}
function showRules() {
  showDialog('探索与收藏规则',`<div class="rules-body"><p>选择箱子，直接花游戏币开启。每次固定产出一定数量的物品，你可以保留收藏，也可以按标价 100% 出售。</p><ul><li>下水道免费，无次数上限；资金不足时可继续探索。</li><li>普通物品共 7 级、${Object.values(items).filter(item=>item.grade<8).length} 种；EX 共 ${Object.values(items).filter(item=>item.grade===8).length} 种，高级箱子的稀有物品和 EX 掉落率更高。允许重复，同箱也可能多件 EX。</li><li>每件先判定 EX，命中后替换普通物品。EX 条件权重为 2∶2∶1，无保底或幸运值。</li><li>前 200 次付费开箱：原有主要掉落等级向高一级转移 8 个百分点；201～300 次转移 4 个百分点。下水道和 EX 不受加成影响。</li><li>经验达到门槛就解锁新箱子，二至六级各发放固定解锁奖励，只发一次。</li><li>图鉴发现记录永久保留；收藏馆需要持有实物，展品和锁定物品不可出售。</li><li>无真实货币充值、玩家交易、自动开箱或离线收益。出售全部掉落时，1～3 级箱子每次保证盈利；4～6 级箱子标准盈利概率约为 77.5%、79.2%、85.2%，偶尔会亏损。相邻低一级箱子仍可回收亏损差额。</li></ul><div class="table-scroll"><table><thead><tr><th>箱子</th><th>价格</th><th>件数</th><th>经验</th></tr></thead><tbody>${economy.boxes.map(b=>`<tr><td>${tierNames[b.tier]}</td><td>${money(b.price)}</td><td>${b.item_count}</td><td>${economy.progression.xp_per_open[b.tier]}</td></tr>`).join('')}</tbody></table></div><p class="dialog-note">货币与成长在此浏览器本地运行。导入自己的备份可回到备份时的进度。</p></div>`,{wide:true,type:'rules'});
}
function showProbability() {
  const box=economy.boxes[selected], weights=weightsFor(economy,selected,state.paidOpens+1);
  showDialog(`${tierNames[selected]} · 掉落概率`,`<div class="rules-body"><p>以下普通概率以“本件未命中 EX”为条件。当前每个普通等级对应 1 种物品，每件独立抽取，允许重复。</p><div class="table-scroll"><table><thead><tr><th>普通等级</th><th>标准概率</th><th>当前概率</th></tr></thead><tbody>${weights.map((w,i)=>`<tr><td>${i+1} 级</td><td>${(economy.ordinary.grade_weights[selected][i]/1e10).toFixed(10).replace(/0+$/,'').replace(/\.$/,'')}%</td><td>${(w/1e10).toFixed(10).replace(/0+$/,'').replace(/\.$/,'')}%</td></tr>`).join('')}</tbody></table></div><p>单件 EX 概率：<strong>${(box.ex_numerator_per_million/10000).toFixed(4)}%</strong>。命中后，三种 EX 分别占 40%、40%、20%，替换本件普通掉落，不增加件数。</p><p class="dialog-note">新手加成已反映在当前概率中；不影响 EX。表中是随机抽取概率；低级箱盈利保底和相邻容器回收保底可能提升普通掉落等级。</p></div>`,{type:'probability'});
}
function chooseDisplay(slot, anchor) {
  if(anchor){detailAnchor=anchor.getBoundingClientRect();detailSource={slot:String(slot)};}
  const available=allItems.filter(i=>state.inventory[i.id]&&state.inventory[i.id].qty>exhibited(state,i.id)-(state.display[slot]===i.id?1:0));
  showDialog(`展位 ${slot+1} · 选择珍藏`,available.length?`<div class="display-picker">${available.map(i=>`<button class="picker-item" data-grade="${i.grade}" style="--grade-color:${colors[i.grade-1]};--reveal-background:${i.grade===1?'#aeb5bf':lootColors[i.grade-1]}" data-action="place" data-slot="${slot}" data-id="${i.id}">${itemSVG(i)}<span><strong>${i.name}</strong><small>${gradeNames[i.grade-1]} · 可放入 ${state.inventory[i.id].qty-exhibited(state,i.id)+(state.display[slot]===i.id?1:0)} 件</small></span></button>`).join('')}</div>`:`<div class="empty-state"><h3>还没有可摆放的收藏</h3><p>先去开箱保留物品，或撤下其他展位的物品。</p>${btn('前往开箱','nav','data-route="open"','button primary')}</div>`,{type:'picker'});
  if(state.display[slot]) modalRoot.querySelector('.dialog-heading').insertAdjacentHTML('afterend',btn('撤下当前藏品','remove-display',`data-slot="${slot}"`,'button secondary gallery-remove'));
  positionDetails();
}
function exportSave() {
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}), url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download=`wonderseeker-save-${new Date().toISOString().slice(0,10)}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); toast('存档备份已导出');
}
function confirmSales(drops) {
  const ex=drops.filter(d=>items[d.id]?.grade===8);
  return !ex.length || confirm(`将出售 ${ex.map(d=>items[d.id].name).join('、')}（EX）。\n总价值 ${money(ex.reduce((n,d)=>n+BigInt(d.price),0n))} 游戏币。\n确认出售这些稀有收藏？`);
}
let screenHold=null,suppressRevealClickUntil=0;
function clearScreenHold(){if(screenHold)clearTimeout(screenHold.timer);screenHold=null;}
document.addEventListener('pointerdown',event=>{
 if(!state?.pending||route!=='container'||busy||event.button!==0||!event.isPrimary||!event.target.closest('.reward-page,.grade7-light-scene,.grade7-dim-scene,.revealing'))return;
 if(event.target.closest('button,input,select,textarea'))return;
 clearScreenHold();
 const hold={id:event.pointerId,pending:state.pending,x:event.clientX,y:event.clientY};
 hold.timer=setTimeout(()=>{
   if(screenHold!==hold||route!=='container'||state.pending!==hold.pending)return;
   hold.fired=true;suppressRevealClickUntil=Date.now()+1000;skipRevealQueue();
 },650);
 screenHold=hold;
});
document.addEventListener('pointermove',event=>{if(screenHold&&event.pointerId===screenHold.id&&Math.hypot(event.clientX-screenHold.x,event.clientY-screenHold.y)>12)clearScreenHold();});
document.addEventListener('pointerup',event=>{if(screenHold?.id===event.pointerId){if(screenHold.fired)suppressRevealClickUntil=Date.now()+350;clearScreenHold();}});
document.addEventListener('pointercancel',clearScreenHold);
window.addEventListener('blur',clearScreenHold);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearScreenHold();});

document.addEventListener('click',async event=>{
  if (!state) return;
  playInterfaceClick(event.target);
  music.unlock();unlockWaitingSounds();
  if (!event.target.closest('[data-action="music"], [data-setting="music"]')) syncMusic();
  const target=event.target.closest('[data-action]'); if(!target||target.disabled)return;
  const a=target.dataset.action;
  if(a==='enter-game') {
    enteredGame=true; route='home'; closeModal(); playHomeClick(); render();
    $('.home-start')?.focus({preventScroll:true});
    return;
  }
  if (target.closest('.home-scene')) playHomeClick();
  if(a==='tidy-warehouse'){if(await mutate(s=>tidyWarehouse(s,items))){const rail=$('.warehouse-scroll');if(rail){rail.scrollTop=0;rail.scrollLeft=0;}toast('已按价值从高到低整理');}return;}
  if(a==='toggle-sale-mode'){warehouseSelling=!warehouseSelling;warehouseSelection.clear();render();return;}
  if(a==='toggle-sale-item'){const key=target.dataset.instance;if(!sellableInstance(state,key)){toast('锁定或展出的物品不可出售');return;}warehouseSelection.has(key)?warehouseSelection.delete(key):warehouseSelection.add(key);render();return;}
  if(a==='toggle-sale-grade-menu'){
    const menu=$('#sale-grade-menu');
    if(menu.matches(':popover-open')){menu.hidePopover();target.setAttribute('aria-expanded','false');return;}
    menu.showPopover();target.setAttribute('aria-expanded','true');
    const rect=target.getBoundingClientRect(),width=menu.offsetWidth,height=menu.offsetHeight;
    menu.style.left=`${Math.max(12,Math.min(rect.left,innerWidth-width-12))}px`;
    menu.style.top=`${Math.max(12,rect.top-height-8)}px`;
    menu.querySelector('[aria-checked="true"]')?.focus();return;
  }
  if(a==='choose-sale-grade'){
    saleGrade=Number(target.dataset.grade);
    $('#sale-grade-value').textContent=`${saleGrade}级及以下`;
    const menu=$('#sale-grade-menu');
    menu.querySelectorAll('[role="menuitemradio"]').forEach(option=>option.setAttribute('aria-checked',String(Number(option.dataset.grade)===saleGrade)));
    menu.hidePopover();$('#sale-grade').setAttribute('aria-expanded','false');$('#sale-grade').focus();return;
  }
  if(a==='select-sale-grade'){warehouseSelection=new Set(Object.entries(state.inventory).flatMap(([id,e])=>items[id].grade<=saleGrade?Array.from({length:e.qty},(_,i)=>`${id}#${i}`).filter(key=>sellableInstance(state,key)):[]));render();return;}
  if(a==='confirm-sale-selection'){
    const keys=[...warehouseSelection],total=keys.reduce((n,key)=>n+BigInt(state.inventory[key.split('#')[0]].price),0n),ex=keys.some(key=>items[key.split('#')[0]].grade===8);
    showDialog('确认出售',saleConfirmationBody(keys.length,total,{ex}),{type:'sale-confirm'});return;
  }
  if(a==='execute-sale-selection'){if(await mutate(s=>sellWarehouseInstances(s,[...warehouseSelection]))){warehouseSelection.clear();closeModal();render();playSound('sale');}return;}
  if(a==='auto-sell-settings'){
    showDialog('开箱自动出售',`<div class="auto-sell-content"><label class="auto-sell-toggle"><span>启用自动出售</span><input id="auto-sell-enabled" type="checkbox" role="switch" ${state.settings.autoSellEnabled?'checked':''}></label><label class="auto-sell-threshold" for="auto-sell-below">出售价值低于以下金额的物品</label><div class="auto-sell-input"><img src="./assets/home-ui/icon-coin.png" alt=""><input id="auto-sell-below" type="text" inputmode="numeric" maxlength="80" value="${state.settings.autoSellBelow||'0'}" aria-label="自动出售价值阈值"><span>金币</span></div><p class="auto-sell-note">低于此金额的新掉落自动出售，等于此金额则保留。锁定或展出的同类物品保留；EX 也按此金额判断。设置仅影响之后开启的宝箱。</p><div class="sale-confirm-actions">${btn('取消','close-modal','','button')}${btn('保存设置','save-auto-sell','','button primary')}</div></div>`,{type:'auto-sell'});return;
  }
  if(a==='save-auto-sell'){const value=$('#auto-sell-below').value.trim();if(!/^(0|[1-9]\d{0,79})$/.test(value)){toast('请输入非负整数金币金额');return;}const enabled=$('#auto-sell-enabled').checked;if(await mutate(s=>({...s,settings:{...s.settings,autoSellEnabled:enabled,autoSellBelow:value}}))){closeModal();toast('自动出售设置已保存');}return;}
  if(a==='codex-page'){codexPage+=Number(target.dataset.step);playCodexPageSound();render();return;}
  if(a==='choose-container'){
    const tier=Number(target.dataset.tier);
    if(unlocked(economy,tier,state.xp)&&state.containerUnlocks?.[tier]!=='ready'&&BigInt(state.balance)<BigInt(economy.boxes[tier].price)){toast('金币不足');return;}
    if(tier!==selected){const rail=$('.container-carousel'),card=target;rail.scrollTo({left:card.offsetLeft-(rail.clientWidth-card.offsetWidth)/2,behavior:'smooth'});return;}
    if(!unlocked(economy,tier,state.xp)){toast(`需要 ${economy.progression.paid_tier_unlock_total_xp[tier-1]} XP 解锁`);return;}
    route='container';closeModal();render();return;
  }
  if(a==='set-debug-value'){const field=target.dataset.field,value=$('#debug-'+field)?.value.trim();if(await mutate(s=>setDebugValue(s,economy,field,value)))toast(field==='xp'?'EXP 已设置':'金币已设置');return;}
  if(a==='claim-unlock'){if(!unlockScene?.ready||busy)return;selected=unlockScene.tier;unlockSounds.stop();unlockScene=null;route='container';render();$('[data-action="open-container"]')?.click();return;}
  if(a==='open-container'){
    if(openingInFlight||busy||state.pending||Date.now()<state.nextAt)return;
    openingInFlight=true;syncWaitingSounds();target.disabled=true;clearTimeout(revealTimer);
    const reduced=state.settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
    revealAt=Date.now()+(reduced?0:openingDurationMs);
    rewardIndex=0;
    try{if(await mutate(s=>autoSellDrops(openBox(s,economy,items,selected)))){revealAt=Date.now()+(reduced?0:openingDurationMs);render();playSound('open');const pending=state.pending;revealTimer=setTimeout(()=>{if(route==='container'&&state.pending===pending)showRewardReveal(0);},Math.max(0,revealAt-Date.now()));}else{revealAt=0;rewardIndex=-1;}}finally{openingInFlight=false;syncWaitingSounds();}
    return;
  }
  if(a==='advance-special'){if(Date.now()>=suppressRevealClickUntil)advanceSpecialReveal();return;}
  if(a==='skip-reveal'){
    skipRevealQueue();
    return;
  }
  if(a==='dismiss-rewards'){
    if(Date.now()<suppressRevealClickUntil)return;
    if(busy||!state.pending||exWaiting||Date.now()<nextRevealAt)return;
    if(rewardIndex>=0){showRewardReveal(rewardIndex+1);return;}
    if(Date.now()<overviewUntil)return;
    const choices=Object.fromEntries(state.pending.drops.filter(d=>!d.status).map(d=>[d.key,'keep']));
    if(await mutate(s=>finish(settle(s,choices)))){route='open';render();}return;
  }
  if(a==='nav'){route=target.dataset.route; gradeFilter='all';query='';closeModal();render();window.scrollTo({top:0,behavior:'auto'});return;}
  if(a==='select-box'){selected=Number(target.dataset.tier);render();return;}
  if(a==='filter'){gradeFilter=target.dataset.grade;render();return;}
  if(a==='close-modal'){closeModal();return;}
  if(a==='settings'){showSettings();return;}
  if(a==='rules'){showRules();return;}
  if(a==='probability'){showProbability();return;}
  if(a==='detail'){showDetails(target.dataset.id,target);return;}
  if(a==='choose-display'){chooseDisplay(Number(target.dataset.slot),target);return;}
  if(a==='export'){exportSave();return;}
  if(a==='wallet'){showDialog('我的金币',`<section class="wallet-content"><div class="wallet-current"><img src="./assets/home-ui/icon-coin.png" alt="" draggable="false"><p>当前可用余额</p><strong>${money(state.balance)}</strong><span>金币</span></div><dl class="wallet-history"><div><dt>累计开箱花费</dt><dd>${money(state.stats.spent)}<small>金币</small></dd></div><div><dt>累计出售到账</dt><dd>${money(state.stats.saleIncome)}<small>金币</small></dd></div></dl><p class="wallet-note">主页余额以亿为单位简写，交易按完整金币数量结算。</p></section>`,{type:'wallet'});return;}
  if(a==='open'){
    if(state.pending){revealAt=0;renderResult();return;}
    if(Date.now()<state.nextAt)return;
    const success=await mutate(s=>openBox(s,economy,items,selected));
    if(success){revealAt=Date.now()+(state.settings.reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches?0:1100/openingPlaybackSpeed);renderResult();playSound('open');setTimeout(()=>{if(modal==='result'){revealAt=0;renderResult();if(state.pending?.drops.some(d=>items[d.id].grade>=5))playSound('rare');}},1120/openingPlaybackSpeed);}
    return;
  }
  if(a==='settle-one'||a==='settle-all'){
    if(!state.pending)return;
    const choices={};
    for(const d of state.pending.drops) if(!d.status&&(a==='settle-all'||d.key===target.dataset.key))choices[d.key]=a==='settle-one'?target.dataset.choice:target.dataset.mode==='new'?(d.keepSuggested?'keep':'sell'):target.dataset.mode;
    if(!confirmSales(state.pending.drops.filter(d=>choices[d.key]==='sell')))return;
    if(await mutate(s=>settle(s,choices)))playSound('sale');return;
  }
  if(a==='finish'){if(await mutate(finish)){closeModal();$('#open-button')?.focus({preventScroll:true});}return;}
  if(a==='toggle-lock'){if(await mutate(s=>toggleLock(s,target.dataset.id)))showDetails(target.dataset.id);return;}
  if(a==='sell-item'){
    const id=target.dataset.id,qty=Number($('#sale-qty')?.value);
    if(!Number.isSafeInteger(qty)||qty<=0){toast('请输入有效的出售数量');return;}
    const entry=state.inventory[id];
    if(!entry||entry.locked||qty>entry.qty-exhibited(state,id)){toast('物品已锁定或可出售数量不足');return;}
    const total=BigInt(entry.price)*BigInt(qty);
    showDialog('确认出售',saleConfirmationBody(qty,total,{name:items[id].name,ex:items[id].grade===8,action:'execute-detail-sale',attributes:`data-id="${id}" data-qty="${qty}"`,cancelAction:'cancel-detail-sale',cancelAttributes:`data-id="${id}"`}),{type:'sale-confirm'});return;
  }
  if(a==='cancel-detail-sale'){closeModal();showDetails(target.dataset.id);return;}
  if(a==='execute-detail-sale'){
    if(busy)return;
    const id=target.dataset.id,qty=Number(target.dataset.qty);
    if(await mutate(s=>sellInventory(s,id,qty))){closeModal();showDetails(id);playSound('sale');}return;
  }
  if(a==='bulk-sell'){
    const entries=Object.entries(state.inventory).filter(([id,e])=>!e.locked&&e.qty>exhibited(state,id));
    if(!entries.length){toast('没有可出售的未锁定物品');return;}
    const qty=entries.reduce((n,[id,e])=>n+e.qty-exhibited(state,id),0),total=entries.reduce((n,[id,e])=>n+BigInt(e.price)*BigInt(e.qty-exhibited(state,id)),0n);
    const ex=entries.some(([id])=>items[id].grade===8);
    const selection=entries.map(([id,e])=>[id,e.qty-exhibited(state,id)]);
    showDialog('确认出售',saleConfirmationBody(qty,total,{ex,action:'execute-bulk-sale',attributes:`data-selection="${escapeHTML(JSON.stringify(selection))}"`}),{type:'sale-confirm'});return;
  }
  if(a==='execute-bulk-sale'){
    if(busy)return;
    const selection=JSON.parse(target.dataset.selection);
    if(await mutate(s=>selection.reduce((next,[id,qty])=>sellInventory(next,id,qty),s))){closeModal();playSound('sale');}return;
  }
  if(a==='place'){if(await mutate(s=>setDisplay(s,Number(target.dataset.slot),target.dataset.id)))closeModal();return;}
  if(a==='remove-display'){if(await mutate(s=>setDisplay(s,Number(target.dataset.slot),null)))closeModal();return;}
  if(a==='sound'){await mutate(s=>({...s,settings:{...s.settings,sound:!s.settings.sound}}));return;}
  if(a==='music'){await mutate(s=>({...s,settings:{...s.settings,music:s.settings.music===false}}));return;}
  if(a==='retry'){if(await mutate(s=>structuredClone(s),{allowRetry:true}))toast('保存已恢复');return;}
  if(a==='reset'){
    if(!confirm('删除当前所有进度并重新开始？\n建议先导出存档备份。'))return;
    if(await mutate(()=>fresh(economy))){selected=1;route='home';closeModal();render();toast('新的收藏旅途开始了');}return;
  }
});
document.addEventListener('input',event=>{if(event.target.id==='search'){query=event.target.value;render();}});
let spaceHold=null;
function clearSpaceHold(){if(spaceHold)clearTimeout(spaceHold.timer);spaceHold=null;}
window.addEventListener('blur',clearSpaceHold);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearSpaceHold();});
document.addEventListener('keyup',event=>{
 if(event.key!==' '||!spaceHold)return;
 event.preventDefault();const hold=spaceHold;clearSpaceHold();
 if(!hold.fired&&!busy&&route==='container'&&state.pending===hold.pending&&rewardIndex===hold.index&&Date.now()>=revealAt) $(exWaiting?'[data-action="advance-special"]':'.reward-page')?.click();
});
document.addEventListener('keydown',event=>{
 if(!state)return;music.unlock();unlockWaitingSounds();syncMusic();
 if(modalRoot.querySelector('dialog[open]')||event.target.closest('input,select,textarea,[contenteditable="true"]'))return;
 if(unlockScene){if([' ','Enter'].includes(event.key)){event.preventDefault();if(!event.repeat&&!busy)$('[data-action="claim-unlock"]')?.click();}return;}
 if(event.key===' '&&route==='container'&&state.pending){
   event.preventDefault();if(event.repeat||spaceHold||busy)return;
   const hold={pending:state.pending,index:rewardIndex,fired:false};
   hold.timer=setTimeout(()=>{if(spaceHold===hold){hold.fired=true;if(route==='container'&&state.pending===hold.pending)skipRevealQueue();}},650);
   spaceHold=hold;return;
 }
 if(exWaiting){if(event.key==='Escape'){event.preventDefault();skipRevealQueue();}else if(event.key==='Enter'){event.preventDefault();if(!event.repeat)advanceSpecialReveal();}return;}
 if(event.target.closest('[data-action="skip-reveal"]'))return;
 if([' ','Enter'].includes(event.key)&&(route==='container'||route==='open')){
  event.preventDefault();if(event.repeat||openingInFlight||busy)return;
  if(route==='open')$('.carousel-container.centered')?.click();
  else if(state.pending&&Date.now()>=revealAt)$('.reward-page')?.click();
  else $('[data-action="open-container"]')?.click();
 }else if(route==='container'&&!state.pending&&event.key==='Escape'){route='open';render();}
});
document.addEventListener('toggle',event=>{
  if(event.target.id==='sale-grade-menu')$('#sale-grade')?.setAttribute('aria-expanded',String(event.newState==='open'));
},true);
document.addEventListener('keydown',event=>{
  const menu=event.target.closest('.sale-grade-menu');if(!menu)return;
  const options=[...menu.querySelectorAll('[role="menuitemradio"]')],index=options.indexOf(document.activeElement);
  if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
    event.preventDefault();
    options[event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length]?.focus();
  }else if(event.key==='Escape'){event.preventDefault();menu.hidePopover();$('#sale-grade')?.focus();}
  else if(event.key==='Tab'){menu.hidePopover();$('#sale-grade')?.focus();}
});
document.addEventListener('change',async event=>{
  const t=event.target;
  if(t.matches('select')&&route!=='open'&&route!=='container')playHomeClick();
  if(t.id==='sort'){sort=t.value;render();}
  if(t.dataset.setting){const key=t.dataset.setting;await mutate(s=>({...s,settings:{...s.settings,[key]:key==='musicMode'?t.value:t.checked}}));}
  if(t.id==='import-file'){
    const file=t.files?.[0];if(!file)return;
    try {
      if(file.size>5*1024*1024)throw new Error('存档文件过大');
      const imported=validate(migrateEconomy(migrateTestItems(JSON.parse(await file.text()),items),economy,items),economy,items);
      if(!confirm(`导入这个存档并替换当前进度？\n游戏币：${money(imported.balance)}\n经验：${imported.xp}\n已发现：${Object.keys(imported.seen).length} / ${allItems.length}\n当前进度将被替换，建议先导出备份。`))return;
      if(await mutate(()=>structuredClone(imported))){selected=state.pending?.tier??1;route=state.pending?'container':'home';closeModal();render();toast('存档导入成功');}
    }catch(error){toast('导入失败：'+error.message);}finally{t.value='';}
  }
});
setInterval(updateOpenButton,200);
function unavailable(message) {
  app.innerHTML=`<div class="unavailable"><img src="./icon.svg" alt=""><h1>收藏所暂时无法打开</h1><p>${escapeHTML(message)}</p><button class="button primary" id="reload">重新打开</button></div>`;
  $('#reload').onclick=()=>location.reload();
}
async function start() {
  try {
    db=await connect();const saved=await read(db);
    state=saved?validate(migrateEconomy(migrateTestItems(saved,items),economy,items),economy,items):fresh(economy);
    const interrupted=!!state.pending;
    if(interrupted){
      selected=state.pending.tier;
      state=settleInterruptedOpen(state);state.revision++;state.updatedAt=Date.now();
      validate(state,economy,items);
    }
    if(interrupted||!saved||saved.contentVersion!==state.contentVersion||saved.economyVersion!==state.economyVersion)await write(db,state);
    render();
    const warmReveal=()=>divineReveal.prepare();
    if('requestIdleCallback' in window)window.requestIdleCallback(warmReveal,{timeout:1000});else setTimeout(warmReveal,100);
    if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>toast('离线缓存暂未就绪，在线游玩和存档不受影响'));
  }catch(error){unavailable(error.message+'。原有存档不会被覆盖。');}
}
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
if(navigator.locks){navigator.locks.request('reta-active-save',{ifAvailable:true},async lock=>{
  if(!lock){unavailable('另一个标签页正在运行游戏，请关闭它后重新打开此页。');return;}
  await start();await new Promise(resolve=>window.addEventListener('pagehide',resolve,{once:true}));
});}else unavailable('当前浏览器不支持单标签存档保护，请使用新版 Chrome、Edge 或 Safari。');
