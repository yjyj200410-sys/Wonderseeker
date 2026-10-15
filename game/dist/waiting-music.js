// Decoded buffers loop continuously without reloading the WAV at its boundary.
export function createWaitingMusic({createContext=()=>new (window.AudioContext||window.webkitAudioContext)(),fetchAudio=url=>fetch(url)}={}){
 let context,source,requested=null,generation=0,unlocked=false;
 const buffers=new Map();
 function stop(){
  generation++;
  if(!source)return;
  const {node,gain}=source,now=context.currentTime;
  source=null;
  if(gain.gain.cancelAndHoldAtTime)gain.gain.cancelAndHoldAtTime(now);
  else{gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(gain.gain.value,now);}
  gain.gain.linearRampToValueAtTime(0,now+.45);
  node.stop(now+.45);
 }
 async function start(token,url){
  try{
   context ||= createContext();
   await context.resume();
   if(!buffers.has(url))buffers.set(url,Promise.resolve(fetchAudio(url)).then(response=>{if(!response.ok)throw new Error('Waiting audio unavailable');return response.arrayBuffer();}).then(bytes=>context.decodeAudioData(bytes)).catch(error=>{buffers.delete(url);throw error;}));
   const buffer=await buffers.get(url);
   if(token!==generation||requested!==url)return;
   const node=context.createBufferSource(),gain=context.createGain();
   node.buffer=buffer;node.loop=true;
   gain.gain.setValueAtTime(0,context.currentTime);
   gain.gain.linearRampToValueAtTime(.35,context.currentTime+.6);
   node.connect(gain);gain.connect(context.destination);
   node.onended=()=>{node.disconnect();gain.disconnect();};source={node,gain};node.start();
  }catch{if(token===generation)requested=null;}
 }
 return {
  unlock(){unlocked=true;if(context)context.resume().catch(()=>{});},
  update(url){if(url===requested)return;stop();requested=url;if(url&&unlocked)start(generation,url);else if(url)requested=null;},
 };
}
