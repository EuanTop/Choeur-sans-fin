import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export const roundedBox=new RoundedBoxGeometry(1,1,1,2,.055);
export function box(parent:T.Object3D,mat:T.Material,size:number[],position:number[]){
 const m=new T.Mesh(roundedBox,mat);m.scale.set(size[0]!,size[1]!,size[2]!);m.position.set(position[0]!,position[1]!,position[2]!);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
export function arch(w:number,h:number){const p=new T.Shape();p.moveTo(-w/2,0);p.lineTo(w/2,0);p.lineTo(w/2,h-w/2);p.absarc(0,h-w/2,w/2,0,Math.PI,false);p.closePath();return p;}
export function archWall(width:number,height:number,openingWidth:number,openingHeight:number,depth=.7){
 const s=new T.Shape();s.moveTo(-width/2,0);s.lineTo(width/2,0);s.lineTo(width/2,height);s.lineTo(-width/2,height);s.closePath();
 const hole=arch(openingWidth,openingHeight).getPoints(40).map(v=>new T.Vector2(v.x,v.y+.02));s.holes.push(new T.Path(hole));
 return new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,steps:1});
}
export function archRim(width:number,height:number,thickness=.16,depth=.20){
 const p=arch(width+thickness*2,height+thickness);p.holes.push(new T.Path(arch(width,height).getPoints(40)));
 return new T.ExtrudeGeometry(p,{depth,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2});
}
export function ribbon(points:T.Vector3[],width:number){
 const pos:number[]=[],uv:number[]=[],idx:number[]=[];
 points.forEach((p,i)=>{const tangent=points[Math.min(i+1,points.length-1)]!.clone().sub(points[Math.max(0,i-1)]!);const normal=new T.Vector3(tangent.z,0,-tangent.x).normalize();for(const s of [-1,1]){const v=p.clone().addScaledVector(normal,s*width/2);pos.push(v.x,v.y,v.z);uv.push((s+1)/2,i/(points.length-1));}if(i<points.length-1){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}});
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
/** Batch static surfaces by material; dynamic and instanced geometry stay separate. */
export function batch(root:T.Group){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert();const buckets=new Map<string,{mat:T.Material;geos:T.BufferGeometry[];cast:boolean;receive:boolean}>(),remove:T.Mesh[]=[];
 root.traverse(o=>{if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh||Array.isArray(o.material))return;let parent:T.Object3D|null=o;while(parent&&parent!==root){if(parent.userData.dynamic)return;parent=parent.parent;}
  let g=o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld));if(g.index)g=g.toNonIndexed();for(const a of Object.keys(g.attributes))if(!['position','normal','uv'].includes(a))g.deleteAttribute(a);if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position!.count*2),2));
  const key=o.material.uuid+o.castShadow+o.receiveShadow;if(!buckets.has(key))buckets.set(key,{mat:o.material,geos:[],cast:o.castShadow,receive:o.receiveShadow});buckets.get(key)!.geos.push(g);remove.push(o);
 });
 remove.forEach(m=>m.removeFromParent());for(const b of buckets.values()){const geometry=mergeGeometries(b.geos,false);b.geos.forEach(g=>g.dispose());if(!geometry)throw Error('Could not batch lantern architecture');const m=new T.Mesh(geometry,b.mat);m.castShadow=b.cast;m.receiveShadow=b.receive;root.add(m);}
}
