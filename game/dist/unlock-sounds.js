// Timings follow the 3.1-second unlock-arrival and unlock-chain-shatter animations.
export function createUnlockSounds({createAudio=url=>new Audio(url),schedule=setTimeout,cancel=clearTimeout,canPlay=()=>true}={}){
 const cues=[
  {file:'mixkit-arrow-whoosh-1491.wav',at:217,offset:.16,volume:.5},
  {file:'mixkit-wood-hard-hit-2182.wav',at:806,offset:.045,volume:.7},
  {file:'mixkit-metallic-sword-strike-2160.wav',at:2108,offset:.015,volume:.55},
  {file:'mixkit-metal-tool-falling-820.wav',at:2108,offset:0,volume:.38},
 ].map(cue=>{const audio=createAudio(`./assets/audio/${cue.file}`);audio.preload='auto';audio.volume=cue.volume;return {...cue,audio};});
 let timers=[],generation=0;
 function stop(){generation++;for(const timer of timers)cancel(timer);timers=[];for(const {audio} of cues){audio.pause();audio.currentTime=0;}}
 return {
  stop,
  start({reducedMotion=false}={}){
   stop();if(reducedMotion)return;
   const token=generation;
   for(const cue of cues)timers.push(schedule(()=>{
    if(token!==generation||!canPlay())return;
    cue.audio.currentTime=cue.offset;cue.audio.play().catch(()=>{});
   },cue.at));
  },
 };
}
