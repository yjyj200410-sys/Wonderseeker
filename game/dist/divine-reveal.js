// Production adapter for the approved coronation preview. One canvas survives each phase.
export function divineFrame(grade,phase,age,time,quiet=false){
 const revealed=phase>=(grade===8?4:3);
 const settle=t=>1-(.76*Math.exp(-Math.max(t,0)*5)+.24*Math.exp(-Math.max(t,0)*.8));
 const extra=grade===8&&revealed?(quiet||age>=6?1:settle(age)):0;
 return {mode:0,phase,age:quiet?6:age,baseAge:revealed?(quiet?6:age):0,time:quiet?4:time,extra,quiet,ordinary:false,isEX:grade===8};
}
export function createDivineReveal(loadRenderer=()=>import('./reveal-lab-gpu.js')){
 let engine,canvas,host,observer,request=0,activation=0,preparing,failed=false;
 let grade=7,phase=0,age=0,time=0,quiet=false,last=0,width=0,height=0;
 function size(w,h){
  w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));
  if(engine&&(w!==width||h!==height)){width=w;height=h;engine.resize(w,h);}
 }
 function resize(){if(host){const r=host.getBoundingClientRect();size(r.width,r.height);}}
 // Allocate and compile while the cover/container is visible, then reuse across drops.
 async function prepare(){
  if(engine)return engine;
  if(failed)return null;
  if(preparing)return preparing;
  preparing=(async()=>{
   try{
    const {createRevealRenderer}=await loadRenderer();
    canvas=document.createElement('canvas');canvas.className='divine-canvas';canvas.setAttribute('aria-hidden','true');
    engine=createRevealRenderer(canvas);
    const r=document.querySelector('#app')?.getBoundingClientRect();
    size(r?.width||innerWidth,r?.height||innerHeight);
    // Warm the full effect (including rune materials), then leave only the background.
    engine.render(divineFrame(8,4,6,0,true));
    engine.render(divineFrame(7,0,0,0,false));
    return engine;
   }catch(error){engine?.dispose();engine=null;canvas?.remove();canvas=null;failed=true;console.error('Divine reveal unavailable',error);return null;}
  })();
  return preparing;
 }
 function tick(now){
  if(!host?.isConnected){request=0;return;}
  const dt=Math.min(.06,Math.max(0,(now-last)/1000));last=now;
  if(!document.hidden){age+=dt;time+=dt;}
  const frame=divineFrame(grade,phase,age,time,quiet);
  engine.render(frame);
  request=requestAnimationFrame(tick);
 }
 function attach(){
  resize();
  // Draw before inserting the canvas, so the browser cannot paint an empty black buffer.
  engine.render(divineFrame(grade,0,0,0,false));
  host.prepend(canvas);observer ||=new ResizeObserver(resize);observer.disconnect();observer.observe(host);
  if(!request){last=performance.now();request=requestAnimationFrame(tick);}
 }
 async function sync(nextHost,next){
  const changed=host!==nextHost;
  host=nextHost;quiet=!!next.quiet;grade=next.grade;
  if(phase!==next.phase){phase=next.phase;age=0;}
  const token=++activation;
  if(!engine)await prepare();
  if(token!==activation||!host?.isConnected)return;
  if(!engine){host.classList.add('divine-fallback');return;}
  if(changed||canvas.parentNode!==host)attach();
 }
 function stop(){
  activation++;cancelAnimationFrame(request);request=0;observer?.disconnect();canvas?.remove();host=null;
  phase=0;age=0;time=0;
 }
 function dispose(){stop();engine?.dispose();engine=null;canvas=null;}
 window.addEventListener('pagehide',dispose);
 return {sync,stop,prepare};
}
