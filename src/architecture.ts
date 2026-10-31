import * as T from 'three';
import {block,ellipsoid,material,plaster,rod,curveLine,batchStatic} from './geometry.ts';
import {doorClosure,TAU} from './story.ts';
import type {SwanMaker} from './swans.ts';

export function arch(w:number,h:number){
 const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h-w/2);s.absarc(0,h-w/2,w/2,0,Math.PI,false);s.lineTo(-w/2,0);return s;
}
const trim=plaster('#cbb4a1'),iron=material('#302739'),shutter=material('#384c45'),wood=material('#68534e');
const leafMat=new T.MeshStandardMaterial({color:'#43523a',roughness:1,side:T.DoubleSide}),leafTip=new T.MeshStandardMaterial({color:'#7b8151',roughness:1,side:T.DoubleSide}),flowerMat=material('#ce7739'),potMat=plaster('#a86a52');
const breeze={uPhase:{value:0},uWind:{value:1}};
for(const mat of [leafMat,leafTip]){
 mat.onBeforeCompile=s=>{Object.assign(s.uniforms,breeze);s.vertexShader='uniform float uPhase,uWind;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`vec3 transformed=position;transformed.x+=uWind*.022*sin(position.y*3.+modelMatrix[3].x*.7+uPhase*3.);transformed.z+=uWind*.012*sin(position.x*4.+uPhase*5.);`);};mat.customProgramCacheKey=()=> 'ivy-breeze-v1';
}
export function updatePlantBreeze(t:number,wind:number){breeze.uPhase.value=t/32*TAU;breeze.uWind.value=wind;}
const roomWall=material('#84504d'),roomFloor=material('#a6796b');
const bulbMat=new T.MeshBasicMaterial({color:new T.Color('#ffa444').multiplyScalar(2.0)});
const leafShape=new T.Shape();leafShape.moveTo(0,-.14);leafShape.bezierCurveTo(-.17,-.04,-.14,.12,-.055,.12);leafShape.quadraticCurveTo(0,.10,0,.075);leafShape.quadraticCurveTo(.09,.16,.13,.06);leafShape.quadraticCurveTo(.15,-.035,0,-.14);
const leafGeometry=new T.ShapeGeometry(leafShape,6);
function leaf(parent:T.Object3D,mat:T.Material,x:number,y:number,z:number,angle:number,scale=1){const mesh=new T.Mesh(leafGeometry,mat);mesh.position.set(x,y,z);mesh.rotation.set(.15*Math.sin(angle),.2*Math.cos(angle),angle);mesh.scale.setScalar(scale);parent.add(mesh);return mesh;}
const tileGeometry=(()=>{
 const p:number[]=[],idx:number[]=[];
 for(let i=0;i<=8;i++){const a=i*Math.PI/8;for(const z of [-.24,.24])p.push(Math.cos(a)*.12,Math.sin(a)*.10,z);}
 for(let i=0;i<8;i++){const a=i*2;idx.push(a,a+2,a+1,a+1,a+2,a+3);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
})();

export function lantern(parent:T.Object3D,x:number,y:number,z:number,scale=1){
 const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
 block(g,iron,[.36,.065,.36],[0,-.23,0]);block(g,iron,[.43,.07,.43],[0,.25,0]);
 const roof=new T.Mesh(new T.ConeGeometry(.31,.24,4),iron);roof.rotation.y=Math.PI/4;roof.position.y=.40;g.add(roof);
 block(g,bulbMat,[.265,.42,.265]);
 for(const a of [-1,1])for(const b of [-1,1])rod(g,new T.Vector3(a*.16,-.23,b*.16),new T.Vector3(a*.16,.28,b*.16),.017,iron);
 ellipsoid(g,iron,[.045,.09,.045],[0,.56,0]);
 return g;
}

export function planter(parent:T.Object3D,x:number,y:number,z:number,scale=1,seed=0){
 const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
 block(g,potMat,[.65,.22,.32]);block(g,potMat,[.72,.07,.37],[0,.12,0]);
 for(let i=0;i<14;i++){
  const a=i*2.399+seed,px=Math.sin(a)*.28,pz=Math.cos(a)*.16;
  leaf(g,i%4?leafMat:leafTip,px,.22+Math.sin(i*2)*.05,pz,a,.85);
  if(i%3===0){
   const stem=curveLine(g,[new T.Vector3(px,.1,pz),new T.Vector3(px*1.4,-.25,.24),new T.Vector3(px*1.1,-.85,.29)],.014,leafMat);stem.castShadow=true;
   for(let j=0;j<5;j++){
    leaf(g,j%3?leafMat:leafTip,px*1.25+Math.sin(j*3)*.06,-.05-j*.16,.27,Math.sin(j*2)*.6,.9);
   }
  }
  if(i%2===0){
   for(let j=0;j<5;j++){const a=j*TAU/5;ellipsoid(g,flowerMat,[.045,.025,.055],[px+Math.sin(a)*.055,.34+Math.cos(a)*.02,pz+Math.cos(a)*.05]);}
   ellipsoid(g,bulbMat,[.025,.02,.025],[px,.37,pz]);
  }
 }
 return g;
}

const pumpkinMat=material('#e38a35'),stemMat=material('#6d6745');
const pumpkinGeo=new T.SphereGeometry(1,28,18);
{
 const p=pumpkinGeo.attributes.position!;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),r=1+.065*Math.cos(Math.atan2(z,x)*9);p.setXYZ(i,x*r,p.getY(i)*.8,z*r*.9);}pumpkinGeo.computeVertexNormals();
}
export function pumpkin(parent:T.Object3D,x:number,floor:number,z:number,scale:number){
 const g=new T.Group();g.name='pumpkin';g.userData.floor=floor;g.position.set(x,floor+.8*scale+.018,z);g.scale.setScalar(scale);parent.add(g);
 const face=bulbMat.clone();g.userData.face=face;g.userData.size=scale;g.userData.phase=x*3+z;
 const m=new T.Mesh(pumpkinGeo,pumpkinMat);m.castShadow=true;g.add(m);
 rod(g,new T.Vector3(0,.70,0),new T.Vector3(.09,1.0,.03),.08,stemMat);
 for(const side of [-1,1]){
  const s=new T.Shape();s.moveTo(0,.14);s.lineTo(-.13,-.09);s.lineTo(.13,-.09);s.closePath();
  const eye=new T.Mesh(new T.ShapeGeometry(s),face);eye.position.set(side*.29,.12,.82);eye.rotation.z=side*Math.sin(x+z)*.19;g.add(eye);
 }
 const mouth=new T.Mesh(new T.TorusGeometry(.28,.04,4,12,Math.PI),face);mouth.rotation.z=Math.PI;mouth.position.set(0,-.15,.82);g.add(mouth);
 batchStatic(g);g.userData.dynamic=true;
 return g;
}

type Opening={x:number;y:number;w:number;h:number;door?:boolean;balcony?:boolean;resident?:boolean};
export function createHouse(swan:SwanMaker,variant:number,side:number,index:number){
 const root=new T.Group();root.name='townhouse';
 const width=variant?6.8:6.4,height=variant?8.1:5.8,depth=3.5;
 const tones=['#64428b','#795080','#70426f','#5e4b8b','#885c91','#61507d','#734a88','#805579'];
 const baseColor=new T.Color(tones[index%tones.length]!);
 const wall=plaster(tones[index%tones.length]!),roofMat=plaster(index%3===0?'#945d5b':index%3===1?'#784752':'#985e64');
 const profile={palette:tones[index%tones.length]!,character:index%4,lightPhase:index*1.7,lightRate:2+index%3,shutterDelay:(index%8)*.23,pumpkinPhase:index*.83};
 root.userData.profile=profile;
 const windowGlow=new T.ShaderMaterial({uniforms:{strength:{value:1},warmth:{value:index%3*.035}},vertexShader:`varying vec2 q;void main(){q=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 q;uniform float strength,warmth;void main(){float pool=exp(-pow((q.y-1.1)*.9,2.)-pow((q.x-.12)*1.3,2.));vec3 col=mix(vec3(.16,.045,.025),vec3(1.15,.42+warmth,.065),pool);gl_FragColor=vec4(col*strength,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const openings:Opening[]=[
  {x:-1.35,y:.17,w:1.10,h:2.30,door:true,resident:true},
  {x:1.4,y:.70,w:1.10,h:1.7,resident:variant===1},
  {x:-1.35,y:variant?5.85:3.6,w:1.1,h:1.75,resident:true,balcony:true},
  {x:1.4,y:variant?5.85:3.6,w:1.1,h:1.75,resident:false},
  ...(variant?[{x:-1.35,y:3.05,w:1.1,h:1.65,resident:false},{x:1.4,y:3.05,w:1.1,h:1.65,resident:true,balcony:true}]:[]),
 ];
 const wallShape=new T.Shape();wallShape.moveTo(-width/2,0);wallShape.lineTo(width/2,0);wallShape.lineTo(width/2,height);wallShape.lineTo(-width/2,height);wallShape.closePath();
 for(const o of openings){const points=arch(o.w+.03,o.h+.03).getPoints(36).map(p=>new T.Vector2(p.x+o.x,p.y+o.y));wallShape.holes.push(new T.Path(points));}
 const facade=new T.Mesh(new T.ExtrudeGeometry(wallShape,{depth:.20,bevelEnabled:false}),wall);facade.position.z=-.2;facade.castShadow=true;facade.receiveShadow=true;root.add(facade);
 block(root,wall,[width,height,.17],[0,height/2,-depth]);
 for(const s of [-1,1])block(root,wall,[.16,height,depth],[s*(width/2-.07),height/2,-depth/2]);
 for(const y of (variant?[.1,2.78,5.55,height-.13]:[.1,3.30,height-.13]))block(root,trim,[width+.15,.11,depth+.22],[0,y,-depth/2]);
 for(const x of [-width/2+.06,width/2-.06])block(root,trim,[.15,height,.12],[x,height/2,.055]);
 // Pitched clay roof, real barrel tiles, gable, chimney and rain gutter.
 const gable=new T.Shape();gable.moveTo(-width/2,height);gable.lineTo(width/2,height);gable.lineTo(0,height+.68);gable.closePath();
 for(const z of [.005,-depth]){const m=new T.Mesh(new T.ShapeGeometry(gable),wall);m.position.z=z;if(z<0)m.rotation.y=Math.PI;root.add(m);}
 for(const s of [-1,1]){
  const roof=block(root,roofMat,[width/2+.25,.18,depth+.46],[s*width*.25,height+.40,-depth/2]);roof.rotation.z=-s*.17;
  for(let row=0;row<5;row++){
   const line=block(root,roofMat,[.06,.07,depth+.49],[s*(.08+row*width*.10),height+.65-row*width*.018,-depth/2]);line.rotation.z=-s*.17;
  }
  for(let row=0;row<12;row++)for(let j=0;j<8;j++){
   const x=s*(.07+row*width/24),m=new T.Mesh(tileGeometry,roofMat);m.position.set(x,height+.67-Math.abs(x)*.20,-depth-.15+j*.49+(row%2)*.04);m.rotation.z=-s*.20;root.add(m);
  }
 }
 rod(root,new T.Vector3(-width/2-.1,height-.04,.18),new T.Vector3(width/2+.1,height-.04,.18),.045,iron);
 block(root,wall,[.46,.9,.5],[width*.24,height+.8,-depth*.55]);block(root,trim,[.59,.09,.62],[width*.24,height+1.25,-depth*.55]);
 block(root,roomFloor,[width,.12,depth],[0,.04,-depth/2]);
 const hinges:{pivot:T.Group;side:number;openAngle:number;opening:number}[]=[],residents:{actor:ReturnType<SwanMaker>;base:T.Vector3;opening:number;room:T.Group}[]=[],patches:T.ShaderMaterial[]=[];
 const roomGlows:T.ShaderMaterial[]=[];
 const patchesRoot=new T.Group();patchesRoot.userData.dynamic=true;root.add(patchesRoot);
 function lightPatch(o:Opening){
  const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{strength:{value:1}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float strength;void main(){float width=.13+vUv.y*.36;float edge=1.-smoothstep(width-.035,width,abs(vUv.x-.5));float end=sin(vUv.y*3.14159);gl_FragColor=vec4(vec3(1.,.49,.14),edge*end*.23*strength);}`});
  const plane=new T.Mesh(new T.PlaneGeometry(3.5,3.8),mat);plane.rotation.x=-Math.PI/2;plane.position.set(o.x,.172,1.91);plane.renderOrder=1;patchesRoot.add(plane);patches.push(mat);
 }
 openings.forEach((o,oi)=>{
  const frameShape=arch(o.w+.22,o.h+.13);frameShape.holes.push(new T.Path(arch(o.w,o.h).getPoints(40)));
  const frame=new T.Mesh(new T.ExtrudeGeometry(frameShape,{depth:.13,bevelEnabled:true,bevelSize:.024,bevelThickness:.024,bevelSegments:2}),trim);frame.position.set(o.x,o.y,.02);frame.castShadow=true;root.add(frame);
  const room=new T.Group();room.position.set(o.x,o.y,0);root.add(room);
  block(room,roomWall,[o.w+ .1,o.h,.1],[0,o.h/2,-1.38]);
  block(room,roomFloor,[o.w+.1,.06,1.4],[0,.02,-.65]);
  const roomGlow=windowGlow.clone();roomGlow.uniforms.warmth!.value=((index+oi)%4)*.022;roomGlows.push(roomGlow);
  const glow=new T.Mesh(new T.ShapeGeometry(arch(o.w*.88,o.h*.87)),roomGlow);glow.position.set(0,.04,-1.31);room.add(glow);
  if(o.resident){
   const actor=swan();actor.root.userData.dynamic=true;actor.root.scale.setScalar(o.door?.77:.61);
   actor.root.position.set(0,o.door?.32:.24,-.84);room.add(actor.root);
   residents.push({actor,base:actor.root.position.clone(),opening:oi,room});
  }
  if(!o.door){block(root,trim,[o.w+.32,.12,.38],[o.x,o.y-.025,.12]);}
  const leaves=o.door?[-1]:[-1,1];
  for(const s of leaves){
   const hinge=new T.Group();hinge.position.set(o.x+s*o.w/2,o.y,.19);root.add(hinge);
   const leafWidth=o.door?o.w:o.w/2;
   const center=-s*leafWidth/2;
   block(hinge,shutter,[leafWidth-.015,o.h+.02,.095],[center,o.h/2,0]);
   block(hinge,wood,[leafWidth*.83,.045,.035],[center,.14,.068]);block(hinge,wood,[leafWidth*.83,.045,.035],[center,o.h-.16,.068]);
   if(o.door){
    for(const yy of [.52,1.35])block(hinge,wood,[leafWidth*.75,.68,.036],[center,yy,.063]);
    ellipsoid(hinge,bulbMat,[.033,.045,.03],[center+leafWidth*.30,1.0,.095]);
   }else for(let i=0;i<9;i++)block(hinge,wood,[leafWidth*.78,.035,.11],[center,.23+i*(o.h-.36)/9,.02]);
   batchStatic(hinge);hinge.userData.dynamic=true;hinges.push({pivot:hinge,side:s,openAngle:2.70+(index%3)*.08,opening:oi});
  }
  if(o.door){
   block(root,trim,[o.w+.58,.14,.75],[o.x,.12,.33]);block(root,trim,[o.w+.85,.08,.35],[o.x,.04,.77]);lightPatch(o);
   lantern(root,o.x+o.w*.8,2.65,.32,.7);
  }
  if(o.balcony){
   block(root,trim,[o.w+.75,.15,.78],[o.x,o.y-.1,.38]);
   for(let j=0;j<=7;j++)rod(root,new T.Vector3(o.x-o.w*.72+j*o.w*1.44/7,o.y,.73),new T.Vector3(o.x-o.w*.72+j*o.w*1.44/7,o.y+.65,.73),.017,iron);
   rod(root,new T.Vector3(o.x-o.w*.77,o.y+.66,.73),new T.Vector3(o.x+o.w*.77,o.y+.66,.73),.025,iron);
  }
  if(!o.door)planter(root,o.x,o.y-.12,.30,.98,oi+variant);
 });
 for(let row=0;row<2;row++)for(let col=0;col<9;col++){
  const x=-width/2+.34+col*width/9+(row%2)*.16;
  if(Math.abs(x+1.35)<.72)continue;
  block(root,trim,[width/9-.025,.12,.025],[x,.21+row*.145,.013]);
 }
 // Tall planters and trailing vines soften the repeated facade structure.
 planter(root,-width/2+.35,.15,.34,1.35,2+index);
 const pumpkins=[pumpkin(root,-2.75,0,.55,.34+(index%3)*.035)];if(variant)pumpkins.push(pumpkin(root,2.8,0,.4,.26));
 const trailing=new T.Group();trailing.position.set(width/2-.2,height-1.2,.17);root.add(trailing);
 for(let j=0;j<3;j++){
  const pts=Array.from({length:10},(_,i)=>new T.Vector3(Math.sin(i*.7+j)*.17+j*.13,-i*.36,.04));curveLine(trailing,pts,.018,leafMat);
  for(let i=0;i<12;i++){
   const a=i*2.39+j;leaf(trailing,i%4?leafMat:leafTip,Math.sin(i*.5+j)*.23+j*.12,-i*.25,.08,Math.sin(a)*.9,1.15);
   if(i%4===0)ellipsoid(trailing,flowerMat,[.07,.065,.035],[Math.sin(i*.5+j)*.23+j*.12,-i*.25,.13]);
  }
 }
 for(let i=0;i<86;i++){
  const a=i*2.399,drop=(i%29)*.115;
  const px=width/2-.18+Math.sin(a+index*.9)*(.24+.13*Math.sin(drop));
  const py=height-.85-drop+Math.cos(a*.7+index)*.15;
  leaf(root,i%5?leafMat:leafTip,px,py,.24+Math.sin(a)*.07,Math.sin(a)*1.0,.85+(i%3)*.12);
  if(i%9===0)for(let j=0;j<5;j++){const a2=j*TAU/5;ellipsoid(root,flowerMat,[.045,.035,.025],[px+Math.sin(a2)*.065,py+Math.cos(a2)*.065,.30]);}
 }
 batchStatic(root);
 root.rotation.y=side===1?-Math.PI/2:Math.PI/2;
 root.position.x=side===1?4.12:-4.90;
 const worldAnchor=new T.Vector3();
 return {root,residents,profile,update(time:number,wind:number,light:number,duck?:T.Vector3){
  const closure=doorClosure(time,index),phase=time/32*TAU;
  wall.color.copy(baseColor).multiplyScalar(1+.018*Math.sin(phase*2+index));
  roomGlows.forEach((m,i)=>m.uniforms.strength!.value=light*(i===3?.60:1)*(.89+.11*Math.sin(phase*(profile.lightRate+i%2)+profile.lightPhase+i*1.7)));
  hinges.forEach(({pivot,side:s,openAngle,opening},i)=>{const c=doorClosure(time-opening*.15-(s===1?.09:0),index),openness=1-c; pivot.rotation.y=s*(openAngle*openness+.012*Math.sin(phase*3+i)*wind*openness);});
  residents.forEach(({actor,base,opening,room},i)=>{
   const c=doorClosure(time-opening*.15,index),seed=index*1.37+opening,kind=(index+opening)%4;
   actor.root.position.copy(base);actor.root.position.z-=c*(kind===2?.4:.19);actor.root.position.y+=.018*Math.sin(phase*(2+kind)+seed);
   actor.root.rotation.y=(side===1?-.18:.18)+.04*Math.sin(phase*2+seed);actor.root.rotation.x=-c*.035;actor.root.rotation.z=Math.sin(phase*3+seed)*.012*wind;
   let yaw=.12*Math.sin(phase*(2+kind)+seed);
   if(duck){const aim=room.worldToLocal(duck.clone());yaw+=T.MathUtils.clamp(Math.atan2(aim.x,Math.max(1,aim.z)), -.5,.5)*.55;}
   actor.pose(yaw,.04*Math.sin(phase*3+seed)-c*.07);
   actor.wings.forEach((w,j)=>{const offered=(kind===0||kind===3)&&j===0?.18:0;w.rotation.z=(j?1:-1)*(.04+offered*(1-c)+.10*(1-c)*(.5+.5*Math.sin(phase*(3+kind)+seed)));});
  });
  pumpkins.forEach(g=>{const seed=g.userData.phase+profile.pumpkinPhase,pulse=.5+.5*Math.sin(phase*4+seed),s=g.userData.size;g.rotation.z=.025*Math.sin(phase*2+seed);g.rotation.y=.11*Math.sin(phase*3+seed);g.scale.set(s,s*(1+pulse*.035),s);g.position.y=g.userData.floor+.8*g.scale.y+.018;g.userData.face.color.set('#ff9f35').multiplyScalar(1.25+pulse*.65);});
  patches.forEach(m=>m.uniforms.strength!.value=light*(1-closure)**2);
 },doorState(time:number){return doorClosure(time,index);},anchor(){return root.localToWorld(worldAnchor.set(-1.35,1.45,.55));},portal(){return {position:root.localToWorld(new T.Vector3(-1.35,2.20,-.27)),target:root.localToWorld(new T.Vector3(-1.35,-.1,4.3))};}};
}
export type TownHouse=ReturnType<typeof createHouse>;
