import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createTown} from './town.ts';
import {createActors} from './actors.ts';
import {createReveal} from './reveal.ts';
import {storyAt} from './story.ts';
import type {ArtState} from './state.ts';

export async function createArtwork(){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(1);renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=1.12;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
 const errors:string[]=[];renderer.debug.onShaderError=(gl,_program,vs,fs)=>{errors.push((gl.getShaderInfoLog(vs)||'')+(gl.getShaderInfoLog(fs)||''));};
 const scene=new T.Scene();scene.background=new T.Color('#302342');scene.fog=new T.Fog('#302342',21,50);
 const camera=new T.PerspectiveCamera(38,.75,.1,90);
 const pmrem=new T.PMREMGenerator(renderer),environment=new RoomEnvironment();const env=pmrem.fromScene(environment,.04);scene.environment=env.texture;scene.environmentIntensity=.24;environment.dispose();pmrem.dispose();
 scene.add(new T.HemisphereLight('#e4cfea','#51406e',.62));
 const key=new T.DirectionalLight('#ffe3bb',1.9);key.position.set(-5,11,9);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-13;key.shadow.camera.right=13;key.shadow.camera.top=15;key.shadow.camera.bottom=-13;key.shadow.normalBias=.025;key.shadow.bias=-.0002;scene.add(key);
 const fill=new T.DirectionalLight('#bda6fa',.8);fill.position.set(8,5,-5);scene.add(fill);
 const rim=new T.DirectionalLight('#ffaf68',1.4);rim.position.set(-4,3,-8);scene.add(rim);
 const town=createTown(scene),actors=await createActors(scene),reveal=createReveal(renderer,camera);
 const targets=Array.from({length:4},()=>new T.WebGLRenderTarget(600,800,{type:T.HalfFloatType,samples:2}));
 const maskMat=new T.MeshBasicMaterial({color:'#ffffff',side:T.DoubleSide});
 const composite=new T.Scene(),quadCamera=new T.Camera();
 const uniforms={outer:{value:targets[0]!.texture},inner:{value:targets[1]!.texture},mask:{value:targets[2]!.texture},duckMask:{value:targets[3]!.texture},fluid:{value:reveal.texture},amount:{value:0}};
 const mat=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`
  varying vec2 vUv;uniform sampler2D outer,inner,mask,duckMask,fluid;uniform float amount;
  void main(){
   vec3 a=texture2D(outer,vUv).rgb,b=texture2D(inner,vUv).rgb;
   float flow=1.-texture2D(fluid,vUv).r;
   float inside=texture2D(mask,vUv).r;
   float visibility=smoothstep(.05,.65,flow)*amount*inside*texture2D(duckMask,vUv).r;
   vec3 col=mix(a,b,visibility);
   float seam=4.*visibility*(1.-visibility)*inside*amount;
   col+=vec3(.20,.105,.025)*seam*.24;
   gl_FragColor=vec4(col,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`});const quad=new T.Mesh(new T.PlaneGeometry(2,2),mat);composite.add(quad);
 let width=0,height=0,frameCount=0,frameMs=0;
 return {canvas:renderer.domElement,
  render(t:number,w:number,h:number,state:ArtState){
   const begin=performance.now();if(w!==width||h!==height){width=w;height=h;renderer.setSize(w,h,false);targets.forEach(target=>target.setSize(w,h));town.water.getRenderTarget().setSize(Math.min(w,1536),Math.min(h,2048));}
   const p=storyAt(t),angle=state.camera*Math.PI/180;
   const far=new T.Vector3(3.3,8.9,18.9),near=new T.Vector3(2.4,7.1,14.9);camera.position.copy(far).lerp(near,p.close*.45).applyAxisAngle(new T.Vector3(0,1,0),angle);
   camera.aspect=w/h;camera.lookAt(new T.Vector3(.0,1.6,-.4).lerp(new T.Vector3(p.x*.35,1.4,1.6),p.close*.5));camera.updateProjectionMatrix();camera.updateMatrixWorld();
   actors.update(t,state);town.update(t,state.wind,state.light);actors.paper.emissiveIntensity=.12+state.light*p.reveal*.4;
   reveal.update(t,w/h);uniforms.fluid.value=reveal.texture;uniforms.amount.value=p.reveal*state.reveal;
   renderer.shadowMap.autoUpdate=true;actors.setPass(false);renderer.setRenderTarget(targets[0]!);renderer.render(scene,camera);
   renderer.shadowMap.autoUpdate=false;
   if(uniforms.amount.value>.001){
    actors.setPass(true);renderer.setRenderTarget(targets[1]!);renderer.render(scene,camera);actors.setPass(false);
    const bg=scene.background;scene.background=new T.Color('#000000');scene.overrideMaterial=maskMat;camera.layers.set(1);
    renderer.setRenderTarget(targets[2]!);renderer.render(scene,camera);
    actors.setPass(true);camera.layers.set(2);renderer.setRenderTarget(targets[3]!);renderer.render(scene,camera);actors.setPass(false);
    camera.layers.set(0);scene.overrideMaterial=null;scene.background=bg;
   }
   renderer.setRenderTarget(null);renderer.render(composite,quadCamera);renderer.shadowMap.autoUpdate=true;
   if(errors.length)throw Error('Shader failure: '+errors.join('\n'));frameCount++;frameMs=performance.now()-begin;
  },
  diagnostics(){return {frameMs,frameCount,shaderErrors:errors,actors:5,model:'/models/swan.glb',title:'Duck Feet'};},
  dispose(){const geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh){geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);}});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());targets.forEach(t=>t.dispose());reveal.dispose();town.water.dispose();env.dispose();mat.dispose();quad.geometry.dispose();renderer.dispose();}
 };
}
