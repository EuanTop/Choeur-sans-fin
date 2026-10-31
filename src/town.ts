import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {block,ellipsoid,material,rod,curveLine,box} from './geometry.ts';
import {bridgeHeight} from './story.ts';

export function createTown(scene:T.Scene){
 const stone=material('#ad9db6'),edge=material('#d3bbcd'),dark=material('#35254f'),iron=material('#36324d'),wood=material('#9d576c');
 const windowMat=new T.MeshStandardMaterial({color:'#ffb64e',emissive:'#ff951d',emissiveIntensity:1.9,roughness:.5});
 const lamps:T.PointLight[]=[],hinges:T.Group[]=[],plants:T.Group[]=[];
 const glow=new T.MeshBasicMaterial({color:'#ffd68d'}),green=material('#687272'),leafLight=material('#a2a580');
 const banks=new T.Group();scene.add(banks);
 for(const side of [-1,1]){
  block(banks,dark,[7,1.1,27],[side*6,-.42,-4]);
  block(banks,stone,[6.4,.15,27],[side*5.8,.2,-4]);
  for(let z=-15;z<9;z+=.58)block(banks,edge,[.42,.4,.53],[side*2.75,.13,z]);
 }
 // Shared instanced paving has deliberate joints without thousands of draw calls.
 const tiles=new T.InstancedMesh(box,material('#a997b0'),2*24*8+17*6);let tile=0;
 const matrix=new T.Matrix4(),quat=new T.Quaternion(),color=new T.Color();
 function tileAt(x:number,y:number,z:number,sx:number,sz:number,angle=0){quat.setFromAxisAngle(new T.Vector3(0,0,1),angle);matrix.compose(new T.Vector3(x,y,z),quat,new T.Vector3(sx,.06,sz));tiles.setMatrixAt(tile,matrix);tiles.setColorAt(tile++,color.setHSL(.78,.12,.53+Math.sin(x*37+z*16)*.04));}
 for(const side of [-1,1])for(let row=0;row<24;row++)for(let col=0;col<8;col++)tileAt(side*(3.0+col*.65),.31,-14+row*.94+(col%2)*.12,.59,.87);
 for(let i=0;i<17;i++)for(let j=0;j<6;j++){const x=-4.1+i*.51;tileAt(x,bridgeHeight(x)+.04,1.24+j*.43,.46,.39,-1.6*x/(4.4*4.4));}
 tiles.count=tile;tiles.receiveShadow=true;scene.add(tiles);

 function bridge(z:number,scale=1){
  const g=new T.Group();g.position.z=z;g.scale.setScalar(scale);scene.add(g);
  const s=new T.Shape();s.moveTo(-4.4,.2);
  for(let i=0;i<=36;i++){const x=-4.4+i*8.8/36;s.lineTo(x,bridgeHeight(x));}
  s.lineTo(4.4,-.75);s.lineTo(2.65,-.75);s.bezierCurveTo(2.0,.74,-2,.74,-2.65,-.75);s.lineTo(-4.4,-.75);s.closePath();
  const mesh=new T.Mesh(new T.ExtrudeGeometry(s,{depth:2.5,bevelEnabled:true,bevelSize:.05,bevelThickness:.05,bevelSegments:2,steps:1}),stone);mesh.position.z=-1.25;mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  for(const zz of [-1.30,1.30]){
   const pts=Array.from({length:25},(_,i)=>{const x=-4.4+i*8.8/24;return new T.Vector3(x,bridgeHeight(x)+.07,zz);});curveLine(g,pts,.085,edge);
   // Low front edge leaves the duck's feet readable; far parapet carries lamps.
   if(zz<0)for(let i=0;i<=16;i++){const x=-4.2+i*.525;block(g,edge,[.47,.30,.16],[x,bridgeHeight(x)+.18,zz]);}
  }
  for(const x of [-3.5,3.5])block(g,edge,[.28,.58,.3],[x,bridgeHeight(x)+.26,-1.3]);
  for(let i=0;i<19;i++){
   const a=Math.PI*i/18;const p=new T.Vector3(Math.cos(a)*2.65,-.75+Math.sin(a)*1.38,1.27);
   const keystone=block(g,edge,[.39,.22,.13],p.toArray());keystone.rotation.z=a-Math.PI/2;
  }
 }
 bridge(2.4);bridge(-8,.9);

 function arched(w:number,h:number){const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h-w/2);s.absarc(0,h-w/2,w/2,0,Math.PI,false);s.lineTo(-w/2,0);return s;}
 const shutter=material('#6b777a');
 function windowUnit(parent:T.Object3D,x:number,y:number,w=.56,h=1.0,balcony=false){
  const unit=new T.Group();unit.position.set(x,y,.055);parent.add(unit);
  const rim=new T.Mesh(new T.ExtrudeGeometry(arched(w+.18,h+.1),{depth:.07,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1}),edge);unit.add(rim);
  // The arched backing reaches z=.095 including its bevel. Keep glass and
  // mullions on separate depth planes rather than relying on polygon offset.
  const pane=new T.Mesh(new T.ShapeGeometry(arched(w,h)),windowMat);pane.name='window-glass';pane.position.z=.14;pane.position.y=.04;unit.add(pane);
  rim.name='window-backing';
  block(unit,wood,[.035,h,.055],[0,h*.5,.21]);block(unit,wood,[w,.035,.055],[0,h*.54,.21]);
  for(const side of [-1,1]){
   const pivot=new T.Group();pivot.position.set(side*(w*.5+.1),0,.13);unit.add(pivot);pivot.rotation.y=side*.25;
   block(pivot,shutter,[w*.36,h*.78,.06],[side*w*.19,h*.4,0]);
   for(let i=0;i<5;i++)block(pivot,iron,[w*.30,.025,.075],[side*w*.19,h*.16+i*h*.115,.025]);
   pivot.userData.side=side;pivot.userData.phase=x*3+y;hinges.push(pivot);
  }
  block(unit,edge,[w+.26,.12,.30],[0,-.035,.12]);
  if(balcony){block(unit,stone,[w+.65,.14,.65],[0,-.14,.31]);
   for(let j=0;j<=6;j++)rod(unit,new T.Vector3(-w*.78+j*w*1.56/6,0,.60),new T.Vector3(-w*.78+j*w*1.56/6,.45,.60),.018,iron);
   rod(unit,new T.Vector3(-w*.82,.46,.60),new T.Vector3(w*.82,.46,.60),.023,iron);
  }
 }
 function planter(parent:T.Object3D,x:number,y:number,z:number,scale=.8){
  const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
  const pot=material('#bb7c75');block(g,pot,[.65,.25,.32],[0,0,0]);
  for(let i=0;i<11;i++){
   const a=i*2.4;const leaf=ellipsoid(g,i%3?green:leafLight,[.13,.08,.22],[Math.sin(a)*.30,.17+Math.cos(a)*.07,Math.cos(a)*.17]);leaf.rotation.set(Math.sin(a),a,.3);
   if(i%3===0){const vine=curveLine(g,[new T.Vector3(Math.sin(a)*.27,.1,.18),new T.Vector3(Math.sin(a)*.36,-.3,.23),new T.Vector3(Math.sin(a)*.30,-.65,.25)],.019,green);vine.castShadow=true;
    for(let j=0;j<3;j++)ellipsoid(g,green,[.07,.12,.05],[Math.sin(a)*.32,-.12-j*.20,.23]);}
  }plants.push(g);
 }
 function house(x:number,z:number,w:number,h:number,d:number,tone:string,turn=0){
  const g=new T.Group();g.position.set(x,.3,z);g.rotation.y=turn;scene.add(g);
  const wall=material(tone),roofMat=material('#734763');
  block(g,wall,[w,h,d],[0,h/2,0]);block(g,dark,[w+.13,.23,d+.15],[0,.15,0]);
  for(const yy of [h*.48,h-.12])block(g,edge,[w+.18,.11,d+.18],[0,yy,0]);
  // Pitched roof and overlapping courses keep the silhouette architectural.
  for(const side of [-1,1]){
   const roof=block(g,roofMat,[w*.61,.16,d+.48],[side*w*.25,h+.25,0]);roof.rotation.z=-side*.30;
   for(let row=0;row<6;row++)for(let col=0;col<8;col++){
    const tile=block(g,roofMat,[w*.105,.055,(d+.4)/8*.94],[side*(.03+row*w*.083),h+.41-row*w*.025,-d*.51+col*(d+.4)/8]);tile.rotation.z=-side*.30;
   }
  }
  block(g,wall,[.42,.85,.48],[w*.27,h+.60,-d*.2]);block(g,edge,[.53,.09,.58],[w*.27,h+1.04,-d*.2]);
  function facade(zpos:number,rotation:number,width:number){
   const f=new T.Group();f.position.z=zpos;f.rotation.y=rotation;g.add(f);
   for(let floor=0;floor<2;floor++)for(let col=0;col<2;col++)windowUnit(f,(col-.5)*width*.48,.75+floor*h*.43,.55,.93,floor===1&&col===0);
   planter(f,width*.23,h*.43+.72,.27,.85);
   const door=new T.Mesh(new T.ShapeGeometry(arched(.72,1.45)),dark);door.position.set(-width*.25,.03,.06);f.add(door);
   block(f,wood,[.65,.9,.06],[-width*.25,.48,.09]);ellipsoid(f,glow,[.025,.025,.025],[-width*.25+.20,.59,.135]);
   for(const xx of [-width*.49,width*.49])block(f,edge,[.12,h,.1],[xx,h*.5,.07]);
  }
  facade(d*.5+.02,0,w);
  const riverFace=new T.Group();riverFace.position.x=x<0?w*.5+.02:-w*.5-.02;riverFace.rotation.y=x<0?Math.PI/2:-Math.PI/2;g.add(riverFace);
  for(let floor=0;floor<2;floor++)for(let col=0;col<2;col++)windowUnit(riverFace,(col-.5)*d*.50,.75+floor*h*.43,.55,.93,col===1&&floor===1);
  planter(riverFace,-d*.24,h*.46,.3);
  return g;
 }
 house(-4.9,-.2,3.4,4.8,3.7,'#725a9c');house(5.05,-2.4,3.4,5.6,4,'#765586');
 house(-4.8,-5.4,3.2,6.4,3.4,'#514574');house(4.8,-7.7,3.2,5.1,3.6,'#8c638f');
 house(-4.6,-10.3,3.1,5,3.8,'#896193');house(5,-12.4,3.4,6,3.9,'#5b4a80');
 // Near cropped corner anchors the foreground without blocking bridge actors.
 house(-7.5,5.3,3.0,4.2,3.4,'#71506e');
 function lantern(parent:T.Object3D,x:number,y:number,z:number,scale=1){
  const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
  block(g,iron,[.32,.06,.32],[0,-.19,0]);block(g,iron,[.37,.08,.37],[0,.22,0]);
  block(g,glow,[.24,.34,.24]);for(const a of [-1,1])for(const b of [-1,1])rod(g,new T.Vector3(a*.14,-.2,b*.14),new T.Vector3(a*.14,.2,b*.14),.016,iron);
  const light=new T.PointLight('#ffb05e',2.3,4,2);g.add(light);lamps.push(light);return g;
 }
 for(const side of [-1,1]){
  const x=side*3.8;block(scene,iron,[.22,.10,.22],[x,.41,1.4]);rod(scene,new T.Vector3(x,.42,1.4),new T.Vector3(x,3.7,1.4),.055,iron);
  lantern(scene,x,3.78,1.4,1.1);
  for(let i=0;i<3;i++)lantern(scene,side*3.4,1.85,-2-i*4,.68);
 }
 // One sagging string, varied ornaments. No rigid laser-like light beams.
 const cablePoints=Array.from({length:25},(_,i)=>{const x=-4.1+i*8.2/24;return new T.Vector3(x,4.45-.6*(1-(x/4.1)**2),-3.0);});curveLine(scene,cablePoints,.016,iron);
 for(let i=0;i<9;i++){
  const x=-3.8+i*.95,y=4.45-.6*(1-(x/4.1)**2);
  rod(scene,new T.Vector3(x,y,-3),new T.Vector3(x,y-.24,-3),.01,iron);lantern(scene,x,y-.4,-3,.44);
 }
 const pumpkinMat=material('#d77b35');
 const pumpkinGeo=new T.SphereGeometry(1,32,20),p= pumpkinGeo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x),r=1+.07*Math.cos(a*9);p.setXYZ(i,x*r,p.getY(i),z*r);}pumpkinGeo.computeVertexNormals();
 function pumpkin(x:number,z:number,s:number,angle=0){
  // All props sit on the same curved deck used for paving and actor feet.
  const floor=z>=1.15&&z<=3.65?bridgeHeight(x)+.075:.34;
  const g=new T.Group();g.name='pumpkin';g.userData.floor=floor;g.position.set(x,floor+.8*s+.015,z);g.rotation.y=angle;g.scale.setScalar(s);scene.add(g);
  const m=new T.Mesh(pumpkinGeo,pumpkinMat);m.scale.set(1,.8,.9);g.add(m);m.castShadow=true;
  rod(g,new T.Vector3(0,.7,0),new T.Vector3(.08,1.03,0),.09,green);
  for(const side of [-1,1]){
   const shape=new T.Shape();shape.moveTo(0,.17);shape.lineTo(-.14,-.12);shape.lineTo(.14,-.12);shape.closePath();
   const eye=new T.Mesh(new T.ShapeGeometry(shape),glow);eye.position.set(side*.31,.15,.82);g.add(eye);
  }
  const mouth=new T.Mesh(new T.TorusGeometry(.33,.045,5,12,Math.PI),glow);mouth.rotation.z=Math.PI;mouth.position.set(0,-.15,.83);g.add(mouth);
 }
 pumpkin(-3.75,3.4,.45,.2);pumpkin(-4.38,3.2,.28,-.2);pumpkin(3.95,3.2,.38,-.4);pumpkin(3.55,-.4,.23);
 for(const side of [-1,1]){const g=new T.Group();g.position.set(side*3.3,.45,-4.5);scene.add(g);planter(g,0,.15,0,1.7);}

 const water=new Reflector(new T.PlaneGeometry(5.45,32),{color:'#50405f',textureWidth:768,textureHeight:1024,multisample:0});water.rotation.x=-Math.PI/2;water.position.set(0,-.59,-4);scene.add(water);
 const wm=water.material as T.ShaderMaterial;wm.uniforms.uTime={value:0};wm.uniforms.uWind={value:1};
 wm.fragmentShader=wm.fragmentShader.replace('uniform vec3 color;','uniform vec3 color;uniform float uTime;uniform float uWind;').replace('vec4 base = texture2DProj( tDiffuse, vUv );',`vec4 wave=vUv;vec2 q=wave.xy/wave.w;
  wave.x+=wave.w*.002*uWind*sin(q.y*75.+uTime*.9+sin(q.x*13.));
  wave.y+=wave.w*.0006*uWind*sin(q.x*63.-uTime*.6);
  vec4 base=texture2DProj(tDiffuse,wave);base.rgb=mix(vec3(.15,.065,.26),base.rgb,.66);`);
 wm.fragmentShader=wm.fragmentShader.replace('blendOverlay( base.rgb, color )','mix(vec3(.105,.04,.20),base.rgb,.62)');
 return {water,update(t:number,wind:number,light:number){
  wm.uniforms.uTime!.value=t;wm.uniforms.uWind!.value=wind;
  lamps.forEach((l,i)=>l.intensity=light*(2.3+Math.sin(t*2+i*3)*.09));
  windowMat.emissiveIntensity=1.3*light;
  hinges.forEach((g,i)=>g.rotation.y=g.userData.side*(.3+wind*.16*Math.sin(t*.5+g.userData.phase+i*.7)));
  plants.forEach((g,i)=>g.rotation.z=Math.sin(t*1.4+i*2)*.028*wind);
 }};
}
