import * as T from 'three';
import {MOUTH,HALL_SCALE} from './proportions.ts';
import {RATIO} from './cycle.ts';
import {skinPoint,PUMPKIN} from './pumpkin.ts';

// Hall dimensions, recursive scale and the carved arch share one attachment curve.
export function mouthSection(y:number){
 const spring=MOUTH.bottom+MOUTH.height-MOUTH.width/2;
 const height=T.MathUtils.clamp(y*HALL_SCALE.y*RATIO,0,MOUTH.bottom+MOUTH.height-.4);
 const x=Math.sqrt(Math.max(.8,(MOUTH.width/2)**2-Math.max(0,height-spring)**2));
 const margin=.55-.12*T.MathUtils.smoothstep(height,spring,spring+1.5);
 const width=(x-margin)/(HALL_SCALE.x*RATIO*12.2);
 const front=(skinPoint(x,height).z-PUMPKIN.thickness+.12+3.6)/.2;
 return {width,front};
}
export function fitHallPoint(p:T.Vector3){
 const {width,front}=mouthSection(p.y),w=T.MathUtils.smoothstep(p.z,-12,34);
 const depthBlend=.28+.72*(1-T.MathUtils.smoothstep(p.y*HALL_SCALE.y*RATIO,0,1.5));
 return new T.Vector3(p.x*(1+w*(width-1)),p.y,p.z+w*((front-34)*depthBlend-1.2));
}
export function hallDerivatives(p:T.Vector3){
 const e=.005;
 return [new T.Vector3(e,0,0),new T.Vector3(0,e,0),new T.Vector3(0,0,e)].map(d=>fitHallPoint(p.clone().add(d)).sub(fitHallPoint(p.clone().sub(d))).multiplyScalar(.5/e));
}
export function fitHallNormal(p:T.Vector3,n:T.Vector3){
 const [x,y,z]=hallDerivatives(p) as [T.Vector3,T.Vector3,T.Vector3];
 return y.clone().cross(z).multiplyScalar(n.x).add(z.clone().cross(x).multiplyScalar(n.y)).add(x.clone().cross(y).multiplyScalar(n.z)).normalize();
}
/** Tessellate long architectural faces before bending, preserving smooth normals and UVs. */
export function fitHallGeometry(source:T.BufferGeometry){
 const g=source.index?source.toNonIndexed():source;
 const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv');
 const positions:number[]=[],normals:number[]=[],uvs:number[]=[];
 type Vertex={p:T.Vector3;n:T.Vector3;uv:T.Vector2};
 const middle=(a:Vertex,b:Vertex):Vertex=>({p:a.p.clone().add(b.p).multiplyScalar(.5),n:a.n.clone().add(b.n).normalize(),uv:a.uv.clone().add(b.uv).multiplyScalar(.5)});
 function triangle(a:Vertex,b:Vertex,c:Vertex,depth=0){
  const lengths=[a.p.distanceToSquared(b.p),b.p.distanceToSquared(c.p),c.p.distanceToSquared(a.p)];
  if(Math.max(...lengths)>4&&depth<8){
   const edge=lengths.indexOf(Math.max(...lengths));
   if(edge===0){const m=middle(a,b);triangle(a,m,c,depth+1);triangle(m,b,c,depth+1);}
   else if(edge===1){const m=middle(b,c);triangle(a,b,m,depth+1);triangle(a,m,c,depth+1);}
   else{const m=middle(c,a);triangle(a,b,m,depth+1);triangle(m,b,c,depth+1);}return;
  }
  for(const v of [a,b,c]){const q=fitHallPoint(v.p),normal=fitHallNormal(v.p,v.n);positions.push(q.x,q.y,q.z);normals.push(normal.x,normal.y,normal.z);uvs.push(v.uv.x,v.uv.y);}
 }
 for(let i=0;i<p.count;i+=3){const v=[0,1,2].map(j=>({p:new T.Vector3().fromBufferAttribute(p,i+j),n:new T.Vector3().fromBufferAttribute(n,i+j),uv:uv?new T.Vector2(uv.getX(i+j),uv.getY(i+j)):new T.Vector2()}));triangle(v[0]!,v[1]!,v[2]!);}
 if(g!==source)g.dispose();
 const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(positions,3));result.setAttribute('normal',new T.Float32BufferAttribute(normals,3));result.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));result.computeBoundingSphere();return result;
}
