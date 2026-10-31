import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createTown} from './town.ts';
import {createDuck} from './actors.ts';
import {swanFactory} from './swans.ts';
import {storyAt} from './story.ts';
import {bridgePoint} from './bridge-path.ts';
import type {ArtState} from './state.ts';

export async function createArtwork(){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(1);renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=1.0;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.VSMShadowMap;renderer.shadowMap.autoUpdate=false;
 const errors:string[]=[];renderer.debug.onShaderError=(gl,_program,vs,fs)=>{errors.push((gl.getShaderInfoLog(vs)||'')+(gl.getShaderInfoLog(fs)||''));};
 const scene=new T.Scene();scene.background=new T.Color('#413052');scene.fog=new T.Fog('#705371',24,67);
 const sky=new T.Mesh(new T.SphereGeometry(85,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{phase:{value:0}},vertexShader:`varying vec3 skyDirection;void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 skyDirection;uniform float phase;void main(){vec3 n=normalize(skyDirection);float horizon=exp(-pow((n.y+.02)*4.,2.));float haze=sin(n.x*8.+sin(n.z*5.+phase)*.5)*sin(n.y*21.+n.z*4.-phase);vec3 c=mix(vec3(.034,.016,.090),vec3(.18,.095,.21),horizon);c+=haze*.008*horizon;gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}));scene.add(sky);
 const camera=new T.PerspectiveCamera(43,.75,.1,110);
 const pmrem=new T.PMREMGenerator(renderer),environment=new RoomEnvironment(),env=pmrem.fromScene(environment,.04);scene.environment=env.texture;scene.environmentIntensity=.14;environment.dispose();pmrem.dispose();
 scene.add(new T.HemisphereLight('#a28bd1','#312039',.46));
 const moon=new T.DirectionalLight('#afa5ef',.65);moon.position.set(-8,12,-12);scene.add(moon);
 const key=new T.DirectionalLight('#ffdfae',2.15);key.position.set(-7,10,8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.normalBias=.055;key.shadow.bias=-.0002;key.shadow.radius=6;key.shadow.blurSamples=12;Object.assign(key.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:.5,far:45});scene.add(key);
 const warm=new T.SpotLight('#ffc478',18,32,.92,.9,1.5);warm.position.set(-3,6,5);warm.target.position.set(0,.8,0);scene.add(warm,warm.target);
 const fill=new T.DirectionalLight('#cfbce7',.70);fill.position.set(8,6,10);scene.add(fill);
 const swan=await swanFactory(),town=createTown(scene,swan),duck=createDuck(scene);
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
 const ao=new GTAOPass(scene,camera,600,800);ao.updateGtaoMaterial({radius:.20,thickness:.4,distanceFallOff:1.2});ao.updatePdMaterial({radius:5,samples:12});ao.blendIntensity=.28;composer.addPass(ao);
 const bloom=new UnrealBloomPass(new T.Vector2(600,800),.12,.30,1.9);composer.addPass(bloom);composer.addPass(new OutputPass());const aa=new ShaderPass(FXAAShader);composer.addPass(aa);
 let width=0,height=0,frameCount=0,frameMs=0,lastTime=0;
 return {canvas:renderer.domElement,
  render(t:number,w:number,h:number,state:ArtState){
   const begin=performance.now();lastTime=t;renderer.info.autoReset=false;renderer.info.reset();renderer.shadowMap.needsUpdate=true;
   if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);composer.setSize(w,h);ao.setSize(Math.ceil(w/2),Math.ceil(h/2));aa.uniforms.resolution!.value.set(1/w,1/h);town.water.getRenderTarget().setSize(Math.min(w,1280),Math.min(h,1706));}
   const p=storyAt(t),angle=state.camera*Math.PI/180;
   const at=bridgePoint(p.travel);
   camera.position.set(-1.8,4.3,10.4).applyAxisAngle(new T.Vector3(0,1,0),angle);
   camera.aspect=w/h;camera.lookAt(at.x*.80,2.70,-4.5);camera.updateProjectionMatrix();camera.updateMatrixWorld();
   town.update(p.t,state.wind,state.light);duck.update(p.t,state);(sky.material as T.ShaderMaterial).uniforms.phase!.value=p.phase;
   warm.position.x=at.x-3;warm.target.position.set(at.x,at.y+.65,0);
   warm.intensity=18*(.72+.28*(1-p.noticed))*state.light;
   composer.render(0);
   if(errors.length)throw Error('Shader failure: '+errors.join('\n'));frameCount++;frameMs=performance.now()-begin;
  },
  diagnostics(){return {frameMs,frameCount,shaderErrors:errors,title:'Duck Feet',...duck.diagnostics(lastTime),...town.diagnostics(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};},
  dispose(){const geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh){geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);if(o.customDepthMaterial)mats.add(o.customDepthMaterial);if(o.customDistanceMaterial)mats.add(o.customDistanceMaterial);}if((o instanceof T.DirectionalLight||o instanceof T.SpotLight||o instanceof T.PointLight)&&o.shadow)o.shadow.dispose();});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());town.water.dispose();env.dispose();ao.dispose();bloom.dispose();aa.dispose();composer.dispose();renderer.dispose();}
 };
}
