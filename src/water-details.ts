import * as T from 'three';
import {TAU} from './story.ts';
import {canalCentre} from './bridge-path.ts';

export function createWaterDetails(scene:T.Scene){
 const leafShape=new T.Shape();leafShape.moveTo(0,-.10);leafShape.bezierCurveTo(-.13,-.03,-.11,.10,0,.16);leafShape.bezierCurveTo(.11,.10,.13,-.03,0,-.10);
 const leafGeo=new T.ShapeGeometry(leafShape,8),leafMat=new T.MeshStandardMaterial({color:'#cda16c',roughness:.74,side:T.DoubleSide});
 const ringGeo=new T.RingGeometry(.95,1,64),rings:T.Mesh<T.RingGeometry,T.MeshBasicMaterial>[]=[],leaves:T.Mesh[]=[];
 for(let i=0;i<9;i++){
  const leaf=new T.Mesh(leafGeo,leafMat);leaf.rotation.x=-Math.PI/2;leaf.scale.setScalar(.5+(i%3)*.18);scene.add(leaf);leaves.push(leaf);
  const ring=new T.Mesh(ringGeo,new T.MeshBasicMaterial({color:'#d3b48b',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;scene.add(ring);rings.push(ring);
 }
 return {update(time:number,wind:number){
  const phase=time/32*TAU;
  leaves.forEach((leaf,i)=>{
   const z=-23+i*3.1+1.1*Math.sin(phase+i*.7),x=canalCentre(z)+(i%2?1:-1)*(1.80+.20*Math.sin(phase*2+i));
   leaf.position.set(x,-.23+.008*Math.sin(phase*5+i),z);leaf.rotation.z=.15*Math.sin(phase*2+i)+.3*Math.sin(phase+i);leaf.rotation.x=-Math.PI/2+.025*Math.sin(phase*3+i)*wind;
   const age=(time/32*2+i*.31)%1,r=.10+age*.76;
   const ring=rings[i]!;ring.position.set(x,-.227,z);ring.scale.set(r,r*.58,1);ring.material.opacity=Math.sin(age*Math.PI)*.055*wind;
  });
 }};
}
