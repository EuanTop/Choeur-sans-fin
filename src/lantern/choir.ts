import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {SimplifyModifier} from 'three/addons/modifiers/SimplifyModifier.js';
import {phase} from './materials.ts';
import {fitHallPoint,hallDerivatives} from './mouth-fit.ts';

export const choirMotion={value:1};
export const choirVariation={value:1};
export const choirSections={value:new Float32Array(6).fill(.3)};
export type SwanParts=Record<string,T.BufferGeometry>;
export async function loadSwanParts():Promise<SwanParts>{
 const gltf=await new GLTFLoader().loadAsync('/models/swan.glb');gltf.scene.updateMatrixWorld(true);
 const groups:Record<string,T.BufferGeometry[]>={body:[],left:[],right:[],bill:[],dark:[]};
 gltf.scene.traverse(o=>{if(!(o instanceof T.Mesh))return;
  const key=o.name.startsWith('dark_')?'dark':o.name.startsWith('beak_')?'bill':o.name.startsWith('wing_left')?'left':o.name.startsWith('wing_right')?'right':'body';
  let g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(g.index)g=g.toNonIndexed();for(const a of Object.keys(g.attributes))if(!['position','normal'].includes(a))g.deleteAttribute(a);groups[key]!.push(g);
 });
 const result=Object.fromEntries(Object.entries(groups).map(([key,geos])=>{const merged=mergeGeometries(geos,false)!;geos.forEach(g=>g.dispose());return [key,merged];}));
 const simplify=new SimplifyModifier();
 for(const [key,geometry] of Object.entries(result)){const welded=mergeVertices(geometry);const reduced=await simplify.modify(welded,Math.floor(welded.getAttribute('position').count*.72));welded.dispose();geometry.dispose();result[key]=reduced;}
 gltf.scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});return result;
}
export type Singer={matrix:T.Matrix4;row:number;bay:number;side:number};

export function createChoir(parts:SwanParts,singers:Singer[]){
 const root=new T.Group();root.name='Arcade swan choir';root.userData.dynamic=true;
 const random=(s:Singer,salt:number)=>{const n=Math.sin(s.row*127.1+s.bay*311.7+s.side*74.7+salt*19.19)*43758.5453;return n-Math.floor(n);};
 const matrices=singers.map(s=>{
  const p=new T.Vector3(0,.35,.35).applyMatrix4(s.matrix),q=fitHallPoint(p);
  const [dx,dy,dz]=hallDerivatives(p) as [T.Vector3,T.Vector3,T.Vector3];
  const localForward=new T.Vector3(0,0,1).transformDirection(s.matrix);
  const forward=dx.clone().multiplyScalar(localForward.x).addScaledVector(dy,localForward.y).addScaledVector(dz,localForward.z).normalize();
  const up=new T.Vector3(0,1,0),right=up.clone().cross(forward).normalize();forward.copy(right).cross(up).normalize();
  return new T.Matrix4().makeBasis(right,up,forward).scale(new T.Vector3(1.8,1.8,1.8)).setPosition(q);
 });
 for(const [key,source] of Object.entries(parts)){
  const geometry=source.clone();geometry.setAttribute('aBodyShape',new T.InstancedBufferAttribute(new Float32Array(singers.flatMap(s=>[.93+.14*random(s,1),.915+.17*random(s,2),.95+.10*random(s,3)])),3));geometry.setAttribute('aDynamics',new T.InstancedBufferAttribute(new Float32Array(singers.flatMap(s=>[random(s,4),.82+.34*random(s,5)])),2));geometry.setAttribute('aChoirSection',new T.InstancedBufferAttribute(new Float32Array(singers.map(s=>s.row*2+(s.side>0?1:0))),1));geometry.setAttribute('aSinger',new T.InstancedBufferAttribute(new Float32Array(singers.map(s=>s.row*.7+s.bay*.21+s.side*.18)),1));
  const color=key==='bill'?'#eda14e':key==='dark'?'#3b2344':'#fff1d5';
  const material=new T.MeshStandardMaterial({color,roughness:.68,emissive:key==='dark'?'#000000':'#ad7862',emissiveIntensity:.12});
  const wing=key==='left'?-1:key==='right'?1:0;
  const deformation=`
   uniform float uPhase,uChoirMotion,uChoirVariation,uSectionEnergy[6];attribute float aSinger,aChoirSection;attribute vec2 aDynamics;attribute vec3 aBodyShape;
   mat3 choirX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
   mat3 choirY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
   mat3 choirZ(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}
   float temperament(){return mix(1.,aDynamics.y,uChoirVariation);}
   vec3 bodyShape(){return mix(vec3(1.),aBodyShape,uChoirVariation);}
   float singerTime(){return uPhase+aSinger*.009*uChoirVariation;}
   float phrase(){return clamp(uSectionEnergy[int(aChoirSection)],0.,1.);}
   float wingWeight(vec3 p){return 1.-smoothstep(-.15,.45,p.z);}
   float headWeight(vec3 p){return smoothstep(.48,1.25,p.y)*smoothstep(-.28,.05,p.z);}
   mat3 wingRotation(){float f=sqrt(phrase());float beat=.5-.5*cos(uPhase*32.+aSinger*.25*uChoirVariation);float a=min(1.48,(.10+f*(.58+.78*beat))*uChoirMotion*temperament());return choirZ(${wing.toFixed(1)}*a)*choirY(${(-wing).toFixed(1)}*min(1.02,(.10+.90*f)*uChoirMotion));}
   mat3 headRotation(){float f=phrase();float offset=aDynamics.x*6.2831853*uChoirVariation;float rate=2.+floor(aDynamics.x*3.);float bias=(aDynamics.x-.5)*.80*uChoirVariation;float turn=bias+.62*uChoirVariation*sin(uPhase*rate+offset)+.14*f*sin(singerTime()*4.);float nod=.14*sin(uPhase*16.+offset)*(.25+.75*f);float pitch=-.06-.32*f+(aDynamics.x-.5)*.32*uChoirVariation+nod;return choirY(clamp(turn*uChoirMotion*temperament(),-.95,.95))*choirX(clamp(pitch*uChoirMotion,-.72,.28));}
   mat3 bodyRotation(){float f=phrase();return choirZ(sin(singerTime()*4.+aDynamics.x*uChoirVariation)*.055*(.35+.65*f)*uChoirMotion*temperament())*choirX(sin(singerTime()*8.)*.06*f*uChoirMotion);}
   float hop(){float t=fract(uPhase/6.28318530718*8.+floor(aDynamics.x*4.)*.25*uChoirVariation);return t<.14?pow(sin(3.14159265359*t/.14),2.)*.14*smoothstep(.12,.70,phrase())*min(1.4,uChoirMotion):0.;}
   vec3 choirPosition(vec3 p){
    ${wing?`vec3 pivot=vec3(${(wing*.28).toFixed(2)},.60,.30);p=mix(p,pivot+wingRotation()*(p-pivot),wingWeight(p));`:`p=mix(p,vec3(0.,.62,.48)+headRotation()*(p-vec3(0.,.62,.48)),headWeight(p));`}
    p.y*=1.+sin(singerTime()*8.)*.028*uChoirMotion;p=bodyRotation()*p;p.y+=hop();return p*bodyShape();
   }
   vec3 choirNormal(vec3 n,vec3 p){${wing?'n=mix(n,wingRotation()*n,wingWeight(p));':'n=mix(n,headRotation()*n,headWeight(p));'}n.y/=1.+sin(singerTime()*8.)*.028*uChoirMotion;return normalize((bodyRotation()*n)/bodyShape());}
  `;
  const inject=(shader:T.WebGLProgramParametersWithUniforms)=>{
   shader.uniforms.uPhase=phase;shader.uniforms.uChoirMotion=choirMotion;shader.uniforms.uChoirVariation=choirVariation;shader.uniforms.uSectionEnergy=choirSections;
   shader.vertexShader=deformation+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=choirPosition(position);').replace('#include <beginnormal_vertex>','vec3 objectNormal=choirNormal(normal,position);');
  };
  material.onBeforeCompile=inject;material.customProgramCacheKey=()=> 'choir-phrase-v7-'+key;
  const mesh=new T.InstancedMesh(geometry,material,singers.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();if(mesh.boundingSphere)mesh.boundingSphere.radius+=3;mesh.castShadow=true;mesh.receiveShadow=true;
  const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});depth.onBeforeCompile=inject;depth.customProgramCacheKey=()=> 'choir-depth-v7-'+key;mesh.customDepthMaterial=depth;
  // Point lights are intentionally unshadowed. Keep matching deformation for future changes.
  const distance=new T.MeshDistanceMaterial();distance.onBeforeCompile=inject;distance.customProgramCacheKey=()=> 'choir-distance-v7-'+key;mesh.customDistanceMaterial=distance;
  root.add(mesh);
 }
 root.userData.singers=singers.length;return root;
}
