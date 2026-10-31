import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export const sphere=new T.SphereGeometry(1,28,20);
const detailSphere=new T.SphereGeometry(1,12,8);
export const box=new RoundedBoxGeometry(1,1,1,3,.07);
export const material=(color:string,roughness=.72)=>new T.MeshStandardMaterial({color,roughness});
export function plaster(color:string){
 const m=material(color,1);
 m.onBeforeCompile=s=>{
  s.vertexShader='varying vec3 vStone;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStone=(modelMatrix*vec4(position,1.)).xyz;');
  s.fragmentShader='varying vec3 vStone;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float broad=sin(vStone.x*2.3+sin(vStone.y*1.4))*sin(vStone.z*2.7+vStone.y*.8);
   float grain=fract(sin(dot(floor(vStone*95.),vec3(127.1,311.7,74.7)))*43758.5453);
   diffuseColor.rgb*=1.+broad*.055+(grain-.5)*.012;
  `);
 };m.customProgramCacheKey=()=> 'soft-plaster-v1';return m;
}
export function ellipsoid(parent:T.Object3D,mat:T.Material,scale:number[],pos:number[]=[0,0,0]){
 const m=new T.Mesh(Math.max(...scale)<.30?detailSphere:sphere,mat);m.scale.set(scale[0]!,scale[1]!,scale[2]!);m.position.set(pos[0]!,pos[1]!,pos[2]!);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
export function block(parent:T.Object3D,mat:T.Material,scale:number[],pos:number[]=[0,0,0]){
 const m=new T.Mesh(box,mat);m.scale.set(scale[0]!,scale[1]!,scale[2]!);m.position.set(pos[0]!,pos[1]!,pos[2]!);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
export function rod(parent:T.Object3D,a:T.Vector3,b:T.Vector3,r:number,mat:T.Material){
 const delta=b.clone().sub(a),m=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),7),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());parent.add(m);return m;
}
export function curveLine(parent:T.Object3D,points:T.Vector3[],radius:number,mat:T.Material){const c=new T.CatmullRomCurve3(points);const mesh=new T.Mesh(new T.TubeGeometry(c,24,radius,6,false),mat);parent.add(mesh);return mesh;}

/** Batch architectural detail, preserving subtrees with articulated hinges. */
export function batchStatic(root:T.Group){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert();
 const groups=new Map<string,{material:T.Material;geometry:T.BufferGeometry[];cast:boolean;receive:boolean}>();
 const removed:T.Mesh[]=[];
 root.traverse(o=>{
  if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh||Array.isArray(o.material))return;
  let p:T.Object3D|null=o;while(p&&p!==root){if(p.userData.dynamic)return;p=p.parent;}
  if(o.userData.dynamic)return;
  let geo=o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld));
  if(geo.index)geo=geo.toNonIndexed();
  for(const key of Object.keys(geo.attributes))if(!['position','normal','uv'].includes(key))geo.deleteAttribute(key);
  if(!geo.attributes.uv)geo.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(geo.attributes.position!.count*2),2));
  const key=o.material.uuid+':'+o.castShadow+':'+o.receiveShadow;
  if(!groups.has(key))groups.set(key,{material:o.material,geometry:[],cast:o.castShadow,receive:o.receiveShadow});
  groups.get(key)!.geometry.push(geo);removed.push(o);
 });
 removed.forEach(o=>o.removeFromParent());
 for(const value of groups.values()){
  const geometry=mergeGeometries(value.geometry,false);value.geometry.forEach(g=>g.dispose());if(!geometry)throw Error('Architectural batch failed');
  const m=new T.Mesh(geometry,value.material);m.castShadow=value.cast;m.receiveShadow=value.receive;root.add(m);
 }
}
