import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {SimplifyModifier} from 'three/addons/modifiers/SimplifyModifier.js';
import {phase} from './materials.ts';
import {fitHallPoint,hallDerivatives} from './mouth-fit.ts';

export const choirMotion={value:1};
export const choirEnergy={value:.30};
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

// A common phrase, with small offsets within each voice group. Everything repeats in 32 s.
export function choirPose(p:number,offset:number,motion=1){
 const t=p+offset*.009,breath=Math.sin(t*8),phrase=(1-Math.cos(t*4))*.5;
 return {breath:breath*.016*motion,head:(-.18-.14*phrase+Math.sin(t*8)*.055)*motion,wing:Math.min(1.35,(.12+.78*phrase+.07*phrase*Math.sin(t*64))*motion)};
}
export function createChoir(parts:SwanParts,singers:Singer[]){
 const root=new T.Group();root.name='Arcade swan choir';root.userData.dynamic=true;
 const matrices=singers.map(s=>{
  const p=new T.Vector3(0,.35,.35).applyMatrix4(s.matrix),q=fitHallPoint(p);
  const [dx,dy,dz]=hallDerivatives(p) as [T.Vector3,T.Vector3,T.Vector3];
  const localForward=new T.Vector3(0,0,1).transformDirection(s.matrix);
  const forward=dx.clone().multiplyScalar(localForward.x).addScaledVector(dy,localForward.y).addScaledVector(dz,localForward.z).normalize();
  const up=new T.Vector3(0,1,0),right=up.clone().cross(forward).normalize();forward.copy(right).cross(up).normalize();
  return new T.Matrix4().makeBasis(right,up,forward).scale(new T.Vector3(1.8,1.8,1.8)).setPosition(q);
 });
 for(const [key,source] of Object.entries(parts)){
  const geometry=source.clone();geometry.setAttribute('aChoirSection',new T.InstancedBufferAttribute(new Float32Array(singers.map(s=>s.row*2+(s.side>0?1:0))),1));geometry.setAttribute('aSinger',new T.InstancedBufferAttribute(new Float32Array(singers.map(s=>s.row*.7+s.bay*.21+s.side*.18)),1));
  const color=key==='bill'?'#eda14e':key==='dark'?'#3b2344':'#fff1d5';
  const material=new T.MeshStandardMaterial({color,roughness:.68,emissive:key==='dark'?'#000000':'#ad7862',emissiveIntensity:.12});
  const wing=key==='left'?-1:key==='right'?1:0;
  const deformation=`
   uniform float uPhase,uChoirMotion,uChoirEnergy,uSectionEnergy[6];attribute float aSinger,aChoirSection;
   mat3 choirX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
   mat3 choirY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
   mat3 choirZ(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}
   float singerTime(){return uPhase+aSinger*.009;}
   float phrase(){return clamp(uSectionEnergy[int(aChoirSection)]+.025*sin(singerTime()*8.),0.,1.);}
   float headWeight(vec3 p){return smoothstep(.65,1.20,p.y)*smoothstep(.15,.72,p.z);}
   mat3 wingRotation(){float f=phrase();float a=min(1.35,(.12+.78*f+.07*f*sin(singerTime()*64.))*uChoirMotion);return choirZ(${wing.toFixed(1)}*a*.85)*choirY(${(-wing).toFixed(1)}*a*.50);}
   mat3 headRotation(){return choirX((-.18-.14*phrase()+sin(singerTime()*8.)*.055)*uChoirMotion);}
   vec3 choirPosition(vec3 p){
    ${wing?`vec3 pivot=vec3(${(wing*.33).toFixed(2)},.39,-.10);p=pivot+wingRotation()*(p-pivot);`:`p=mix(p,vec3(0.,.73,.64)+headRotation()*(p-vec3(0.,.73,.64)),headWeight(p));`}
    p.y*=1.+sin(singerTime()*8.)*.016*uChoirMotion;return p;
   }
   vec3 choirNormal(vec3 n,vec3 p){${wing?'n=wingRotation()*n;':'n=mix(n,headRotation()*n,headWeight(p));'}n.y/=1.+sin(singerTime()*8.)*.016*uChoirMotion;return normalize(n);}
  `;
  const inject=(shader:T.WebGLProgramParametersWithUniforms)=>{
   shader.uniforms.uPhase=phase;shader.uniforms.uChoirMotion=choirMotion;shader.uniforms.uChoirEnergy=choirEnergy;shader.uniforms.uSectionEnergy=choirSections;
   shader.vertexShader=deformation+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=choirPosition(position);').replace('#include <beginnormal_vertex>','vec3 objectNormal=choirNormal(normal,position);');
  };
  material.onBeforeCompile=inject;material.customProgramCacheKey=()=> 'choir-phrase-v2-'+key;
  const mesh=new T.InstancedMesh(geometry,material,singers.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;
  const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});depth.onBeforeCompile=inject;depth.customProgramCacheKey=()=> 'choir-depth-v2-'+key;mesh.customDepthMaterial=depth;
  // Point lights are intentionally unshadowed. Keep matching deformation for future changes.
  const distance=new T.MeshDistanceMaterial();distance.onBeforeCompile=inject;distance.customProgramCacheKey=()=> 'choir-distance-v2-'+key;mesh.customDistanceMaterial=distance;
  root.add(mesh);
 }
 root.userData.singers=singers.length;return root;
}
