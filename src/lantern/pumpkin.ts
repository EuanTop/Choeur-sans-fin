import * as T from 'three';
import {arch,batch} from './geometry.ts';
import {plaster,luminous,lightField} from './materials.ts';

export const PUMPKIN={radius:8,height:6,centreY:5,depth:4.5,thickness:1.0};
export function skinPoint(x:number,y:number,inner=false){
 const {radius:r,height:h,centreY:c,depth:d}=PUMPKIN;
 const z=d*Math.sqrt(Math.max(0,1-(x/r)**2-((y-c)/h)**2));
 const angle=Math.atan2(x,z),rib=1+.085*Math.cos(angle*10);
 return new T.Vector3(x*rib,y,z*rib-(inner?PUMPKIN.thickness:0));
}
function skinNormal(x:number,y:number){
 const e=.002,dx=skinPoint(x+e,y).sub(skinPoint(x-e,y)),dy=skinPoint(x,y+e).sub(skinPoint(x,y-e));
 return dx.cross(dy).normalize();
}
function eye(side:number){
 const p=new T.Shape(),x=side*4.25,y=8.20;
 p.moveTo(x-1.02,y-.10);p.quadraticCurveTo(x-.90,y+1.26,x+.06,y+1.29);p.quadraticCurveTo(x+.95,y+1.11,x+1.05,y-.10);p.quadraticCurveTo(x,y+.20,x-1.02,y-.10);p.closePath();return p;
}
export function pumpkinOpenings(){const mouth=new T.Shape(arch(8.2,7.70).getPoints(72).map(v=>new T.Vector2(v.x,v.y-.14)));return [mouth,eye(-1),eye(1)];}
function frontGeometry(inner=false){
 const {radius:r,height:h,centreY:c}=PUMPKIN;
 const shape=new T.Shape();shape.absellipse(0,c,r,h,0,Math.PI*2,false,0);
 for(const opening of pumpkinOpenings())shape.holes.push(new T.Path(opening.getPoints(60)));
 const flat=new T.ShapeGeometry(shape,100),p=flat.attributes.position!,index=flat.index!;
 const positions:number[]=[],normals:number[]=[],uv:number[]=[];
 function triangle(a:T.Vector2,b:T.Vector2,c:T.Vector2,depth=0){
  const lengths=[a.distanceToSquared(b),b.distanceToSquared(c),c.distanceToSquared(a)],long=Math.max(...lengths);
  if(long>.22&&depth<13){const e=lengths.indexOf(long);if(e===0){const m=a.clone().add(b).multiplyScalar(.5);triangle(a,m,c,depth+1);triangle(m,b,c,depth+1);}else if(e===1){const m=b.clone().add(c).multiplyScalar(.5);triangle(a,b,m,depth+1);triangle(a,m,c,depth+1);}else{const m=c.clone().add(a).multiplyScalar(.5);triangle(a,b,m,depth+1);triangle(m,b,c,depth+1);}return;}
  for(const v of (inner?[c,b,a]:[a,b,c])){const q=skinPoint(v.x,v.y,inner),n=skinNormal(v.x,v.y).multiplyScalar(inner?-1:1);positions.push(q.x,q.y,q.z);normals.push(n.x,n.y,n.z);uv.push(v.x/r*.5+.5,(v.y-PUMPKIN.centreY)/h*.5+.5);}
 }
 for(let i=0;i<index.count;i+=3){const v=[0,1,2].map(j=>new T.Vector2(p.getX(index.getX(i+j)),p.getY(index.getX(i+j))));triangle(v[0]!,v[1]!,v[2]!);}
 flat.dispose();const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return g;
}
function cutWalls(){
 const positions:number[]=[],indices:number[]=[];
 for(const opening of pumpkinOpenings()){
  const points=opening.getPoints(100);
  for(let i=0;i<points.length-1;i++){
   const a=points[i]!,b=points[i+1]!,oa=skinPoint(a.x,a.y),ob=skinPoint(b.x,b.y),ia=skinPoint(a.x,a.y,true),ib=skinPoint(b.x,b.y,true),n=positions.length/3;
   for(const q of [oa,ob,ia,ib])positions.push(q.x,q.y,q.z);indices.push(n,n+2,n+1,n+1,n+2,n+3);
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
/** A real hollow, ribbed shell with open eyes and mouth; no portal image texture. */
export function createPumpkin(){
 const root=new T.Group();root.name='Hollow pumpkin / architectural threshold';
 const skin=plaster('#b65b2a',.80);
 const pigment=skin.onBeforeCompile;skin.onBeforeCompile=function(s,r){pigment.call(this,s,r);s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`float mouthEdge=abs(length(vec2(vObject.x/4.12,(vObject.y-3.2)/4.25))-1.);float glow=exp(-mouthEdge*27.)*smoothstep(-.2,.9,vObject.y);outgoingLight+=vec3(1.15,.34,.045)*glow*.65;
 #include <opaque_fragment>`);};skin.customProgramCacheKey=()=> 'pumpkin-rim-v2';skin.emissive.set('#8c2f08');skin.emissiveIntensity=.035;
 const inside=plaster('#f5a04e');inside.emissive.set('#ff9c35');inside.emissiveIntensity=.38;inside.side=T.DoubleSide;
 const edge=luminous('#ffaf57',.60);edge.side=T.DoubleSide;
 const front=new T.Mesh(frontGeometry(),skin);front.castShadow=true;front.receiveShadow=true;root.add(front);
 const lining=new T.Mesh(frontGeometry(true),inside);root.add(lining);
 const walls=new T.Mesh(cutWalls(),edge);root.add(walls);
 const eyeGlow=lightField('#ffca76','#ee7c2c',1.6);
 for(const side of [-1,1]){const g=new T.ShapeGeometry(eye(side),32),p=g.attributes.position!,uv=g.attributes.uv!;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),v=skinPoint(x,y);p.setXYZ(i,v.x,y,v.z-PUMPKIN.thickness-.18);uv.setXY(i,(x-side*4.25)/2.1+.5,(y-8.1)/1.4);}g.computeVertexNormals();root.add(new T.Mesh(g,eyeGlow));}
 const backGeo=new T.SphereGeometry(1,112,64,Math.PI,Math.PI);
 const p=backGeo.attributes.position!;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),rib=1+.085*Math.cos(Math.atan2(x,z)*10);p.setXYZ(i,x*8*rib,5+y*6,z*4.5*rib);}backGeo.computeVertexNormals();
 const back=new T.Mesh(backGeo,skin);back.castShadow=false;back.receiveShadow=true;root.add(back);
 const stemCurve=new T.CatmullRomCurve3([new T.Vector3(0,10.75,0),new T.Vector3(-.20,12.1,-.08),new T.Vector3(-1.05,12.85,.06),new T.Vector3(-1.65,12.55,.16)]);
 const stemGeo=new T.TubeGeometry(stemCurve,32,.50,14,false);
 const st=stemGeo.attributes.position!;for(let i=0;i<st.count;i++){const a=Math.atan2(st.getZ(i),st.getX(i)),f=1+.04*Math.cos(a*7);st.setXYZ(i,st.getX(i)*f,st.getY(i),st.getZ(i)*f);}stemGeo.computeVertexNormals();
 const stem=new T.Mesh(stemGeo,plaster('#493149'));stem.castShadow=true;root.add(stem);
 batch(root);return root;
}
