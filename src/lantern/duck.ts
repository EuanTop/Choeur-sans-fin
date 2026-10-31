import * as T from 'three';
import {duckPose,TAU,wrap} from './cycle.ts';
import {gestureAt} from './performance.ts';
import {DURATION} from '../state.ts';

/** Series passenger proportions from 29/30 October. Feet remain under water. */
export function createDuck(){
 const root=new T.Group();root.name='Yaya / swimming';
 const sphere=new T.SphereGeometry(1,28,20);
 const yellow=new T.MeshStandardMaterial({color:'#ffce50',roughness:.76,emissive:'#ffce50',emissiveIntensity:.035}),wingMat=new T.MeshStandardMaterial({color:'#f5b63b',roughness:.82}),bill=new T.MeshStandardMaterial({color:'#ef772b',roughness:.64}),dark=new T.MeshStandardMaterial({color:'#201627',roughness:.20}),white=new T.MeshBasicMaterial({color:'#fff1d3'});
 function part(parent:T.Object3D,mat:T.Material,size:number[],at:number[]){const m=new T.Mesh(sphere,mat);m.scale.set(size[0]!,size[1]!,size[2]!);m.position.set(at[0]!,at[1]!,at[2]!);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const body=part(root,yellow,[.60,.60,.864],[0,.576,0]);
 const head=new T.Group();head.name='head';head.position.set(0,1.272,.432);root.add(head);
 part(head,yellow,[.528,.528,.552],[0,0,0]);part(head,bill,[.36,.132,.432],[0,-.096,.60]);const jaw=part(head,bill,[.32,.035,.36],[0,-.151,.62]);const mouth=part(head,dark,[.27,.005,.30],[0,-.145,.65]);
 const eyes:T.Mesh[]=[];for(const s of [-1,1]){eyes.push(part(head,dark,[.0648,.0792,.0528],[s*.4176,.12,.288]));part(head,white,[.014,.017,.009],[s*.432,.145,.333]);}
 const wings=[-1,1].map(side=>{const g=new T.Group();g.position.set(side*.504,.768,.12);root.add(g);part(g,wingMat,[.216,.312,.576],[side*.096,-.072,-.168]);return g;});
 part(root,wingMat,[.15,.17,.27],[0,.61,-.77]);root.scale.setScalar(.54);
 return {root,update(time:number,motion:number){
  const p=duckPose(motion===0?0:time),a=p.phase,g=gestureAt(time);root.position.copy(p.position);root.position.y+=Math.sin(a*8)*.016*motion;root.rotation.set(Math.sin(a*6)*.025*motion,p.yaw+g.look*.08*motion,(Math.sin(a*8+.4)*.025+g.look*.035)*motion);
  head.rotation.y=(.08*Math.sin(a*3)+g.look*.66)*Math.min(1.25,motion);head.rotation.x=(.035*Math.sin(a*5)-g.tilt*.12)*motion;
  jaw.position.y=-.151-.055*g.jaw*motion;jaw.rotation.x=.24*g.jaw*motion;mouth.scale.y=.005+.028*g.jaw*motion;
  body.scale.y=.60*(1+.015*Math.sin(a*4)*motion);
  wings.forEach((wing,i)=>wing.rotation.z=(i?1:-1)*(.06+(.04*Math.sin(a*5+i)+g.wing*.65)*motion));
  const blink=Math.exp(-Math.pow((wrap(time-3.1+DURATION/2)-DURATION/2)/.075,4));eyes.forEach(eye=>eye.scale.y=.0792*(1-.9*blink));
 }};
}
export function createWake(){
 const segments=36,vertices:number[]=[],across:number[]=[],indices:number[]=[];
 for(let i=0;i<=segments;i++){
  const a=(i/segments-.5)*Math.PI*.88;
  for(const s of [-1,1]){const r=1+s*.025;vertices.push(Math.sin(a)*r,0,-Math.cos(a)*r);across.push(s);}
  if(i<segments){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('across',new T.Float32BufferAttribute(across,1));geo.setIndex(indices);
 const alpha=new T.InstancedBufferAttribute(new Float32Array(28),1);geo.setAttribute('aAlpha',alpha);
 const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{uColor:{value:new T.Color('#ffd0a0')}},vertexShader:`attribute float aAlpha,across;varying float opacity,edge;void main(){opacity=aAlpha;edge=across;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,fragmentShader:`uniform vec3 uColor;varying float opacity,edge;void main(){gl_FragColor=vec4(uColor,opacity*exp(-edge*edge*2.));
 #include <colorspace_fragment>
 }`});
 const mesh=new T.InstancedMesh(geo,mat,28);mesh.frustumCulled=false;mesh.renderOrder=3;
 const q=new T.Quaternion(),m=new T.Matrix4(),size=new T.Vector3(),up=new T.Vector3(0,1,0);
 return {mesh,update(time:number,motion:number){
  const interval=DURATION/240,life=interval*27;
  for(let i=0;i<28;i++){
   const born=(Math.floor(time/interval)-i)*interval,age=time-born,p=duckPose(born),r=.13+age*.20;
   const centre=p.position.clone().addScaledVector(p.tangent,-.46-age*.60);centre.y=.022;
   q.setFromAxisAngle(up,p.yaw);size.set(r,1,r);m.compose(centre,q,size);mesh.setMatrixAt(i,m);
   alpha.setX(i,.20*Math.min(1,age/.20)*Math.max(0,1-age/life)**1.1*Math.min(1,motion));
  }
  mesh.instanceMatrix.needsUpdate=true;alpha.needsUpdate=true;
 }};
}
