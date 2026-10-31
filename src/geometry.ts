import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export const sphere=new T.SphereGeometry(1,28,20);
export const box=new RoundedBoxGeometry(1,1,1,3,.07);
export const material=(color:string,roughness=.72)=>new T.MeshStandardMaterial({color,roughness});
export function ellipsoid(parent:T.Object3D,mat:T.Material,scale:number[],pos:number[]=[0,0,0]){
 const m=new T.Mesh(sphere,mat);m.scale.set(scale[0]!,scale[1]!,scale[2]!);m.position.set(pos[0]!,pos[1]!,pos[2]!);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
export function block(parent:T.Object3D,mat:T.Material,scale:number[],pos:number[]=[0,0,0]){
 const m=new T.Mesh(box,mat);m.scale.set(scale[0]!,scale[1]!,scale[2]!);m.position.set(pos[0]!,pos[1]!,pos[2]!);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
export function rod(parent:T.Object3D,a:T.Vector3,b:T.Vector3,r:number,mat:T.Material){
 const delta=b.clone().sub(a),m=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),7),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());parent.add(m);return m;
}
export function curveLine(parent:T.Object3D,points:T.Vector3[],radius:number,mat:T.Material){const c=new T.CatmullRomCurve3(points);const mesh=new T.Mesh(new T.TubeGeometry(c,24,radius,6,false),mat);parent.add(mesh);return mesh;}
