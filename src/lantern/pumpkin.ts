import * as T from 'three';
import {arch,batch} from './geometry.ts';
import {MOUTH,EYES} from './proportions.ts';
import {plaster,luminous,lightField} from './materials.ts';

export const PUMPKIN={radius:8,height:6.4,centreY:5,depth:4.5,thickness:1.0};
/** One continuous lobed surface for both shell halves, with a recessed crown. */
function pumpkinSurface(x:number,y:number,z:number){
 const phi=Math.atan2(x,z),radial=Math.hypot(x,z);
 const groove=Math.pow(.5-.5*Math.cos(phi*8),4);
 const rib=(1+.115*Math.cos(phi*8)-.065*groove)*(1-.045*y*y);
 const crown=.78*Math.exp(-radial*radial/.10)*T.MathUtils.smoothstep(y,.30,.94);
 const base=.12*Math.exp(-radial*radial/.12)*(1-T.MathUtils.smoothstep(y,-.94,-.35));
 return new T.Vector3(x*PUMPKIN.radius*rib,PUMPKIN.centreY+y*PUMPKIN.height-crown+base,z*PUMPKIN.depth*rib);
}
export function skinPoint(x:number,y:number,inner=false){
 const u=x/PUMPKIN.radius,v=(y-PUMPKIN.centreY)/PUMPKIN.height;
 const p=pumpkinSurface(u,v,Math.sqrt(Math.max(0,1-u*u-v*v)));
 if(inner)p.z-=PUMPKIN.thickness;return p;
}
function skinNormal(x:number,y:number){
 const e=.002,dx=skinPoint(x+e,y).sub(skinPoint(x-e,y)),dy=skinPoint(x,y+e).sub(skinPoint(x,y-e));
 return dx.cross(dy).normalize();
}
function eye(side:number){
 const p=new T.Shape(),x=side*EYES.x,y=EYES.y,w=EYES.width/2,h=EYES.height;
 p.moveTo(x-w,y);p.bezierCurveTo(x-w*.80,y+h*.82,x-w*.25,y+h*1.06,x,y+h);p.bezierCurveTo(x+w*.46,y+h*.98,x+w*.86,y+h*.45,x+w,y-.04);p.bezierCurveTo(x+w*.38,y+h*.43,x-w*.35,y+h*.54,x-w,y);p.closePath();return p;
}
export function pumpkinOpenings(){const mouth=new T.Shape(arch(MOUTH.width,MOUTH.height).getPoints(72).map(v=>new T.Vector2(v.x,v.y+MOUTH.bottom)));return [mouth,eye(-1),eye(1)];}
function frontGeometry(inner=false){
 const {radius:r,height:h,centreY:c}=PUMPKIN;
 const shape=new T.Shape();shape.absellipse(0,c,r,h,0,Math.PI*2,false,0);
 for(const opening of pumpkinOpenings())shape.holes.push(new T.Path(opening.getPoints(60)));
 const flat=new T.ShapeGeometry(shape,100),p=flat.attributes.position!,index=flat.index!;
 const positions:number[]=[],normals:number[]=[],uv:number[]=[];
 function triangle(a:T.Vector2,b:T.Vector2,c:T.Vector2,depth=0){
  const pairs=[[a,b],[b,c],[c,a]] as const;
  const scores=pairs.map(([u,v])=>{const pu=skinPoint(u.x,u.y),pv=skinPoint(v.x,v.y),mid=u.clone().add(v).multiplyScalar(.5),actual=skinPoint(mid.x,mid.y);return Math.max(u.distanceToSquared(v)/.22,pu.distanceToSquared(pv)/.22,actual.distanceToSquared(pu.add(pv).multiplyScalar(.5))/.0004);});
  if(Math.max(...scores)>1&&depth<16){const e=scores.indexOf(Math.max(...scores));if(e===0){const m=a.clone().add(b).multiplyScalar(.5);triangle(a,m,c,depth+1);triangle(m,b,c,depth+1);}else if(e===1){const m=b.clone().add(c).multiplyScalar(.5);triangle(a,b,m,depth+1);triangle(a,m,c,depth+1);}else{const m=c.clone().add(a).multiplyScalar(.5);triangle(a,b,m,depth+1);triangle(m,b,c,depth+1);}return;}
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
 const skin=plaster('#c26a25',.70);
 const pigment=skin.onBeforeCompile;skin.onBeforeCompile=function(s,r){pigment.call(this,s,r);s.fragmentShader=s.fragmentShader.replace('*.012','*.0025').replace('*.004*fine','*.0008*fine');s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float rindAngle=atan(vObject.x/8.,vObject.z/4.5);float furrow=pow(.5-.5*cos(rindAngle*8.),4.);diffuseColor.rgb*=1.-furrow*.12;`);s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`float spring=${MOUTH.bottom+MOUTH.height-MOUTH.width/2};float radius=${MOUTH.width/2};float mouthEdge=vObject.y<spring?abs(abs(vObject.x)-radius):abs(length(vec2(vObject.x,vObject.y-spring))-radius);float glow=exp(-mouthEdge*10.)*smoothstep(-.2,.9,vObject.y);outgoingLight+=vec3(1.15,.34,.045)*glow*.35;
 #include <opaque_fragment>`);};skin.customProgramCacheKey=()=> 'pumpkin-rim-v6';skin.emissive.set('#8c2f08');skin.emissiveIntensity=.035;
 const inside=plaster('#f5a04e');inside.emissive.set('#ff9c35');inside.emissiveIntensity=.38;inside.side=T.DoubleSide;
 const edge=luminous('#ffaf57',.60);edge.side=T.DoubleSide;
 const front=new T.Mesh(frontGeometry(),skin);front.castShadow=true;front.receiveShadow=false;root.add(front);
 const lining=new T.Mesh(frontGeometry(true),inside);root.add(lining);
 const walls=new T.Mesh(cutWalls(),edge);root.add(walls);
 const eyeGlow=lightField('#ffca76','#ee7c2c',1.6);
 // A diffuser sits behind the entire curved aperture. Bending a coarse light
 // mesh onto the rind can put its triangles through the cheek at deep furrows.
 for(const side of [-1,1]){const glow=new T.Mesh(new T.PlaneGeometry(EYES.width*1.45,EYES.height*1.6),eyeGlow);glow.position.set(side*EYES.x,EYES.y+EYES.height*.46,.70);root.add(glow);}
 const backGeo=new T.SphereGeometry(1,112,64,Math.PI,Math.PI);
 const p=backGeo.attributes.position!;
 for(let i=0;i<p.count;i++){const v=pumpkinSurface(p.getX(i),p.getY(i),p.getZ(i));p.setXYZ(i,v.x,v.y,v.z);}backGeo.computeVertexNormals();
 const back=new T.Mesh(backGeo,skin);back.castShadow=false;back.receiveShadow=true;root.add(back);
 // A short tapered, fluted stalk grows out of the indented crown.
 const stemCurve=new T.CatmullRomCurve3([new T.Vector3(0,10.55,0),new T.Vector3(.16,11.35,.04),new T.Vector3(.74,12.10,.13),new T.Vector3(1.02,12.32,.25)]);
 const tubularSegments=48,radialSegments=24,stemGeo=new T.TubeGeometry(stemCurve,tubularSegments,1,radialSegments,false),st=stemGeo.attributes.position!;
 for(let i=0;i<=tubularSegments;i++){
  const t=i/tubularSegments,centre=stemCurve.getPointAt(t),radius=.64*(1-.46*t)+.20*Math.exp(-t*18);
  for(let j=0;j<=radialSegments;j++){const k=i*(radialSegments+1)+j,v=new T.Vector3().fromBufferAttribute(st,k).sub(centre),r=radius*(1+.065*Math.cos(j/radialSegments*Math.PI*16));v.multiplyScalar(r).add(centre);st.setXYZ(k,v.x,v.y,v.z);}
 }
 stemGeo.computeVertexNormals();const stalk=new T.MeshStandardMaterial({color:'#63402a',roughness:.80,emissive:'#2c150c',emissiveIntensity:.025});
 const stem=new T.Mesh(stemGeo,stalk);stem.castShadow=true;stem.receiveShadow=true;root.add(stem);
 const tip=stemCurve.getPointAt(1),tangent=stemCurve.getTangentAt(1),cap=new T.Mesh(new T.CircleGeometry(.64*.54,24),new T.MeshStandardMaterial({color:'#a77748',roughness:.85}));cap.position.copy(tip);cap.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),tangent);root.add(cap);
 batch(root);return root;
}
