import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {material} from './geometry.ts';

/** Original 28/29 October model; merge by material to keep room residents cheap. */
export async function swanFactory(){
 const gltf=await new GLTFLoader().loadAsync('/models/swan.glb');
 gltf.scene.updateMatrixWorld(true);
 const parts:Record<string,T.BufferGeometry[]>={body:[],left:[],right:[],bill:[],dark:[]};
 gltf.scene.traverse(o=>{
  if(!(o instanceof T.Mesh))return;
  const key=o.name.startsWith('dark_')?'dark':o.name.startsWith('beak_')?'bill':o.name.startsWith('wing_left')?'left':o.name.startsWith('wing_right')?'right':'body';
  let geo=o.geometry.clone().applyMatrix4(o.matrixWorld);
  if(geo.index)geo=geo.toNonIndexed();
  for(const name of Object.keys(geo.attributes))if(!['position','normal'].includes(name))geo.deleteAttribute(name);
  parts[key]!.push(geo);
 });
 const geometries=Object.fromEntries(Object.entries(parts).map(([key,geos])=>{
  const merged=mergeGeometries(geos,false)!;geos.forEach(g=>g.dispose());return [key,merged];
 }));
 const white=material('#fff3dc'),orange=material('#e38a36'),dark=material('#291b39');
 return ()=>{
  const root=new T.Group();root.name='indoor-swan';
  const wings:T.Group[]=[];
  const poseUniforms={uHeadYaw:{value:0},uHeadPitch:{value:0}};
  const deformation=`uniform float uHeadYaw,uHeadPitch;
   mat3 ry(float a){return mat3(cos(a),0.,-sin(a),0.,1.,0.,sin(a),0.,cos(a));}
   mat3 rx(float a){return mat3(1.,0.,0.,0.,cos(a),sin(a),0.,-sin(a),cos(a));}
   float headWeight(vec3 p){return smoothstep(.65,1.20,p.y)*smoothstep(.15,.72,p.z);}
   vec3 articulate(vec3 p){float w=headWeight(p);return mix(p,vec3(0.,.73,.64)+ry(uHeadYaw)*rx(uHeadPitch)*(p-vec3(0.,.73,.64)),w);}
  `;
  for(const [key,geo] of Object.entries(geometries)){
   const mat=(key==='bill'?orange:key==='dark'?dark:white).clone();
   if(key!=='left'&&key!=='right'){
    mat.onBeforeCompile=s=>{Object.assign(s.uniforms,poseUniforms);s.vertexShader=deformation+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','vec3 transformed=articulate(position);');s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>','vec3 objectNormal=mix(normal,ry(uHeadYaw)*rx(uHeadPitch)*normal,headWeight(position));');};
    mat.customProgramCacheKey=()=> 'resident-neck-v1';
   }
   const m=new T.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;
   if(key!=='left'&&key!=='right'){
    const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});depth.onBeforeCompile=s=>{Object.assign(s.uniforms,poseUniforms);s.vertexShader=deformation+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','vec3 transformed=articulate(position);');};m.customDepthMaterial=depth;
   }
   if(key==='left'||key==='right'){
    const side=key==='left'?-1:1,pivot=new T.Group();pivot.position.set(side*.33,.39,-.10);m.position.copy(pivot.position).negate();pivot.add(m);root.add(pivot);wings.push(pivot);
   }else root.add(m);
  }
  return {root,wings,pose(yaw:number,pitch:number){poseUniforms.uHeadYaw.value=yaw;poseUniforms.uHeadPitch.value=pitch;}};
 };
}
export type SwanMaker=Awaited<ReturnType<typeof swanFactory>>;
