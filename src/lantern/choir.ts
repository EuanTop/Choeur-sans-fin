import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {SimplifyModifier} from 'three/addons/modifiers/SimplifyModifier.js';
import {CHOIR_GROUPS,choirSection} from './choir-groups.ts';
import {fitHallPoint,hallDerivatives} from './mouth-fit.ts';

export const choirMotion={value:1};
export const choirPoses={value:Array.from({length:6},()=>new T.Vector4(.04,0,0,0))};
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
 const matrices=singers.map(s=>{
  const p=new T.Vector3(0,.35,.35).applyMatrix4(s.matrix),q=fitHallPoint(p);
  const [dx,dy,dz]=hallDerivatives(p) as [T.Vector3,T.Vector3,T.Vector3];
  const localForward=new T.Vector3(0,0,1).transformDirection(s.matrix);
  const forward=dx.clone().multiplyScalar(localForward.x).addScaledVector(dy,localForward.y).addScaledVector(dz,localForward.z).normalize();
  const up=new T.Vector3(0,1,0),right=up.clone().cross(forward).normalize();forward.copy(right).cross(up).normalize();
  return new T.Matrix4().makeBasis(right,up,forward).scale(new T.Vector3(1.8,1.8,1.8)).setPosition(q);
 });
 for(const [key,source] of Object.entries(parts)){
  const geometry=source.clone();
  geometry.setAttribute('aBodyShape',new T.InstancedBufferAttribute(new Float32Array(singers.flatMap(s=>[...CHOIR_GROUPS[choirSection(s.row,s.side)]!.shape])),3));
  geometry.setAttribute('aChoirSection',new T.InstancedBufferAttribute(new Float32Array(singers.map(s=>choirSection(s.row,s.side))),1));
  const color=key==='bill'?'#eda14e':key==='dark'?'#3b2344':'#fff1d5';
  const material=new T.MeshStandardMaterial({color,roughness:.68,emissive:key==='dark'?'#000000':'#ad7862',emissiveIntensity:.12});
  const wing=key==='left'?-1:key==='right'?1:0;
  const deformation=`
   uniform float uChoirMotion;uniform vec4 uSectionPose[6];attribute float aChoirSection;attribute vec3 aBodyShape;
   mat3 choirX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
   mat3 choirY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}
   mat3 choirZ(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}
   vec4 pose(){return uSectionPose[int(aChoirSection)];}
   float wingWeight(vec3 p){return 1.-smoothstep(-.15,.45,p.z);}
   float headWeight(vec3 p){return smoothstep(.48,1.25,p.y)*smoothstep(-.28,.05,p.z);}
   mat3 wingRotation(){vec4 q=pose();return choirZ(${wing.toFixed(1)}*min(1.48,q.x*uChoirMotion))*choirY(${(-wing).toFixed(1)}*min(1.02,q.y*uChoirMotion));}
   mat3 headRotation(){return choirX(clamp(pose().z*uChoirMotion,-.62,.22));}
   mat3 bodyRotation(){return choirX(-min(1.48,pose().x*uChoirMotion)*.028);}
   float breath(){return 1.+max(0.,pose().x-.04)*.012*uChoirMotion;}
   vec3 choirPosition(vec3 p){
    ${wing?`vec3 pivot=vec3(${(wing*.28).toFixed(2)},.60,.30);p=mix(p,pivot+wingRotation()*(p-pivot),wingWeight(p));`:`p=mix(p,vec3(0.,.62,.48)+headRotation()*(p-vec3(0.,.62,.48)),headWeight(p));`}
    p.y*=breath();p=bodyRotation()*p;p.y+=pose().w*min(1.4,uChoirMotion);return p*aBodyShape;
   }
   vec3 choirNormal(vec3 n,vec3 p){${wing?'n=mix(n,wingRotation()*n,wingWeight(p));':'n=mix(n,headRotation()*n,headWeight(p));'}n.y/=breath();return normalize((bodyRotation()*n)/aBodyShape);}
  `;
  const inject=(shader:T.WebGLProgramParametersWithUniforms)=>{
   shader.uniforms.uChoirMotion=choirMotion;shader.uniforms.uSectionPose=choirPoses;
   shader.vertexShader=deformation+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=choirPosition(position);').replace('#include <beginnormal_vertex>','vec3 objectNormal=choirNormal(normal,position);');
  };
  material.onBeforeCompile=inject;material.customProgramCacheKey=()=> 'choir-group-v1-'+key;
  const mesh=new T.InstancedMesh(geometry,material,singers.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();if(mesh.boundingSphere)mesh.boundingSphere.radius+=3;mesh.castShadow=true;mesh.receiveShadow=true;
  const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});depth.onBeforeCompile=inject;depth.customProgramCacheKey=()=> 'choir-group-depth-v1-'+key;mesh.customDepthMaterial=depth;
  // Point lights are intentionally unshadowed. Keep matching deformation for future changes.
  const distance=new T.MeshDistanceMaterial();distance.onBeforeCompile=inject;distance.customProgramCacheKey=()=> 'choir-group-distance-v1-'+key;mesh.customDistanceMaterial=distance;
  root.add(mesh);
 }
 root.userData.singers=singers.length;return root;
}
