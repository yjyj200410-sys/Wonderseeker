const paths = [
  './assets/home-ui/background-home-no-character.png',
  './assets/backgrounds/chinese-cartoon-v2.png',
  './assets/backgrounds/nordic-cartoon-v1.png',
  './assets/backgrounds/egyptian-cartoon-v1.png',
];
const root = document.createElement('div');
root.id = 'scene-background';root.setAttribute('aria-hidden','true');
root.innerHTML = '<div class="scene-background-layer scene-background-base"></div><div class="scene-background-layer scene-background-next"></div>';
document.body.prepend(root);
const base=root.firstElementChild, next=root.lastElementChild;
base.style.backgroundImage=`url('${paths[0]}')`;
const ready = await Promise.all(paths.map(async path => {
  const img=new Image();img.src=path;
  try { await img.decode();return path; } catch { return null; }
}));
const available=ready.filter(Boolean);
if(available.length){
  base.style.backgroundImage=`url('${available[0]}')`;
  document.body.classList.add('scenic-background-ready');
  let index=0, changing=false;
  setInterval(()=>{
    if(document.hidden||!document.body.classList.contains('home-active')||changing||available.length<2)return;
    changing=true;index=(index+1)%available.length;
    next.classList.add('resetting');next.style.opacity='0';
    next.style.backgroundImage=`url('${available[index]}')`;
    void next.offsetWidth;
    next.classList.remove('resetting');next.style.opacity='1';
    setTimeout(()=>{
      base.style.backgroundImage=`url('${available[index]}')`;
      next.classList.add('resetting');next.style.opacity='0';
      changing=false;
    },1800);
  },10000);
}
