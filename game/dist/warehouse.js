import {sellInventory,exhibited} from './engine.js';
export const itemFootprint = item => item.footprint || (item.grade===8?[3,2]:([[1,1],[1,1],[2,1],[1,2],[2,2],[2,1],[1,3],[1,1],[2,2],[2,3],[1,2],[1,2],[1,1],[1,1],[1,2],[1,1],[2,1],[2,2],[1,1],[2,3]][item.shape]||[1,1]));
export function sellableInstance(state,key){const [id,indexText]=key.split('#'),index=Number(indexText),entry=state.inventory[id];return !!entry&&!entry.locked&&Number.isInteger(index)&&index>=exhibited(state,id)&&index<entry.qty;}
export function sellWarehouseInstances(state,keys){
 const selected=new Set(keys),counts={};
 for(const key of selected){if(!sellableInstance(state,key))throw new Error('选中的物品已锁定、展出或不存在');const id=key.split('#')[0];counts[id]=(counts[id]||0)+1;}
 if(!selected.size)throw new Error('请先勾选物品');
 let next=state;for(const [id,qty] of Object.entries(counts))next=sellInventory(next,id,qty);
 const positions={};for(const [id,entry] of Object.entries(state.inventory)){let newIndex=0;for(let i=0;i<entry.qty;i++){const key=`${id}#${i}`;if(selected.has(key))continue;if(state.warehousePositions?.[key])positions[`${id}#${newIndex}`]=state.warehousePositions[key];newIndex++;}}
 next.warehousePositions=positions;return next;
}
export function packWarehouse(state,items,{tidy=false}={}){
 let rows=10;
 if(!tidy)for(const [key,p] of Object.entries(state.warehousePositions||{})){
  const item=items[key.split('#')[0]],size=item?itemFootprint(item):[1,1];
  rows=Math.max(rows,p.y+Math.max(6,p.rotated?size[0]:size[1]));
 }
 const occupied=Array.from({length:rows},()=>Array(20).fill(false)),placed=[],overflow=[];
 const instances=Object.entries(state.inventory).flatMap(([id,e])=>Array.from({length:e.qty},(_,i)=>({id,key:`${id}#${i}`})));
 instances.sort((a,b)=>{if(tidy){const av=BigInt(state.inventory[a.id].price),bv=BigInt(state.inventory[b.id].price);return av>bv?-1:av<bv?1:a.key.localeCompare(b.key,undefined,{numeric:true});}return Number(!!state.warehousePositions?.[b.key])-Number(!!state.warehousePositions?.[a.key])||a.key.localeCompare(b.key);});
 for(const {id,key} of instances){
  const saved=tidy?null:state.warehousePositions?.[key] || (key.endsWith('#0')?state.warehousePositions?.[id]:null);
  const [baseWidth,baseHeight]=itemFootprint(items[id]);let width=saved?.rotated?baseHeight:baseWidth,height=saved?.rotated?baseWidth:baseHeight,spot;
  if(saved&&saved.x>=0&&saved.y>=0&&saved.x+width<=20&&saved.y+height<=rows){let free=true;for(let dy=0;dy<height;dy++)for(let dx=0;dx<width;dx++)if(occupied[saved.y+dy][saved.x+dx])free=false;if(free)spot={id,x:saved.x,y:saved.y,width,height};}
  for(let y=0;y<rows&&!spot;y++)for(let x=0;x<20&&!spot;x++){
   const candidates=tidy&&baseWidth!==baseHeight?[[baseWidth,baseHeight],[baseHeight,baseWidth]]:[[width,height]];
   for(const [w,h] of candidates){if(x+w>20||y+h>rows)continue;let free=true;for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)if(occupied[y+dy][x+dx])free=false;if(free){width=w;height=h;spot={id,x,y,width,height,...tidy&&w!==baseWidth?{rotated:true}:{}};break;}}
  }
  if(!spot){const y=rows;for(let i=0;i<height;i++)occupied.push(Array(20).fill(false));rows+=height;spot={id,x:0,y,width,height};}spot.key=key;if(saved?.rotated)spot.rotated=true;for(let dy=0;dy<height;dy++)for(let dx=0;dx<width;dx++)occupied[spot.y+dy][spot.x+dx]=true;placed.push(spot);
 }
 rows=Math.max(10,...placed.map(p=>p.y+p.height+3));
 return {rows,placed,overflow};
}
export function tidyWarehouse(state,items){
 const layout=packWarehouse(state,items,{tidy:true});
 const next=structuredClone(state);
 next.warehousePositions=Object.fromEntries(layout.placed.map(p=>[p.key,{x:p.x,y:p.y,...p.rotated?{rotated:true}:{}}]));
 return next;
}
export function warehousePlacementValid(layout,key,x,y,width,height){
 return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x+width<=20&&y+height<=layout.rows&&!layout.placed.some(p=>p.key!==key&&x<p.x+p.width&&x+width>p.x&&y<p.y+p.height&&y+height>p.y);
}
const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
function placementPlan(layout,key,x,y,width,height){
 const source=layout.placed.find(p=>p.key===key),target={x,y,width,height};
 const inside=p=>Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.y>=0&&p.x+p.width<=20&&p.y+p.height<=layout.rows;
 if(!source||!inside(target))return null;
 const collisions=layout.placed.filter(p=>p.key!==key&&overlaps(target,p));
 if(!collisions.length)return {target};
 if(collisions.length!==1)return null;
 const other=collisions[0],replacement={...other,x:source.x,y:source.y};
 if(!inside(replacement)||overlaps(target,replacement))return null;
 if(layout.placed.some(p=>p.key!==key&&p.key!==other.key&&(overlaps(target,p)||overlaps(replacement,p))))return null;
 return {target,swap:replacement};
}
export function warehouseDropTarget(layout,key,fx,fy,rotated=false,autoRotate=true){
 const item=layout.placed.find(p=>p.key===key);if(!item)return null;
 const baseWidth=item.rotated?item.height:item.width,baseHeight=item.rotated?item.width:item.height;
 const candidate=r=>{const width=r?baseHeight:baseWidth,height=r?baseWidth:baseHeight,x=Math.floor(fx-(width-1)/2),y=Math.floor(fy-(height-1)/2),plan=placementPlan(layout,key,x,y,width,height);return{x,y,width,height,rotated:r,valid:!!plan,...plan?.swap?{swapKey:plan.swap.key}:{}};};
 const primary=candidate(rotated);if(primary.valid||!autoRotate||baseWidth===baseHeight)return primary;
 const alternate=candidate(!rotated);return alternate.valid?alternate:primary;
}
export function moveWarehouseItem(state,items,key,x,y,rotated){
 const layout=packWarehouse(state,items),item=layout.placed.find(p=>p.key===key);
 const rotate=item&&rotated!==undefined&&!!item.rotated!==rotated;
 const width=rotate?item.height:item?.width,height=rotate?item.width:item?.height;
 if(!item||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x+width>20||y+height>layout.rows)throw new Error('物品不能移出仓库');
 const plan=placementPlan(layout,key,x,y,width,height);
 if(!plan)throw new Error('这个位置已被占用，换位后空间不足');
 const next=structuredClone(state);
 next.warehousePositions=Object.fromEntries(layout.placed.map(p=>{const position=p.key===key?{x,y,rotated:rotated??!!p.rotated}:p.key===plan.swap?.key?plan.swap:p;return[p.key,{x:position.x,y:position.y,...position.rotated?{rotated:true}:{}}];}));
 return next;
}
