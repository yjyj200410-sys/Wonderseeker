import {revealPalettes} from './reveal-palettes.js';
import {createRevealRenderer} from './reveal-lab-gpu.js';
const $=s=>document.querySelector(s);
const stage=$('#stage'), art=$('#art'), reward=$('#reward'), frame=$('#art-frame');
const names=['日冕加冕','圣殿棱光','极光圣翼'];
const descriptions=[
 '01 / 单段揭示：物品、品质背景与白色装饰一次登场，EX 同时展开符文光环。',
 '02 / 圣殿棱光：单段揭示物品与六芒圣环，EX 同时呈现棱晶与冠冕。',
 '03 / 极光圣翼：单段揭示物品与光冠，EX 同时展开双翼。',
];
const items={6:['旧王冠','远古圣物','grade-6-old-crown.png'],7:['圣杯','维度至宝','grade-7-holy-grail.png'],8:['无尽之心','超维孤品','ex-1-endless-heart-v1.png']};
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let coreStyle=0;
let mode=0,grade=8,phase=0,age=0,baseAge=0,time=0,auto=false,playing=true,last=performance.now(),quiet=reducedMotion,engine;
const clamp=x=>Math.max(0,Math.min(1,x));
const out=x=>1-Math.pow(1-clamp(x),4);
const settle=t=>1-(.76*Math.exp(-Math.max(t,0)*5)+.24*Math.exp(-Math.max(t,0)*.8));
const boundaries=[0,.001,1.5,3.2,5.5];
const durations=[0,1.5,1.7,2.3,6];
const finalPhase=()=>grade===6?3:grade===8?4:3;
$('#quiet').checked=quiet;
try{
 engine=createRevealRenderer($('#fx'));
 const resize=()=>{const r=stage.getBoundingClientRect();engine.resize(r.width,r.height)};
 new ResizeObserver(resize).observe(stage);resize();
 $('#render-status').textContent='本地预览 · 游戏原始物品 · 第二版';
}catch(e){
 $('#engine-error').hidden=false;$('#engine-error').textContent='光效加载失败：'+e.message;$('#render-status').textContent='光效加载失败';console.error(e);
}
function setItem(){
 const [name,rarity,file]=items[grade];art.src=`assets/items/${file}`;art.alt=name;
 frame.style.setProperty('--item-mask',`url("assets/items/${file}")`);
 $('#itemname').textContent=name;$('#rarity').textContent=rarity;
 $('#itemtag').textContent=grade===8?'THE DIVINE ASCENDS':'A WONDER REVEALED';
}
function sync(){
 const complete=phase===finalPhase();
 $('#hint').textContent=complete?'揭示完成 · 点击重新播放':'点击画面 · 揭示物品';
 $('#play').textContent=auto?'Ⅱ 暂停':'▶ 播放揭示';
 $('#next').disabled=false;
 $('#next').textContent=complete?'重新揭示 ↻':'揭示物品 →';
 $('#quality').textContent=grade===6?'GRADE 6':phase<4?grade===8?'GRADE 7 → EX':'GRADE 7':'EX / 超维孤品';
 $('#variant').textContent=`0${mode+1} / ${names[mode]}`;
 $('#description').textContent=descriptions[mode];
 $('#extra').style.opacity=grade===8?'1':'.2';
 $('#upgrade').disabled=grade===6;
 $('#base').disabled=grade===6;
 stage.dataset.phase=phase;stage.dataset.grade=grade;stage.dataset.mode=mode;
}
function reset(){phase=0;age=0;baseAge=0;time=0;auto=false;playing=true;sync()}
function enter(next){
 phase=next;age=0;
 if(next===(grade===8?4:3))baseAge=0;
 // EX keeps the item hidden through its additional charge; phase four starts the reveal.
 sync();
}
function advance(){reset();auto=false;playing=true;enter(finalPhase())}
function selectGrade(value){grade=value;document.querySelectorAll('button[data-grade]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.grade===grade)));setItem();reset()}
for(const b of document.querySelectorAll('button[data-grade]'))b.onclick=()=>selectGrade(+b.dataset.grade);
for(const b of document.querySelectorAll('button[data-mode]'))b.onclick=()=>{mode=+b.dataset.mode;document.querySelectorAll('button[data-mode]').forEach(e=>e.setAttribute('aria-pressed',String(e===b)));reset()};
for(const b of document.querySelectorAll('button[data-background]'))b.onclick=()=>{engine?.setBackground(b.dataset.background);document.querySelectorAll('button[data-background]').forEach(e=>e.setAttribute('aria-pressed',String(e===b)))};
const coreStudies=[
 ['原版：柔光光团，作为比较基准。',''],
 ['A · 圣光珠核：白金内核、清晰光壳与刻线；参考 Holy Magic Spell 的神圣施法方向。','https://juliendelaunay.artstation.com/projects/GaQXDz'],
 ['B · 绘制云核：宽幅卷边、柔硬相间的轮廓与内部明暗；参考 Wispy Magical Orb 的手绘特效方向。','https://www.artstation.com/artwork/DAVzKy'],
 ['C · 临界电核：断开的棱角光壳、内部放电和四向约束片；参考 Capacitance 的蓄力失稳方向。','https://fueltheinferno.com/capacitance/'],
 ['D · 分形光核：球面纵深、缓慢翻涌的分形纹理与亮边；参考 Magic Orb in Hand 的 AE 分层方法。','https://emenebroker.artstation.com/projects/JlAPmv'],
];
function observeCore(){advance()}
for(const button of document.querySelectorAll('[data-core]'))button.onclick=()=>{
 coreStyle=+button.dataset.core;
 document.querySelectorAll('[data-core]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 $('#core-description').textContent=coreStudies[coreStyle][0];
 $('#core-source').hidden=!coreStudies[coreStyle][1];$('#core-source').href=coreStudies[coreStyle][1]||'#';
 observeCore();
};
$('#hold-charge').onclick=observeCore;
$('#core-play').onclick=()=>{reset();playing=true;auto=true;enter(finalPhase())};
$('#palette-options').innerHTML=revealPalettes.map((p,i)=>`<button data-palette="${p.id}" aria-pressed="${i===0}"><span class="palette-swatch" style="background:linear-gradient(120deg,${(p.purple?[[.95,.56,.085],...p.colors]:p.colors).map(c=>`rgb(${c.map(v=>Math.round(Math.pow(v,1/2.2)*255)).join(' ')})`).join(',')})"></span>${p.name}</button>`).join('');
for(const button of document.querySelectorAll('[data-palette]'))button.onclick=()=>{
 const palette=revealPalettes.find(p=>p.id===button.dataset.palette);
 engine?.setBackground('current');engine?.setPalette(palette.id);
 document.querySelectorAll('[data-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 document.querySelectorAll('[data-background]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.background==='current')));
 $('#palette-note').textContent=palette.note;
 if(grade===6){grade=8;setItem();document.querySelectorAll('button[data-grade]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.grade===grade)))}
 auto=false;playing=true;phase=finalPhase();age=6;baseAge=6;time=11.5;sync();
};
stage.onclick=advance;
stage.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();if(!e.repeat)advance()}};
$('#next').onclick=advance;$('#reset').onclick=advance;
$('#play').onclick=()=>{
 if(auto){auto=false;playing=false;sync();return}
 if(phase===finalPhase()&&age>1)reset();
 playing=true;auto=true;if(phase===0)enter(finalPhase());sync();
};
$('#final').onclick=()=>{auto=false;playing=true;phase=finalPhase();age=6;baseAge=6;time=11.5;sync()};
$('#base').onclick=()=>{selectGrade(7);auto=false;playing=true;phase=3;age=2.3;baseAge=2.3;time=5.5;sync()};
$('#upgrade').onclick=()=>{
 if(grade!==8){grade=8;document.querySelectorAll('button[data-grade]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.grade===8)));setItem()}
 if(phase<3){baseAge=2.3;time=5.5}
 phase=4;age=0;baseAge=0;auto=false;playing=true;sync();
};
$('#quiet').onchange=e=>quiet=e.target.checked;
$('#scrub').oninput=e=>{
 auto=false;playing=false;const v=+e.target.value;
 phase=v>.001?finalPhase():0;
 age=v;baseAge=v;time=v;sync();
};
function tick(now){
 const dt=Math.min(.06,(now-last)/1000)*($('#slow').checked?.5:1);last=now;
 if(playing){time+=dt;if(phase>0){age+=dt;if(phase>=(grade===8?4:3))baseAge+=dt}}
 if(auto&&age>=durations[phase]){
   if(phase===finalPhase()){auto=false;sync()}
   else enter(phase+1);
 }
 const extra=phase===4?(quiet?1:age>=6?1:settle(age)):0;
 
 const revealed=phase>=(grade===8?4:3);
 reward.style.opacity=revealed?1:0;
 // Sample the ordinary game's exact CSS arrival, including its ease-out curve.
 frame.style.transform='translate(-50%,-50%)';
 frame.style.animation=revealed&&!quiet?'lab-loot-arrive .3s ease-out both paused':'none';
 frame.style.animationDelay=`-${Math.min(.3,Math.max(0,baseAge))}s`;
 frame.style.opacity=revealed?1:0;
 art.style.filter='none';
 $('#surface').style.opacity=0;
 $('#caption').style.opacity=revealed?1:0;
 $('#caption').style.animation=revealed&&!quiet?'lab-name-arrive .32s ease-out both paused':'none';
 $('#caption').style.animationDelay=`${.08-Math.min(.5,baseAge)}s`;
 $('#ex-title').style.opacity=0;
 $('#ex-title').style.transform=`translateY(${(1-extra)*-16}px)`;
 const stageTime=phase===0?0:Math.min(6,age);
 if(playing)$('#scrub').value=stageTime;
 $('#clock').textContent=`${stageTime.toFixed(2)} s`;
 engine?.render({coreStyle,mode,phase,age:quiet?6:age,baseAge:quiet?6:baseAge,time:quiet?4:time,extra,quiet,ordinary:grade===6,isEX:grade===8});
 requestAnimationFrame(tick);
}
setItem();sync();requestAnimationFrame(tick);



