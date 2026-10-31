import * as T from 'three';
import fluidFragment from './shaders/fluid.frag.glsl?raw';
import {storyAt} from './story.ts';
const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
export function createReveal(renderer:T.WebGLRenderer,camera:T.Camera){
 const targets=[0,1].map(()=>new T.WebGLRenderTarget(256,352,{depthBuffer:false}));
 const scene=new T.Scene(),quadCamera=new T.Camera();
 const uniforms={uPrevFluid:{value:targets[0]!.texture},uTrailTexture:{value:null},uAspect:{value:new T.Vector2(1,.75)},uCentre:{value:new T.Vector2()},uPhase:{value:0},uRadius:{value:.05},uWind:{value:.8},uScreenAspect:{value:.75}};
 const material=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms,vertexShader:vertex,fragmentShader:fluidFragment});
 const quad=new T.Mesh(new T.PlaneGeometry(2,2),material);scene.add(quad);
 let current=0,last=-1;
 return {get texture(){return targets[current]!.texture;},update(t:number,aspect:number){
  const step=Math.floor(t*60+1e-6);let start=last+1;
  if(step<last||step-last>50||last<0){
   const old=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha();renderer.setClearColor('#ffffff',1);
   for(const target of targets){renderer.setRenderTarget(target);renderer.clear();}renderer.setClearColor(old,alpha);start=Math.max(0,step-50);current=0;
  }
  uniforms.uScreenAspect.value=aspect;uniforms.uAspect.value.set(1,aspect);
  for(let f=start;f<=step;f++){
   const ft=f/60,p=storyAt(ft);const pos=new T.Vector3(p.x,p.y+.92,p.z).project(camera);
   uniforms.uCentre.value.set(pos.x*.5+.5+Math.sin(ft*3)*.017,pos.y*.5+.5);
   uniforms.uRadius.value=.035+p.reveal*.09;uniforms.uPhase.value=ft*.7;uniforms.uPrevFluid.value=targets[current]!.texture;
   const next=1-current;renderer.setRenderTarget(targets[next]!);renderer.render(scene,quadCamera);current=next;
  }
  last=step;renderer.setRenderTarget(null);
 },dispose(){targets.forEach(x=>x.dispose());material.dispose();quad.geometry.dispose();}};
}
