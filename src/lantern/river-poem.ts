import * as T from 'three';
import {POEM_CUES,riverPoemPose,riverPoemText} from '../music/poem.ts';

/** Ink stays ahead of the duck on the water plane, with real perspective and fading. */
export function createRiverPoem(renderer:T.WebGLRenderer){
 const root=new T.Group();root.name='Poem / river surface';
 const lines=POEM_CUES.map(cue=>{
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=256;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='white';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='126px Goudy';ctx.fillText(riverPoemText(cue.text),1024,128,1890);
  const texture=new T.CanvasTexture(canvas);texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const alpha={value:0};
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,uniforms:{uText:{value:texture},uAlpha:alpha,uInk:{value:new T.Color('#f1d6b2')}},vertexShader:`
   varying vec2 vUv;
   void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
  `,fragmentShader:`
   uniform sampler2D uText;uniform float uAlpha;uniform vec3 uInk;varying vec2 vUv;
   void main(){vec2 uv=vUv;
    float ink=texture2D(uText,uv).a;gl_FragColor=vec4(uInk,ink*uAlpha);if(gl_FragColor.a<.004)discard;
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }
  `});
  material.userData.noReflection=true;const mesh=new T.Mesh(new T.PlaneGeometry(6.1,2.3,12,3),material);mesh.rotation.x=-Math.PI/2;mesh.position.y=.032;mesh.renderOrder=4;mesh.visible=false;root.add(mesh);
  return {mesh,alpha,texture};
 });
 return {root,update(time:number){
  lines.forEach((line,i)=>{const p=riverPoemPose(time,i);line.mesh.visible=p.visible;line.alpha.value=p.alpha;line.mesh.position.z=p.z;});
 },diagnostics(){return lines.filter(l=>l.mesh.visible).map(l=>({z:l.mesh.position.z,y:l.mesh.position.y,alpha:l.alpha.value}));},dispose(){lines.forEach(l=>l.texture.dispose());}};
}
