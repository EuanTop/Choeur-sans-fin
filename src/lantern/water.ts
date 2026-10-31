import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';

export function createWater(scene:T.Scene){
 const water=new Reflector(new T.PlaneGeometry(600,600),{textureWidth:768,textureHeight:1024,multisample:2,clipBias:.003,shader:{name:'Violet water / amber architecture',uniforms:{color:{value:new T.Color(0x39234f)},tDiffuse:{value:null},textureMatrix:{value:null},uPhase:{value:0},uWind:{value:1}},vertexShader:`uniform mat4 textureMatrix;varying vec4 reflection;varying vec3 world;varying float viewDepth;void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;viewDepth=-(viewMatrix*p).z;reflection=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D tDiffuse;uniform float uPhase,uWind;varying vec4 reflection;varying vec3 world;varying float viewDepth;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 void main(){vec2 p=world.xz,orbit=vec2(cos(uPhase),sin(uPhase));float wave=sin(p.y*5.7+sin(p.x*.8+uPhase)*2.+uPhase*5.);
  vec2 uv=reflection.xy/reflection.w;uv+=vec2(wave,sin(p.x*4.2+p.y*2.+uPhase*3.))*.0030*uWind;
  uv+=vec2(noise(p*1.8+orbit)-.5,noise(p*1.5-orbit)-.5)*.0010*uWind;
  vec2 spread=vec2(.0020,.0016);vec3 refl=texture2D(tDiffuse,uv).rgb*.50+texture2D(tDiffuse,uv+spread).rgb*.25+texture2D(tDiffuse,uv-spread).rgb*.25;
  float slow=noise(p*.18+orbit*.2);vec3 base=mix(vec3(.018,.005,.060),vec3(.055,.012,.10),slow);
  vec3 col=mix(base,refl,.70);float glint=pow(.5+.5*sin(p.y*9.+noise(p*.6+orbit)*5.+uPhase*6.),20.)*smoothstep(.55,.80,noise(vec2(p.x*1.9,p.y*.5)+orbit));
  col+=vec3(.15,.045,.22)*glint*.06*uWind;col*=.89+.11*noise(p*vec2(1.2,3.8)+orbit);col=mix(col,vec3(.025,.008,.04),smoothstep(45.,130.,viewDepth));gl_FragColor=vec4(col,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`}});
 const original=water.onBeforeRender;
 water.onBeforeRender=function(...args){const hidden:T.Object3D[]=[];scene.traverse(o=>{if(o instanceof T.Mesh&&o.visible&&!Array.isArray(o.material)&&o.material.userData.noReflection){hidden.push(o);o.visible=false;}});try{original.apply(this,args);}finally{hidden.forEach(o=>o.visible=true);}};
 water.name='Single shared water plane';water.rotation.x=-Math.PI/2;water.position.y=.002;
 const material=water.material as T.ShaderMaterial;
 return {mesh:water,update(phase:number,wind:number){material.uniforms.uPhase!.value=phase;material.uniforms.uWind!.value=wind;},resize(w:number,h:number){water.getRenderTarget().setSize(w,h);},dispose(){water.dispose();}};
}
