import {Vector4} from 'three';

// Atlas order: violet, peach, blue, mint, coral, indigo; each is an independent cloud component.
export const CLOUD_LAYERS=[
  {name:'left-violet', side:-1, x:.04, y:1.01, width:.94, height:.62, delay:.06, duration:.72},
  {name:'right-peach', side:1, x:.96, y:1.01, width:.94, height:.62, delay:.16, duration:.76},
  {name:'left-blue', side:-1, x:-.08, y:.54, width:.66, height:.64, delay:0, duration:.64},
  {name:'right-mint', side:1, x:1.08, y:.54, width:.66, height:.64, delay:.1, duration:.68},
  {name:'left-coral', side:-1, x:.02, y:-.02, width:1.1, height:.72, delay:.27, duration:.78},
  {name:'right-indigo', side:1, x:.98, y:-.02, width:1.1, height:.72, delay:.39, duration:.84},
];

export function createCloudEntrance(){
  const poses=CLOUD_LAYERS.map(()=>new Vector4());
  return {
    poses,
    update({phase,age,quiet}){
      CLOUD_LAYERS.forEach((layer,index)=>{
        const progress=phase===0?0:phase>1||quiet?1:Math.max(0,Math.min(1,(age-layer.delay)/layer.duration));
        const eased=1-Math.pow(1-progress,3);
        // Only x changes: both banks enter horizontally, with no vertical drop.
        const offset=layer.side*(1-eased)*(layer.width+.3);
        poses[index].set(layer.x+offset,layer.y,layer.width,layer.height);
      });
    },
  };
}
