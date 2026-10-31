import * as T from 'three';

export const phase={value:0};
export function plaster(color:string,roughness=.86){
 const m=new T.MeshStandardMaterial({color,roughness,metalness:0});
 m.onBeforeCompile=s=>{
  s.vertexShader='varying vec3 vObject;varying float vObjectScale;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvObject=position;vObjectScale=length(modelMatrix[0].xyz);');
  s.fragmentShader=`varying vec3 vObject;varying float vObjectScale;
   float hh(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
   float nn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hh(i),hh(i+vec3(1,0,0)),f.x),mix(hh(i+vec3(0,1,0)),hh(i+vec3(1,1,0)),f.x),f.y),mix(mix(hh(i+vec3(0,0,1)),hh(i+vec3(1,0,1)),f.x),mix(hh(i+vec3(0,1,1)),hh(i+vec3(1,1,1)),f.x),f.y),f.z);}
  `+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float pigment=nn(vObject*2.1)*.68+nn(vObject*17.)*.22+nn(vObject*72.)*.10;
   diffuseColor.rgb*=.96+pigment*.08;
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float footprint=max(length(dFdx(vObject)),length(dFdy(vObject)));
   float fine=1.-smoothstep(.025,.10,footprint);
   float relief=(nn(vObject*4.)*.012+nn(vObject*27.)*.004*fine)*vObjectScale;
   vec3 sigmaX=dFdx(-vViewPosition),sigmaY=dFdy(-vViewPosition);
   vec3 r1=cross(sigmaY,normal),r2=cross(normal,sigmaX);float det=dot(sigmaX,r1);
   normal=normalize(abs(det)*normal-sign(det)*(dFdx(relief)*r1+dFdy(relief)*r2));
  `);
 };
 m.customProgramCacheKey=()=> 'lantern-plaster-v2';return m;
}
export function luminous(color:string,strength=1){
 const m=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:strength,roughness:.65});return m;
}
export function lightField(top:string,bottom:string,strength=1){
 const m=new T.ShaderMaterial({side:T.DoubleSide,uniforms:{uPhase:phase,uTop:{value:new T.Color(top)},uBottom:{value:new T.Color(bottom)},uGain:{value:strength}},vertexShader:`varying vec2 q;
 #include <clipping_planes_pars_vertex>
 void main(){q=uv;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
 #include <clipping_planes_vertex>
 }`,fragmentShader:`varying vec2 q;uniform vec3 uTop,uBottom;uniform float uPhase,uGain;
 #include <clipping_planes_pars_fragment>
 void main(){
 #include <clipping_planes_fragment>
 float f=clamp(q.y,0.,1.);vec3 c=mix(uBottom,uTop,f);c*=uGain*(.96+.04*sin(uPhase*2.+f*.8));gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});return m;
}
