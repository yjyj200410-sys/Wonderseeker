import {worldItems} from './world-items.js';
export const gradeNames = ['街角拾遗', '旧城遗物', '秘境造物', '失落珍藏', '星界奇物', '远古圣物', '维度至宝', '超维孤品'];
export const colors = ['#90a6ae', '#6bcb9f', '#64b8df', '#a68fe5', '#edbb65', '#ea8f85', '#76e9e1', '#eef7ff'];
export const lootColors = ['transparent', '#00ff68', '#008cff', '#b000ff', '#ffbd00', '#ff263e', 'transparent', 'transparent'];
export const tierNames = ['下水道', '街角木箱', '旧城铁箱', '秘境匣子', '失落宝箱', '皇室珍藏', '星界遗物'];
export const tierSubtitles = ['每一件不起眼的东西，都有它的故事。', '从一枚生锈的零件，开始你的收藏。', '旧城深处，封存着被遗忘的日常。', '一扇通向未知世界的小小入口。', '时间沉淀的珍藏，等待新的主人。', '来自星海边缘，闪烁着陌生的光。', '寻找那些跨越时代的稀有遗存。'];
const bases = ['碎晶', '徽章', '齿轮', '钥匙', '棱镜', '罗盘', '灯芯', '种子', '面具', '石碑', '羽片', '沙漏', '铃铛', '指环', '瓶器', '信标', '书页', '星核', '符印', '方尖塔'];
const prefixes = ['斑驳', '青铜', '幽蓝', '暮紫', '鎏金', '赤曜', '永恒'];
export function makeItems(economy) {
  const names=['木碗','铁锤','蜂蜜罐','银烛台','镀金猫雕像','旧王冠','圣杯'];
  const files=['wooden-bowl','iron-hammer','honey-jar','silver-candlestick','gilded-cat','old-crown','holy-grail'];
  const footprints=[[1,1],[1,3],[2,2],[1,3],[2,3],[3,2],[2,3]];
  const descriptions=['碗沿被岁月磨得圆润，木纹里还藏着一顿家常饭的温度。','木柄握得发亮，沉甸甸的锤头修补过许多平常日子。','金黄的蜂蜜封存着花香，罐口的甜意引来过几只贪嘴的小蜂。','烛泪落在银色底座上，一点暖光曾陪人读完漫长的夜。','小猫端坐得一本正经，耳尖的镀金被摸得格外明亮。','宝石依然闪耀，冠沿的缺口却记得一个王朝的落幕。','金色杯沿映着微光，举杯的人早已远去，祝愿仍留在杯中。'];
  const items=names.map((name,g)=>({id:`g${g+1}-01`,name,grade:g+1,shape:0,price:String(economy.ordinary.value_slots[g][0]),texture:`./assets/items/grade-${g+1}-${files[g]}.png`,footprint:footprints[g],description:descriptions[g]}));
  const additions=[
    ['陶杯','earthen-cup',[1,1],'烧制不太均匀的陶杯，杯沿的小缺口留着旧日茶香。'],
    ['铜铃','bronze-bell',[1,2],'铜绿爬上铃口，轻轻一摇，旧城的回声便醒了。'],
    ['蓝釉茶壶','blue-teapot',[2,2],'云纹浮在蓝釉上，仿佛盛着一壶晴朗的天空。'],
    ['银怀表','silver-pocket-watch',[2,2],'银壳里的指针依然走动，替失约的人守着时间。'],
    ['翡翠龟','jade-turtle',[2,2],'整块翡翠雕成的小龟，背上的金纹藏着漫长岁月。'],
    ['皇家八音盒','royal-music-box',[3,2],'掀开珐琅盒盖，金色小鸟便唱起失落王庭的舞曲。'],
    ['星曜仪','stellar-armillary',[3,3],'金环约束着一颗微缩星辰，每次转动都映出不同的星空。']
  ];
  additions.forEach(([name,file,footprint,description],g)=>{const grade=g===4?6:g+1;items.push({id:g===4?'g6-04':`g${g+1}-02`,name,grade,shape:0,price:String(economy.ordinary.value_slots[grade-1][0]),texture:`./assets/items/grade-${g+1}-${file}-v2.png`,footprint,description});});
  const chinese=[
    ['鲁班锁','luban-lock',[2,2],'没有一枚钉子，六块木头却把巧思锁在了一起。'],
    ['青瓷凉枕','celadon-pillow',[2,1],'枕面微凉，釉色里藏着一个悠长的夏夜。'],
    ['燕归风筝','swallow-kite',[3,2],'竹骨撑开双翼，线轴另一头牵着故乡的风。'],
    ['萤火走马灯','firefly-carousel-lantern',[2,3],'灯芯轻转，纸窗里的小桥街巷便走过四季。'],
    ['拨云算盘','cloud-abacus',[3,2],'把阴晴拨到一边，算一算明日会落几场春雨。'],
    ['烟火一锅','city-hotpot',[3,3],'揭开锅盖，一城灯火正暖，巷子深处还有人等你吃饭。']
  ];
  chinese.forEach(([name,file,footprint,description],g)=>items.push({id:`g${g+2}-03`,name,grade:g+2,shape:0,price:String(economy.ordinary.value_slots[g+1][0]),texture:`./assets/items/china-${g+2}-${file}-v1.png`,footprint,description}));
  const modern=[
    ['缺口搪瓷缸','enamel-mug',[1,1],'蓝边磕掉了一角，缸里的热水仍冒着熟悉的暖意。'],
  ];
  modern.forEach(([name,file,footprint,description],g)=>items.push({id:`g${g+1}-04`,name,grade:g+1,shape:0,price:String(economy.ordinary.value_slots[g][0]),texture:`./assets/items/china-modern-${g+1}-${file}-v1.png`,footprint,description}));
  items.push({id:'g1-05',name:'铁皮青蛙',grade:1,shape:0,price:String(economy.ordinary.value_slots[0][0]),texture:'./assets/items/world-1-tin-frog-v1.png',footprint:[2,1],description:'薄铁皮压出伏地的蛙形，拧动侧边发条，童年的小玩具又向前跳了一步。'});
  ['无尽之心'].forEach((name, i) => items.push({ id: `ex-${i + 1}`, name, grade: 8, shape: 20 + i, price: String(economy.ex.values[i]), description: 'EX · 超维孤品。极少出现在寻常箱子中的收藏，像一封来自另一维度的信。' }));
  items.find(item=>item.id==='ex-1').footprint=[2,2];
  items.find(item=>item.id==='ex-1').texture='./assets/items/ex-1-endless-heart-v1.png';
  items.find(item=>item.id==='ex-1').description='物质尚未凝成世界时，它便已在跳动。三道悬空轨迹锁住光、空间与时间，核心之间的空隙却容得下一整个宇宙。';
  worldItems.forEach(item=>items.push({...item,shape:0,price:String(economy.ordinary.value_slots[item.grade-1][0])}));
  return Object.fromEntries(items.map(item => [item.id, item]));
}
// Deliberately straight-edged silhouettes: the MVP uses a simple polygon style.
const shapes = [
  '<polygon points="49,12 72,32 65,72 43,90 26,60 32,28"/><path d="M49 12 43 90M32 28 65 72M26 60 72 32"/>',
  '<polygon points="50,16 79,34 79,68 50,86 21,68 21,34"/><polygon points="50,31 66,41 66,61 50,72 34,61 34,41"/>',
  '<path d="M40 16H60L63 28 74 33 86 31 92 49 81 57 78 69 81 81 63 89 53 79 40 78 28 85 17 70 24 58 23 46 13 36 26 22 38 28Z"/><polygon points="50,36 64,45 60,61 44,65 35,51"/>',
  '<polygon points="23,20 48,16 64,36 55,58 80,83 73,91 64,82 57,88 47,79 51,73 37,57 17,49 13,32"/><polygon points="29,27 43,25 51,36 44,47 28,43 24,35"/>',
  '<polygon points="50,13 87,79 14,79"/><path d="M50 13 50 79M14 79 61 43M87 79 37 36"/>',
  '<polygon points="50,10 60,39 88,50 60,61 50,91 40,61 12,50 40,39"/><polygon points="50,29 62,50 50,72 38,50"/>',
  '<polygon points="37,20 63,20 70,58 79,84 22,84 31,58"/><polygon points="50,29 60,46 50,62 40,46"/><path d="M23 73H77"/>',
  '<polygon points="50,18 77,43 72,70 50,90 26,70 23,43"/><path d="M50 18V90M23 43 72 70M77 43 26 70"/>',
  '<polygon points="21,20 50,28 79,20 75,62 50,89 25,62"/><polygon points="28,40 43,43 40,53 27,50"/><polygon points="57,43 72,40 73,50 60,53"/><path d="M40 69 50 74 60 69"/>',
  '<polygon points="32,13 68,13 77,87 23,87"/><path d="M38 30H62M36 45H64M33 60H67M30 75H70"/>',
  '<polygon points="73,12 72,52 42,79 21,88 27,58 50,29"/><path d="M21 88 73 12M29 62 54 66M41 44 68 48"/>',
  '<polygon points="25,16 75,16 72,32 56,49 73,68 77,85 23,85 27,68 44,49 28,32"/><path d="M31 25H69M33 76H67M44 49H56"/>',
  '<polygon points="42,18 59,18 62,28 70,37 75,69 86,80 14,80 25,69 30,37 38,28"/><path d="M23 67H77M42 89H59"/>',
  '<polygon points="29,22 71,22 89,50 71,78 29,78 11,50"/><polygon points="38,38 62,38 70,50 62,63 38,63 30,50"/>',
  '<polygon points="39,15 61,15 61,36 77,47 74,85 26,85 23,47 39,36"/><path d="M25 57H75M39 26H61M36 70 48 63 64 72"/>',
  '<polygon points="50,12 68,27 64,52 77,83 23,83 36,52 32,27"/><polygon points="50,23 59,30 57,44 44,44 41,30"/><path d="M31 66H69"/>',
  '<polygon points="22,17 50,24 78,17 78,79 50,88 22,79"/><path d="M50 24V88M29 34 43 38M29 48 43 52M57 38 70 34M57 52 70 48"/>',
  '<polygon points="50,11 61,37 90,39 69,57 76,86 50,71 24,86 31,57 10,39 39,37"/><path d="M50 11 50 71M10 39 69 57M90 39 31 57"/>',
  '<polygon points="50,12 81,31 81,69 50,88 19,69 19,31"/><path d="M35 31 64 69M65 31 36 69M19 50H81"/>',
  '<polygon points="50,9 64,29 72,87 28,87 36,29"/><path d="M50 9V87M36 29H64M31 66 50 75 69 66"/>',
  '<polygon points="50,7 90,45 72,85 29,85 10,45"/><polygon points="50,27 67,49 50,73 33,49"/><path d="M50 7V27M10 45 33 49M90 45 67 49M29 85 50 73 72 85"/>',
  '<polygon points="50,8 85,29 85,71 50,92 15,71 15,29"/><path d="M15 29 50 50 85 29M50 50V92M50 8V50M15 71 50 50 85 71"/>',
  '<polygon points="50,10 86,31 71,86 28,86 14,31"/><polygon points="32,28 69,28 51,53 70,72 31,72 51,53"/>'
];
let artSequence = 0;
export function itemSVG(item, unknown = false) {
  if(item.texture)return `<img class="item-texture ${item.pixelArt?'pixel-art':''} ${item.artScaleX?'long-phone':''} ${unknown?'unknown-texture':''}" ${item.artScaleX?`style="--art-scale-x:${item.artScaleX}"`:''} src="${item.texture}" alt="" draggable="false">`;
  const color = unknown ? '#40525a' : colors[item.grade - 1];
  if (item.grade >= 7 && !unknown) {
    const gradient = `rarity-spectrum-${++artSequence}`;
    return `<svg class="spectrum-art${item.grade === 8 ? ' ex-art' : ''}" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="${gradient}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff99ba"/><stop offset=".23" stop-color="#f5d27d"/><stop offset=".46" stop-color="#88e8b2"/><stop offset=".68" stop-color="#79d4f5"/><stop offset="1" stop-color="#cb97ff"/></linearGradient></defs><g fill="url(#${gradient})" fill-opacity=".28" stroke="url(#${gradient})" stroke-width="2.5" stroke-linejoin="miter">${shapes[item.shape]}</g></svg>`;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true" style="--item-color:${color}"><g fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="2.5" stroke-linejoin="miter" color="${color}">${shapes[item.shape]}</g></svg>`;
}
// The gradient is masked by the same PNG alpha / SVG paths as the visible item.
export function lootArt(item) {
  const art = itemSVG(item);
  if (item.grade < 7) return art;
  const silhouette = art.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ').replace('fill-opacity=".28"','fill-opacity="1"');
  const mask = item.texture || `data:image/svg+xml,${encodeURIComponent(silhouette)}`;
  return `<span class="loot-spectrum-art" style="--loot-mask:url('${mask}')"><span class="loot-spectrum-glow glow-far" aria-hidden="true"><span class="loot-spectrum-mask"></span></span><span class="loot-spectrum-glow glow-near" aria-hidden="true"><span class="loot-spectrum-mask"></span></span><span class="loot-spectrum-glow glow-core" aria-hidden="true"><span class="loot-spectrum-mask"></span></span>${art}</span>`;
}
export function crateSVG(tier, large = false) {
  return `<img data-container-tier="${tier}" class="crate-svg container-art ${large ? 'large' : ''}" src="./assets/containers/container-${tier}-v2.png" alt="${tier === 0 ? '井盖' : `${tier}级宝箱`}" draggable="false">`;
}
