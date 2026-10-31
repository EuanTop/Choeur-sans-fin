import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {createNestedWorld} from './lantern/world.ts';
import {createWater} from './lantern/water.ts';
import {createLighting} from './lantern/lighting.ts';
import {phase} from './lantern/materials.ts';
import {zoomPose,TAU} from './lantern/cycle.ts';
import type {ArtState} from './state.ts';

export async function createArtwork(){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=1.05;
 renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.info.autoReset=false;
 const errors:string[]=[];renderer.debug.onShaderError=(gl,program,vs,fs)=>errors.push((gl.getProgramInfoLog(program)||'')+(gl.getShaderInfoLog(vs)||'')+(gl.getShaderInfoLog(fs)||''));
 const scene=new T.Scene();scene.background=new T.Color('#21102f');scene.fog=new T.Fog('#21102f',60,180);const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.22;room.dispose();pmrem.dispose();
 const camera=new T.PerspectiveCamera(44,.75,.035,350);
 const world=createNestedWorld(scene),water=createWater(scene);scene.add(water.mesh);const lighting=createLighting(scene);
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
 const bloom=new UnrealBloomPass(new T.Vector2(600,800),.28,.48,.85);composer.addPass(bloom);const output=new OutputPass();composer.addPass(output);const aa=new ShaderPass(FXAAShader);composer.addPass(aa);
 let width=0,height=0,lastTime=0,frameMs=0,frameCount=0;
 return {canvas:renderer.domElement,
  render(time:number,w:number,h:number,state:ArtState){
   const start=performance.now();lastTime=time;renderer.info.reset();renderer.shadowMap.needsUpdate=true;
   if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);composer.setSize(w,h);aa.uniforms.resolution!.value.set(1/w,1/h);water.resize(w,h);}
   const zoom=world.update(time,state.motion);phase.value=zoom.u*TAU;water.update(phase.value,state.wind);lighting.update(time,state.light);
   const angle=T.MathUtils.degToRad(state.camera*.25);camera.position.set(.5,6,30).applyAxisAngle(new T.Vector3(0,1,0),angle);camera.lookAt(0,4.5,-4);
   camera.aspect=w/h;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);composer.render(0);
   if(errors.length)throw Error('GLSL compilation failed: '+errors.join('\n'));
   frameCount++;frameMs=performance.now()-start;
  },
  diagnostics(){return {title:'Inside the Lantern',frameMs,frameCount,shaderErrors:errors,zoom:zoomPose(lastTime),recursiveLevels:world.levels.map(l=>({index:l.index,scale:l.group.getWorldScale(new T.Vector3()).x})),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};},
  dispose(){const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}if((o instanceof T.PointLight||o instanceof T.DirectionalLight||o instanceof T.SpotLight)&&o.shadow)o.shadow.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());water.dispose();environment.dispose();bloom.dispose();aa.dispose();output.dispose();composer.dispose();renderer.dispose();}
 };
}
