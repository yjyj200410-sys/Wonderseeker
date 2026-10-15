import {specialPhaseMarkup,specialFinalWaves} from './special-reveal.js';
import {makeItems} from './content.js';
const scene=document.querySelector('#scene'),status=document.querySelector('#status'),cooldown=document.querySelector('#cooldown');
const economy=await fetch('./economy.json').then(r=>{if(!r.ok)throw Error('资源加载失败');return r.json()});
const items=Object.values(makeItems(economy));
let kind='grade7',step=0,readyAt=0,sound=true,timer,voices=[];
const art=grade=>{const item=items.find(i=>i.grade===grade&&i.texture);return item?`<img src="${item.texture}" alt="${item.name}" draggable="false">`:''};
const steps={grade7:['上一件物品 · 点击进入星空','第 1 / 3 下 · 星空','第 2 / 3 下 · 三道白色能量环收束','第 3 / 3 下 · 星空中物品出现'],ex:['上一件物品 · 点击进入星空','第 1 / 4 下 · 星空','第 2 / 4 下 · 三道白色能量环收束','第 3 / 4 下 · 六道白色环收束','第 4 / 4 下 · 星空中物品与炫彩光辉同时出现']};
function reset(){clearTimeout(timer);voices.forEach(v=>{v.pause();v.currentTime=0});voices=[];step=0;readyAt=0;scene.innerHTML=`<div class="previous"><small>上一件 · 6 级物品</small>${art(6)}</div>`;status.textContent=steps[kind][0];cooldown.textContent='点击冷却 0.5 秒';scene.setAttribute('aria-disabled','false')}
function advance(){
 if(performance.now()<readyAt||step>=steps[kind].length-1)return;
 step++;readyAt=performance.now()+500;scene.setAttribute('aria-disabled','true');
 if(step===1){scene.replaceChildren();scene.insertAdjacentHTML('beforeend','<div class="starfield-layer" aria-hidden="true"></div>');}
 if(step===2)scene.insertAdjacentHTML('beforeend',specialPhaseMarkup(2,kind==='ex'?8:7));
 if(kind==='ex'&&step===3){scene.querySelector('.ex-focus')?.remove();scene.insertAdjacentHTML('beforeend',specialPhaseMarkup(3,8));}
 if((kind==='grade7'&&step===3)||(kind==='ex'&&step===4)){
  scene.querySelector('.ex-focus')?.remove();
  scene.insertAdjacentHTML('beforeend',specialFinalWaves(kind==='ex'?8:7));
  if(kind==='ex'){scene.insertAdjacentHTML('beforeend','<div class="ex-burst" aria-hidden="true"></div><div class="ex-back-aura" aria-hidden="true"></div>');}
  const rewardArt=art(kind==='ex'?8:7);
  const outlineTexture=items.find(i=>i.grade===(kind==='ex'?8:7)&&i.texture)?.texture;
  const exTexture=kind==='ex'?items.find(i=>i.grade===8&&i.texture)?.texture:null;
  scene.insertAdjacentHTML('beforeend',`<div class="reward">${outlineTexture?`<span class="silhouette-halo" style="--outline-mask:url('${outlineTexture}')" aria-hidden="true"><span></span></span>`:''}${rewardArt}${exTexture?`<span class="ex-surface-glow" style="--surface-mask:url('${exTexture}')" aria-hidden="true"></span>`:''}</div>`);
 }
 status.textContent=steps[kind][step];cooldown.textContent='冷却中 · 0.5 秒';
 if(sound){const voice=new Audio(`./assets/audio/reveals/musiclab-${kind}-step-${step}-brass-v14.wav`);voice.volume=.8;voices.push(voice);voice.play().catch(()=>{cooldown.textContent='音效播放失败，画面可继续'})}
 clearTimeout(timer);timer=setTimeout(()=>{scene.setAttribute('aria-disabled','false');cooldown.textContent=step===steps[kind].length-1?'揭示完成 · 可点击重播':'可点击下一步 · 冷却 0.5 秒'},500);
}
scene.onclick=advance;scene.onkeydown=e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)advance()}};
for(const [id,value] of [['seven','grade7'],['ex','ex']])document.getElementById(id).onclick=()=>{kind=value;document.querySelector('#seven').setAttribute('aria-pressed',String(kind==='grade7'));document.querySelector('#ex').setAttribute('aria-pressed',String(kind==='ex'));reset()};
document.querySelector('#reset').onclick=reset;
document.querySelector('#sound').onclick=e=>{sound=!sound;e.target.textContent=`声音：${sound?'开':'关'}`;e.target.setAttribute('aria-pressed',String(sound));if(!sound)voices.forEach(v=>v.pause())};
window.addEventListener('pagehide',()=>{clearTimeout(timer);voices.forEach(v=>v.pause())});reset();
