import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {block,ellipsoid,material,plaster,batchStatic} from './geometry.ts';
import {createHouse,arch,updatePlantBreeze} from './architecture.ts';
import {createWaterDetails} from './water-details.ts';
import {segmentZ,storyAt,TAU,STREET_PERIOD} from './story.ts';
import {bridgePoint,bridgeSide,bridgeTangent,canalCentre} from './bridge-path.ts';
import type {SwanMaker} from './swans.ts';

const UP=new T.Vector3(0,1,0);
function ribbon(base:number,width:number,sideWalls=false){
 const vertices:number[]=[],indices:number[]=[],steps=64;
 for(let i=0;i<=steps;i++){
  const s=base-8+i*.25,p=bridgePoint(s),normal=bridgeSide(s);
  const floor=-.28+.90*Math.sin(s*Math.PI/8)**2;
  for(const side of [-1,1]){
   const v=p.clone().addScaledVector(normal,side*width/2);
   vertices.push(v.x,sideWalls?floor:p.y,v.z-base);
   if(sideWalls)vertices.push(v.x,p.y,v.z-base);
  }
 }
 const stride=sideWalls?4:2;
 for(let i=0;i<steps;i++){
  const a=i*stride,b=a+stride;
  if(sideWalls){indices.push(a,a+1,b,a+1,b+1,b,a+2,b+2,a+3,a+3,b+2,b+3);}
  else indices.push(a,b,a+1,a+1,b,b+1);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function createTown(scene:T.Scene,swan:SwanMaker){
 const stone=plaster('#b5a295'),parapet=plaster('#c9b39e'),ground=plaster('#a18d8d');stone.side=T.DoubleSide;
 const pavingMat=plaster('#bfa18d'),paverGeometry=new T.BoxGeometry(1,1,1);
 const modules=Array.from({length:6},(_,index)=>{
  const base=index*16,g=new T.Group();g.name='curved-quarter-'+index;scene.add(g);
  const masonry=new T.Group();g.add(masonry);
  for(const side of [-1,1]){
   const shape=new T.Shape();
   for(let i=0;i<=64;i++){
    const s=base-8+i*.25,x=canalCentre(s)+side*2.65;
    if(i===0)shape.moveTo(x,8);else shape.lineTo(x,8-i*.25);
   }
   shape.lineTo(side*24,-8);shape.lineTo(side*24,8);shape.closePath();
   const bank=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.65,bevelEnabled:false}),ground);bank.rotation.x=-Math.PI/2;bank.receiveShadow=true;masonry.add(bank);
  }
  const deck=new T.Mesh(ribbon(base,2.85),pavingMat);deck.receiveShadow=true;masonry.add(deck);
  const bridgeWall=new T.Mesh(ribbon(base,2.88,true),stone);bridgeWall.castShadow=true;bridgeWall.receiveShadow=true;masonry.add(bridgeWall);
  const matrix=new T.Matrix4(),quat=new T.Quaternion(),scale=new T.Vector3(.445,.045,.34),color=new T.Color();
  const pavers=new T.InstancedMesh(paverGeometry,pavingMat,44*6);pavers.receiveShadow=true;let tile=0;
  for(let i=0;i<44;i++){
   const s=base-8+(i+.5)*16/44,p=bridgePoint(s),normal=bridgeSide(s),angle=Math.atan2(bridgeTangent(s).x,bridgeTangent(s).z);
   quat.setFromAxisAngle(UP,angle);
   for(let c=0;c<6;c++){
    const v=p.clone().addScaledVector(normal,(c-2.5)*.465+(i%2?.08:-.08)+Math.sin(i*13+c)*.008);v.y+=.007;v.z-=base;
    v.y+=Math.sin(i*11+c*7)*.0015;
    quat.setFromAxisAngle(UP,angle+Math.sin(i*23+c*13)*.025);
    scale.set(.452+Math.sin(i*17+c*7)*.005,.018,.352+Math.cos(i*7+c*3)*.005);matrix.compose(v,quat,scale);pavers.setMatrixAt(tile,matrix);color.setScalar(.97+Math.sin(i*13+c*7)*.025);pavers.setColorAt(tile++,color);
   }
  }
  g.add(pavers);
  for(let i=0;i<32;i++){
   const s=base-8+i*.5,p=bridgePoint(s),normal=bridgeSide(s),angle=Math.atan2(bridgeTangent(s).x,bridgeTangent(s).z);
   for(const side of [-1,1]){
    const v=p.clone().addScaledVector(normal,side*1.43);v.y+=.125;v.z-=base;
    const curb=block(masonry,parapet,[.22,.25,.47],v.toArray());curb.rotation.y=angle;
   }
  }
  batchStatic(masonry);
  const skyline=new T.Group();g.add(skyline);
  const cypressMat=material('#334638'),trunkMat=material('#634948');
  for(const [x,z,h] of [[-7.1,-3.0,8.0],[7.5,-7.5,8.8],[-8.0,5.2,7.5]]){
   block(skyline,trunkMat,[.10,h!*.30,.10],[x!,h!*.15,z!]);
   for(let j=0;j<8;j++){const y=.85+j*h!*.105,r=.54*(1-j*.073);ellipsoid(skyline,cypressMat,[r,h!*.17,r*.9],[x!+Math.sin(j*2.4)*r*.22,y,z!+Math.cos(j*1.8)*.10]);}
  }
  if(index%2===1){
   const towerWall=plaster('#72547b'),towerRoof=material('#85504f'),lit=new T.MeshBasicMaterial({color:'#efad62'});
   block(skyline,towerWall,[1.45,9.5,1.5],[-4.9,5.40,-3.6]);block(skyline,parapet,[1.8,.15,1.85],[-4.9,9.2,-3.6]);
   const roof=new T.Mesh(new T.ConeGeometry(1.37,1.6,4),towerRoof);roof.rotation.y=Math.PI/4;roof.position.set(-4.9,10.8,-3.6);skyline.add(roof);
   for(const y of [5.4,8.0]){const opening=new T.Mesh(new T.ShapeGeometry(arch(.42,1.12)),lit);opening.position.set(-4.9,y,-2.83);skyline.add(opening);}
  }
  batchStatic(skyline);
  const houses=[
   {side:-1,z:2.8,variant:index%2,yaw:.52},
   {side:1,z:-1.9,variant:(index+1)%2,yaw:-.62},
   {side:-1,z:-5.8,variant:(index+1)%2,yaw:.30},
   {side:1,z:-9.2,variant:index%2,yaw:-.40},
  ].map((h,hi)=>{
   const house=createHouse(swan,h.variant,h.side,index%2*4+hi),s=base+h.z;
   house.root.scale.set(.68,1,.85);house.root.rotation.y=h.yaw;
   house.root.position.set(canalCentre(s)+h.side*(h.side===1?5.2:5.5),.65,h.z);
   g.add(house.root);return house;
  });
  return {g,houses};
 });

 // A distant bell tower and cypresses anchor the layered skyline.
 const distant=new T.Group();scene.add(distant);
 const farWall=plaster('#79638b'),farRoof=material('#815262'),farLeaf=material('#34444c'),farLight=new T.MeshBasicMaterial({color:'#edaa62'});
 block(distant,farWall,[2.2,13.0,2.2],[-1.0,6.5,-38]);block(distant,parapet,[2.6,.18,2.6],[-1.0,11.0,-38]);
 const cone=new T.Mesh(new T.ConeGeometry(1.95,2.8,4),farRoof);cone.rotation.y=Math.PI/4;cone.position.set(-1,14.4,-38);distant.add(cone);
 for(const y of [5,8,11.6]){const opening=new T.Mesh(new T.ShapeGeometry(arch(.58,1.3)),farLight);opening.position.set(-1,y,-36.88);distant.add(opening);}
 for(const [x,z,h] of [[-3.8,-35,11],[2.6,-36,12],[5.4,-42,14]]){
  for(let j=0;j<9;j++){const r=.65*(1-j*.075);ellipsoid(distant,farLeaf,[r,h!*.14,r],[x!+Math.sin(j*2.1)*r*.2,1+j*h!*.10,z!]);}
 }
 batchStatic(distant);
 const bellPivot=new T.Group();bellPivot.position.set(-1,9.0,-36.72);scene.add(bellPivot);
 const bell=new T.Mesh(new T.LatheGeometry([new T.Vector2(.02,0),new T.Vector2(.09,-.06),new T.Vector2(.10,-.20),new T.Vector2(.17,-.34),new T.Vector2(.22,-.36)],16),material('#665347',.6));bellPivot.add(bell);
 const bellClapper=new T.Mesh(new T.SphereGeometry(.045,8,6),material('#9e7852'));bellClapper.position.y=-.39;bellPivot.add(bellClapper);

 const water=new Reflector(new T.PlaneGeometry(48,240),{textureWidth:768,textureHeight:1024,multisample:0,color:'#62506e'});
 water.position.set(0,-.26,-55);water.rotation.x=-Math.PI/2;scene.add(water);
 const wm=water.material as T.ShaderMaterial;
 wm.uniforms.uPhase={value:0};wm.uniforms.uWind={value:1};wm.uniforms.fogColor={value:new T.Color('#705371')};
 wm.vertexShader=wm.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv;varying vec3 vWorld;varying float vDepth;').replace('vUv = textureMatrix * vec4( position, 1.0 );','vUv = textureMatrix * vec4( position, 1.0 );vWorld=(modelMatrix*vec4(position,1.)).xyz;vDepth=-(modelViewMatrix*vec4(position,1.)).z;');
 wm.fragmentShader=wm.fragmentShader.replace('uniform vec3 color;','uniform vec3 color;uniform float uPhase;uniform float uWind;uniform vec3 fogColor;varying vec3 vWorld;varying float vDepth;').replace('vec4 base = texture2DProj( tDiffuse, vUv );',`vec4 wave=vUv;
  float drift=sin(vWorld.z*5.8+sin(vWorld.x*2.1)+uPhase*4.);
  wave.x+=wave.w*.0028*uWind*drift;
  wave.y+=wave.w*.0010*uWind*sin(vWorld.x*5.4-uPhase*3.);
  vec2 reflectionUv=wave.xy/wave.w;
  vec2 roughness=vec2(.0015,.0045)*(1.+.2*sin(vWorld.z*.9+uPhase));
  vec4 base=texture2D(tDiffuse,reflectionUv)*.28;
  base+=texture2D(tDiffuse,reflectionUv+roughness)*.18;
  base+=texture2D(tDiffuse,reflectionUv-roughness)*.18;
  base+=texture2D(tDiffuse,reflectionUv+roughness*vec2(-1.,1.))*.18;
  base+=texture2D(tDiffuse,reflectionUv+roughness*vec2(1.,-1.))*.18;`).replace('blendOverlay( base.rgb, color )','mix(vec3(.042,.022,.095),base.rgb,.64)').replace('#include <tonemapping_fragment>',`gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,smoothstep(20.,65.,vDepth));
  #include <tonemapping_fragment>`);

 const windowLights=Array.from({length:6},()=>{const l=new T.PointLight('#ff9b35',7,9,2);scene.add(l);return l;});
 const portalLights=Array.from({length:2},()=>{const l=new T.SpotLight('#ffab4e',42,11,.88,.62,2);l.castShadow=true;l.shadow.mapSize.set(512,512);l.shadow.camera.near=.05;l.shadow.normalBias=.028;l.shadow.bias=-.00015;l.shadow.radius=3;l.shadow.blurSamples=6;scene.add(l,l.target);return l;});
 const waterDetails=createWaterDetails(scene);
 let lastTime=0;
 return {water,modules,update(t:number,wind:number,light:number){
  lastTime=t;const p=storyAt(t),hero=bridgePoint(p.travel),duckAt=new T.Vector3(hero.x,hero.y+1,0),anchors:{position:T.Vector3;open:number;portal:{position:T.Vector3;target:T.Vector3}}[]=[];
  bellPivot.rotation.z=.22*Math.sin(p.phase*3);
  updatePlantBreeze(t,wind);waterDetails.update(t,wind);
  modules.forEach((m,i)=>{
   m.g.position.z=segmentZ(i,t);m.houses.forEach(h=>h.update(t,wind,light,duckAt));m.g.updateMatrixWorld(true);
   for(const house of m.houses){const pos=house.anchor();house.residents.forEach(r=>r.actor.root.visible=pos.z>-24&&pos.z<7);if(pos.z>-12&&pos.z<6)anchors.push({position:pos.clone(),open:1-house.doorState(t),portal:house.portal()});}
  });
  anchors.sort((a,b)=>a.position.distanceToSquared(new T.Vector3(hero.x,1.5,0))-b.position.distanceToSquared(new T.Vector3(hero.x,1.5,0)));
  windowLights.forEach((l,i)=>{const a=anchors[i];l.visible=Boolean(a);if(a){l.position.copy(a.position);const distance=a.position.distanceTo(duckAt),fade=1-T.MathUtils.smoothstep(distance,4,10);l.intensity=light*(7*a.open*a.open+.5)*fade;}});
  portalLights.forEach((l,i)=>{const a=anchors[i];l.visible=Boolean(a);if(a){l.position.copy(a.portal.position);l.target.position.copy(a.portal.target);l.intensity=42*light*(.1+.9*a.open*a.open);}});
  wm.uniforms.uPhase!.value=p.phase;wm.uniforms.uWind!.value=wind;
 },diagnostics(){return {streetPeriod:STREET_PERIOD,travel:storyAt(lastTime).travel,modulePositions:modules.map(m=>m.g.position.z),indoorResidents:modules.reduce((sum,m)=>sum+m.houses.reduce((n,h)=>n+h.residents.length,0),0),doorClosure:modules[0]!.houses[0]!.doorState(lastTime),houseProfiles:modules[0]!.houses.map(h=>({...h.profile,closure:h.doorState(lastTime)}))};}};
}
