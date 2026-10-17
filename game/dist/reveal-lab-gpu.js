import * as THREE from 'three';
import {revealPalettes} from './reveal-palettes.js';
import { EffectComposer } from './vendor/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/three/addons/postprocessing/RenderPass.js';
import { OutputPass } from './vendor/three/addons/postprocessing/OutputPass.js';
import {createCloudEntrance} from './reveal-cloud-layers.js';

// References and attribution: reveal-lab-sources.md. Three.js is distributed with its MIT license.
// The GPU point sprites, additive layers and bloom follow the referenced Three.js / Codrops techniques.
const noise = `
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,v=0.;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){v+=a*n2(p);p=m*p+3.7;a*=.5;}return v;}
vec3 spectrum(float t){return .55+.45*cos(6.28318*(t+vec3(0.,.34,.67)));}
float halo(float d,float sharp){return exp(-abs(d)*sharp);}
float settle(float t){return 1.-(.76*exp(-max(t,0.)*5.)+.24*exp(-max(t,0.)*.8));}
`;

export function createRevealRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias:false, alpha:false, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .9;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1,1,1,-1,.01,50);
  camera.position.z = 8;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  composer.addPass(new OutputPass());
  const cloudEntrance=createCloudEntrance();
  const uniforms = {
    time:{value:0}, phase:{value:0}, age:{value:0}, mode:{value:0}, extra:{value:0},
    palette0:{value:new THREE.Vector3(...revealPalettes[0].colors[0])},
    palette1:{value:new THREE.Vector3(...revealPalettes[0].colors[1])},
    palette2:{value:new THREE.Vector3(...revealPalettes[0].colors[2])},
    palette3:{value:new THREE.Vector3(...revealPalettes[0].colors[3])},
    transition0:{value:new THREE.Vector2(.12,.49)},
    transition1:{value:new THREE.Vector2(.44,.79)},
    transition2:{value:new THREE.Vector2(.73,1.08)},
    purpleVariant:{value:0}, backgroundStyle:{value:0}, coreStyle:{value:0}, aspect:{value:1}, energy:{value:0}, release:{value:0}, burst:{value:0}, exburst:{value:0},
    quiet:{value:0}, ordinary:{value:0}, baseAge:{value:0}, extraCharge:{value:0},
    backgroundMap:{value:null}, hasBackground:{value:0},
    backgroundBrightness:{value:1},
    cloudMap:{value:null}, hasClouds:{value:0}, cloudOn:{value:1}, showClouds:{value:0}, cloudRects:{value:cloudEntrance.poses},
  };
  const cloudTexture=new THREE.Texture();
  const backgroundFiles={current:'divine-rainbow-clouds-v4.png',a:'divine-cartoon-background-alt-a.png',b:'divine-cartoon-background-alt-b.png'};
  const backgroundTextures=new Map();
  let selectedBackground='current';
  function setBackground(key){
    if(!backgroundFiles[key])return;
    selectedBackground=key;
    uniforms.cloudOn.value=key==='current'?1:0;
    // Current rainbow is procedural; only alternative preview plates need a texture.
    if(key==='current'){uniforms.hasBackground.value=0;return;}
    const cached=backgroundTextures.get(key);
    if(cached){if(cached.image?.complete){uniforms.backgroundMap.value=cached;uniforms.hasBackground.value=1;}return;}
    const texture=new THREE.TextureLoader().load(
      new URL('./assets/ui/'+backgroundFiles[key],import.meta.url).href,
      loaded=>{if(selectedBackground===key){uniforms.backgroundMap.value=loaded;uniforms.hasBackground.value=1;}},
      undefined,error=>{backgroundTextures.delete(key);console.error('Generated background could not load',error);},
    );
    texture.colorSpace=THREE.SRGBColorSpace;
    backgroundTextures.set(key,texture);
  }
  setBackground('current');
  const background = new THREE.ShaderMaterial({
    uniforms, depthWrite:false, depthTest:false,
    vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader:`precision highp float;
    varying vec2 vUv;
    uniform float time,phase,age,mode,extra,aspect,energy,release,burst,exburst,quiet,ordinary,extraCharge;
    uniform sampler2D backgroundMap;
    uniform float hasBackground,backgroundBrightness,coreStyle,backgroundStyle,purpleVariant;
    uniform vec3 palette0,palette1,palette2,palette3;
    uniform vec2 transition0,transition1,transition2;
    uniform sampler2D cloudMap;
    uniform float hasClouds,cloudOn,showClouds;
    uniform vec4 cloudRects[6];
    ${noise}
    void main(){
      vec2 p=(vUv-.5)*vec2(aspect,1.)*2.;
      float r=length(p),a=atan(p.y,p.x),t=time;
      float noise=fbm(p*2.8+vec2(t*.035,-t*.026));
      // Generated artwork is a static plate; the sacred reveal remains an independent overlay.
      vec2 imageUv=vUv;
      if(aspect>1.5)imageUv.y=(imageUv.y-.5)*(1.5/aspect)+.5;
      else imageUv.x=(imageUv.x-.5)*(aspect/1.5)+.5;
      vec3 base=mix(vec3(.18,.24,.36),texture2D(backgroundMap,imageUv).rgb*.72,hasBackground);
      vec3 cloudContribution=vec3(0.);
      if(cloudOn>.5){
        // Same deep-crimson colors, independently varied mapping and surface treatment.
        vec2 gradientUv=vUv;
        vec2 gp=vec2((vUv.x-.5)*aspect,vUv.y-.5);
        float drift=t*.025;
        if(backgroundStyle>2.5&&backgroundStyle<3.5){
          gradientUv+=vec2(sin(vUv.y*7.+drift)*.13,sin(vUv.x*6.-drift)*.10);
        }
        if(backgroundStyle>3.5&&backgroundStyle<4.5){
          float twist=2.7*exp(-dot(gp,gp)*2.7);
          float cs=cos(twist),sn=sin(twist);
          vec2 spun=mat2(cs,-sn,sn,cs)*gp;
          gradientUv=vec2(spun.x/max(aspect,.1),spun.y)+.5;
        }
        if(backgroundStyle>6.5&&backgroundStyle<7.5){
          vec2 warp=vec2(fbm(gp*2.4+vec2(drift,0.)),fbm(gp*2.4+vec2(8.,-drift)))-.5;
          gradientUv+=warp*.65;
          gradientUv+=vec2(fbm(gp*3.+warp*2.+4.)-.5)*.16;
        }
        float diagonal=clamp(gradientUv.x*.48+gradientUv.y*.72,0.,1.);
        if(backgroundStyle>4.5&&backgroundStyle<5.5){
          diagonal=clamp(1.08-length(gp*vec2(.85,1.15))*.95,0.,1.);
        }
        if(backgroundStyle>5.5&&backgroundStyle<6.5){
          float steps=diagonal*5.;
          diagonal=(floor(steps)+smoothstep(.40,.68,fract(steps)))/5.;
        }
        if(backgroundStyle>7.5&&backgroundStyle<8.5)diagonal=vUv.x*1.1;
        if(backgroundStyle>8.5&&backgroundStyle<9.5)diagonal=vUv.y*1.1;
        if(backgroundStyle>9.5&&backgroundStyle<10.5){
          diagonal=clamp(1.12-length((vUv-vec2(.94,.92))*vec2(.80,.88)),0.,1.1);
        }
        if(backgroundStyle>10.5&&backgroundStyle<11.5){
          float angle=atan(gp.y,gp.x);
          diagonal=(.5+.5*cos(angle-.75))*1.1;
          diagonal=mix(.62,diagonal,smoothstep(0.,.16,length(gp)));
        }
        if(backgroundStyle>11.5&&backgroundStyle<12.5){
          diagonal=pow(max(0.,1.-abs(vUv.x-.5)*2.),.8)*1.1;
        }
        if(backgroundStyle>12.5&&backgroundStyle<13.5){
          diagonal=clamp(1.12-(abs(vUv.x-.5)+abs(vUv.y-.5))*1.25,0.,1.1);
        }
        vec3 violet=palette0;
        vec3 rose=palette1;
        vec3 orange=palette2;
        vec3 yellow=palette3;
        base=mix(violet,rose,smoothstep(transition0.x,transition0.y,diagonal));
        base=mix(base,orange,smoothstep(transition1.x,transition1.y,diagonal));
        base=mix(base,yellow,smoothstep(transition2.x,transition2.y,diagonal));
        if(backgroundStyle>13.5){
          vec2 blend=smoothstep(vec2(.04),vec2(.96),vUv);
          base=mix(mix(palette0,palette1,blend.x),mix(palette2,palette3,blend.x),blend.y);
        }
        // Purple is an extra local color, laid over the unchanged four-color original.
        float purpleMask=0.;
        if(purpleVariant>.5&&purpleVariant<1.5)purpleMask=1.-smoothstep(.025,.26,diagonal);
        if(purpleVariant>1.5&&purpleVariant<2.5)purpleMask=exp(-pow((diagonal-.30)/.105,2.))*.85;
        if(purpleVariant>2.5)purpleMask=exp(-dot((vUv-vec2(.08,.14))*vec2(2.8,2.6),(vUv-vec2(.08,.14))*vec2(2.8,2.6)))*.9;
        base=mix(base,vec3(.95,.56,.085),purpleMask);
        if(backgroundStyle>.5&&backgroundStyle<1.5){
          float grain=hash(floor(vUv*vec2(aspect,1.)*780.))-.5;
          base*=1.+grain*.24;
        }
        if(backgroundStyle>1.5&&backgroundStyle<2.5){
          float cloudNoise=fbm(gp*4.+vec2(drift,-drift));
          float cloudFine=fbm(gp*9.-vec2(drift));
          base*=.67+cloudNoise*.62+cloudFine*.18;
        }
        if(hasClouds>.5&&showClouds>.5){
          for(int i=0;i<6;i++){
            vec4 rect=cloudRects[i];
            vec2 local=(vUv-rect.xy)/rect.zw+.5;
            if(local.x>0.&&local.x<1.&&local.y>0.&&local.y<1.){
              if(i<2)local.y=1.-local.y;
              float column=mod(float(i),2.);
              float row=2.-floor(float(i)/2.);
              vec2 atlasUv=(vec2(column,row)+clamp(local,vec2(.004),vec2(.996)))/vec2(2.,3.);
              vec4 cloud=texture2D(cloudMap,atlasUv);
              float alpha=smoothstep(.7,.98,cloud.a);
              base=mix(base,cloud.rgb*.72,alpha);
              cloudContribution=mix(cloudContribution,cloud.rgb*.72,alpha);
            }
          }
        }
      }
      base=mix(base,vec3(.46,.004,.02)+vec3(.4,.015,.01)*exp(-r*r),ordinary);
      if(cloudOn>.5||ordinary>.5){
        // Large, sparse diamonds remain in the same hue as the underlying color.
        vec2 patternUv=vec2(vUv.x*aspect,vUv.y)*3.2;
        patternUv.x+=floor(patternUv.y)*.43;
        vec2 cell=fract(patternUv)-.5;
        float diamond=1.-smoothstep(.18,.195,abs(cell.x)+abs(cell.y));
        base*=1.+diamond*.075;
      }
      // Normalize each screen axis so the corner shading works in portrait and landscape.
      float cornerDistance=length((vUv-.5)*2.);
      float vignette=ordinary>.5?1.-smoothstep(.35,2.6,r)*.06:
        1.-smoothstep(.30,1.35,cornerDistance)*.42;
      // Desaturate only the exposed backdrop; preserve the clouds' own color and brightness.
      vec3 exposedBase=base-cloudContribution;
      float exposedLuma=dot(exposedBase,vec3(.2126,.7152,.0722));
      float backgroundSaturation=mix(.32,1.,clamp((backgroundBrightness-.25)/.75,0.,1.));
      vec3 dimmedBase=mix(vec3(exposedLuma),exposedBase,backgroundSaturation)*backgroundBrightness;
      vec3 col=(dimmedBase+cloudContribution)*vignette;
      col+= (hash(gl_FragCoord.xy+t)-.5)*.006;
      gl_FragColor=vec4(max(col,vec3(0.)),1.);
    }`,
  });
  const bg=new THREE.Mesh(new THREE.PlaneGeometry(2,2),background);bg.renderOrder=-10;bg.frustumCulled=false;scene.add(bg);

  function resize(width,height){
    renderer.setSize(width,height,false);composer.setSize(width,height);
    uniforms.aspect.value=width/height;
    camera.left=-width/height;camera.right=width/height;camera.updateProjectionMatrix();
  }
  function render(state){
    const {phase=0,age=0,time=0,quiet=false,ordinary=false}=state;
    // Only the approved color background and its diamond texture remain.
    uniforms.backgroundBrightness.value=1;
    uniforms.showClouds.value=0;
    for(const [key,value] of Object.entries({phase,age,time,quiet:quiet?1:0,ordinary:ordinary?1:0}))uniforms[key].value=value;
    composer.render();
  }
  function setPalette(id){
    const palette=revealPalettes.find(p=>p.id===id);
    if(palette){palette.colors.forEach((color,i)=>uniforms['palette'+i].value.fromArray(color));uniforms.backgroundStyle.value=palette.style||0;uniforms.purpleVariant.value=palette.purple||0;(palette.ranges||[[.12,.49],[.44,.79],[.73,1.08]]).forEach((range,i)=>uniforms['transition'+i].value.fromArray(range));}
  }
  return {resize,render,setBackground,setPalette,dispose(){const geometries=new Set(),materials=new Set();scene.traverse(node=>{if(node.geometry)geometries.add(node.geometry);if(node.material)for(const material of (Array.isArray(node.material)?node.material:[node.material]))materials.add(material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());composer.passes.forEach(pass=>pass.dispose?.());composer.dispose();cloudTexture.dispose();backgroundTextures.forEach(texture=>texture.dispose());renderer.dispose();renderer.forceContextLoss();}};
}


