import * as T from 'three';
import {ellipsoid,material,curveLine} from './geometry.ts';
import {storyAt} from './story.ts';
import type {ArtState} from './state.ts';
import {bridgePoint,bridgeTangent} from './bridge-path.ts';

function hoodSurface(){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];
 const rings=28,segments=56;
 for(let i=0;i<=rings;i++){
  const theta=.89+(Math.PI-.89)*i/rings;
  for(let j=0;j<=segments;j++){
   const a=j/segments*Math.PI*2;
   const fold=1+.025*Math.sin(a*3+theta*2)*Math.sin(theta)**2;
   positions.push(.574*Math.sin(theta)*Math.cos(a)*fold,.405+.574*Math.sin(theta)*Math.sin(a)*fold,.14+.592*Math.cos(theta));
   uv.push(j/segments,i/rings);
  }
 }
 for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){
  const a=i*(segments+1)+j,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

function webbedFoot(){
 const s=new T.Shape();s.moveTo(-.08,-.055);s.quadraticCurveTo(-.19,.015,-.20,.16);s.bezierCurveTo(-.29,.31,-.18,.37,-.095,.28);
 s.bezierCurveTo(-.055,.49,.055,.49,.095,.28);s.bezierCurveTo(.18,.37,.29,.31,.20,.16);s.quadraticCurveTo(.19,.015,.08,-.055);s.closePath();
 return new T.ExtrudeGeometry(s,{depth:.028,bevelEnabled:true,bevelSize:.018,bevelThickness:.014,bevelSegments:4,steps:1}).rotateX(Math.PI/2);
}

export function createDuck(scene:T.Scene){
 const root=new T.Group();root.name='yaya';scene.add(root);
 const yellow=material('#ffce50',.70),wingMat=material('#f5b63b',.78),billMat=material('#ef772b',.50),black=material('#2f2531',.24),cream=material('#fff4d6');
 const fabric=new T.MeshStandardMaterial({color:'#fff1db',roughness:.92,side:T.DoubleSide});
 const body=new T.Group();root.add(body);
 ellipsoid(body,yellow,[.61,.56,.75],[0,.576,0]);
 const head=new T.Group();head.position.set(0,1.22,.432);body.add(head);
 ellipsoid(head,yellow,[.528,.528,.552]);
 ellipsoid(head,billMat,[.28,.105,.25],[0,-.096,.58]);
 ellipsoid(head,billMat,[.25,.028,.23],[0,-.145,.59]);
 const eyes:T.Mesh[]=[],glints:T.Mesh[]=[];
 for(const side of [-1,1]){
  eyes.push(ellipsoid(head,black,[.067,.079,.053],[side*.29,.13,.43]));
  glints.push(ellipsoid(head,cream,[.017,.019,.010],[side*.300,.155,.479]));
 }
 ellipsoid(body,yellow,[.15,.17,.25],[0,.65,-.79]);
 const wings=[-1,1].map(side=>{
  const pivot=new T.Group();pivot.position.set(side*.504,.768,.12);body.add(pivot);
  ellipsoid(pivot,wingMat,[.14,.19,.30],[side*.07,-.045,-.10]);
  for(let j=0;j<3;j++){const feather=ellipsoid(pivot,yellow,[.085,.20,.15],[side*(.10+j*.012),-.14-j*.016,.065-j*.12]);feather.rotation.x=-.30;feather.rotation.z=side*.12;}
  return pivot;
 });
 const hood=new T.Group();hood.name='swan-hood';hood.position.set(0,.815,.292);body.add(hood);
 const cap=new T.Mesh(hoodSurface(),fabric);cap.castShadow=true;cap.receiveShadow=true;hood.add(cap);
 curveLine(hood,[new T.Vector3(0,.88,-.05),new T.Vector3(0,1.12,.045),new T.Vector3(0,1.24,.22)],.16,fabric);
 ellipsoid(hood,fabric,[.225,.20,.29],[0,1.25,.28]);
 ellipsoid(hood,billMat,[.085,.061,.21],[0,1.19,.62]);
 ellipsoid(hood,black,[.075,.029,.06],[0,1.24,.47]);
 for(const side of [-1,1])ellipsoid(hood,black,[.029,.040,.025],[side*.166,1.285,.44]);
 const cape=new T.Shape();cape.moveTo(-.47,.06);cape.quadraticCurveTo(0,.23,.47,.06);cape.lineTo(.56,-.24);cape.quadraticCurveTo(.31,-.13,.20,-.28);cape.quadraticCurveTo(0,-.14,-.20,-.28);cape.quadraticCurveTo(-.31,-.13,-.56,-.24);cape.closePath();
 const flap=new T.Mesh(new T.ShapeGeometry(cape,24),fabric);flap.position.set(0,.14,-.12);flap.rotation.x=-.30;flap.castShadow=true;hood.add(flap);
 for(const side of [-1,1])ellipsoid(body,fabric,[.13,.060,.050],[side*.10,.79,.79]);
 ellipsoid(body,fabric,[.055,.055,.050],[0,.79,.825]);
 const footGeo=webbedFoot();
 const feet=[-1,1].map(side=>{const pivot=new T.Group();pivot.position.set(side*.25,.085,.1);root.add(pivot);const foot=new T.Mesh(footGeo,billMat);foot.castShadow=true;foot.receiveShadow=true;pivot.add(foot);return pivot;});
 return {root,hood,feet,update(t:number,state:ArtState){
  const p=storyAt(t),m=state.motion;
  const location=bridgePoint(p.travel),tangent=bridgeTangent(p.travel);
  root.position.set(location.x,location.y+.035,0);root.rotation.y=Math.atan2(tangent.x,tangent.z)-.10+Math.sin(p.phase*2)*.035*m;
  body.position.y=.085+Math.abs(p.step)*.026*m;body.rotation.z=p.step*.035*m;body.rotation.x=Math.sin(p.phase*24+.3)*.012*m;
  head.rotation.y=p.headTurn*m;head.rotation.z=p.noticed*.045*m;head.rotation.x=-p.noticed*.05*m;
  hood.rotation.x=-p.slip*.88;hood.rotation.z=Math.sin(p.phase*24-.4)*.025*m+p.slip*.08;
  const blink=Math.max(...[3.1,11.7,20.4,27.3].map(center=>{let d=p.t-center;d-=Math.round(d/32)*32;return Math.exp(-Math.pow(d/.065,4));}));
  eyes.forEach(eye=>eye.scale.y=.079*(1-blink*.94));glints.forEach(g=>g.visible=blink<.6);
  wings.forEach((w,i)=>{w.rotation.z=(i?1:-1)*(.05+Math.max(0,Math.sin(p.phase*24+i))*.08*m);w.rotation.x=Math.sin(p.phase*24+i)*.045*m;});
  wings[0]!.rotation.z=-.08-p.reach*1.8;wings[0]!.rotation.x=-p.reach*.5;
  feet.forEach((f,i)=>{
   const a=p.stride+i*Math.PI,s=Math.sin(a),lift=Math.max(0,s)*.16*m;
   f.position.y=.085+lift+(i===0?p.raisedFoot*.24:0);
   f.position.z=.10+Math.cos(a)*.19*m;f.rotation.x=-lift*1.4+(i===0?-p.raisedFoot*.42:0);f.rotation.z=(i?1:-1)*.035;
  });
 },diagnostics(t:number){const p=storyAt(t);return {hoodSlip:p.slip,raisedFoot:p.raisedFoot,streetActors:1};}};
}
