// Identical approved colors and diagonal gradient; vary only transition positions.
const colors=[[.12,.004,.025],[.43,.008,.035],[.83,.035,.018],[1.,.48,.045]];
export const revealPalettes=[
 {id:'crimson-deep',name:'01 · 深绯原版',note:'基准：保留原版颜色、占比与斜向渐变',style:0,colors},
 {id:'ratio-deep',name:'02 · 深绯占比增加',note:'扩大暗红区域，红橙金收向右上；保持原有颜色与亮度',style:0,colors,ranges:[[.36,.75],[.70,1.00],[.94,1.12]]},
 {id:'ratio-red',name:'03 · 红色占比增加',note:'更早进入浓红，更晚进入朱橙，画面以红色为主',style:0,colors,ranges:[[.04,.28],[.64,.88],[.88,1.12]]},
 {id:'ratio-orange',name:'04 · 朱橙占比增加',note:'提前进入朱橙，金色延后，扩大中间橙色区域',style:0,colors,ranges:[[.10,.34],[.28,.55],[.88,1.14]]},
 {id:'ratio-gold',name:'05 · 金色占比增加',note:'金色从画面中部开始铺开，深绯和红色保留在左下',style:0,colors,ranges:[[.04,.28],[.24,.53],[.46,.82]]},
 {id:'ratio-red-gold',name:'06 · 红金为主',note:'压缩深绯与朱橙区域，突出浓红和金色的对比',style:0,colors,ranges:[[.025,.20],[.55,.72],[.63,.88]]},
 {id:'ratio-deep-gold',name:'07 · 深绯金为主',note:'加大暗红与金色两端，中间红橙过渡更集中',style:0,colors,ranges:[[.34,.58],[.49,.68],[.59,.86]]},
 {id:'ratio-balanced',name:'08 · 四色均衡',note:'四种颜色分布更均衡，各自区域更清楚，保持柔和接缝',style:0,colors,ranges:[[.17,.39],[.46,.68],[.75,.97]]},
];
