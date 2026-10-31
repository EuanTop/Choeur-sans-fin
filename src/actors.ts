import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ellipsoid,material,sphere} from './geometry.ts';
import {storyAt,bridgeHeight} from './story.ts';
import type {ArtState} from './state.ts';

export async function createActors(scene:T.Scene){
 const gltf=await new GLTFLoader().loadAsync('/models/swan.glb');
 const paper=new T.MeshPhysicalMaterial({color:'#fff0c7',roughness:.72,metalness:0,emissive:'#d77e32',emissiveIntensity:.13,side:T.DoubleSide});
 paper.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPaper;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPaper=position;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vPaper;').replace('#include <color_fragment>',`#include <color_fragment>
   float ribs=pow(.5+.5*cos(vPaper.z*47.+sin(vPaper.y*5.)*.3),28.);
   float grain=fract(sin(dot(floor(vPaper.xy*700.),vec2(12.9898,78.233)))*43758.5453);
   diffuseColor.rgb*=1.-.075*ribs+.022*(grain-.5);
  `);
 };
 const cream=material('#fff7db'),shadow=material('#d9ddcc'),bill=material('#ed922e'),black=material('#29203d');
 function swan(isPaper:boolean){
  const g=new T.Group();
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o=>{if(!(o instanceof T.Mesh))return;
   const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);
   const dark=o.name.startsWith('dark_'),orange=o.name.startsWith('beak_');
   const m=new T.Mesh(geo,dark?black:orange?bill:isPaper?paper:o.name.includes('underlayer')?shadow:cream);
   m.name=o.name;m.castShadow=true;m.receiveShadow=true;
   if(isPaper)m.layers.enable(1);
   g.add(m);
  });return g;
 }
 const hero=new T.Group();scene.add(hero);hero.scale.setScalar(1.12);hero.rotation.y=Math.PI/2;
 const shell=swan(true);shell.position.y=.30;hero.add(shell);
 const duck=new T.Group();hero.add(duck);duck.scale.setScalar(.61);duck.position.set(0,.15,.02);
 const yellow=material('#ffcd4e'),wing=material('#f2b93c');
 ellipsoid(duck,yellow,[.60,.60,.864],[0,.576,0]);
 const head=new T.Group();head.position.set(0,1.272,.432);duck.add(head);
 ellipsoid(head,yellow,[.528,.528,.552]);ellipsoid(head,bill,[.36,.132,.432],[0,-.096,.60]);
 for(const side of [-1,1]){
  ellipsoid(head,black,[.065,.079,.053],[side*.418,.12,.288]);
  ellipsoid(head,cream,[.014,.017,.009],[side*.432,.145,.333]);
  ellipsoid(duck,wing,[.216,.312,.576],[side*.55,.696,-.048]);
 }
 ellipsoid(duck,yellow,[.15,.17,.27],[0,.61,-.77]);
 duck.traverse(o=>{if(o instanceof T.Mesh)o.layers.enable(2);});
 const feet=[-1,1].map(side=>ellipsoid(hero,bill,[.17,.055,.29],[side*.25,.045,.24]));
 const mother=swan(false);mother.scale.setScalar(1.12);mother.rotation.y=-Math.PI/2;scene.add(mother);
 const cygnetMat=material('#bdb6d0'),cygnetWing=material('#d3ccdf');
 const children=[0,1,2].map(()=>{
  const g=new T.Group();scene.add(g);
  ellipsoid(g,cygnetMat,[.29,.25,.43],[0,.26,0]);
  ellipsoid(g,cygnetMat,[.16,.23,.17],[0,.43,.26]);
  const h=new T.Group();h.position.set(0,.66,.35);g.add(h);
  ellipsoid(h,cygnetMat,[.18,.18,.20]);ellipsoid(h,black,[.073,.037,.145],[0,-.02,.20]);
  for(const side of [-1,1]){ellipsoid(h,black,[.024,.026,.02],[side*.15,.04,.09]);ellipsoid(g,cygnetWing,[.095,.11,.28],[side*.25,.31,-.04]);ellipsoid(g,bill,[.085,.028,.13],[side*.12,.025,.08]);}
  return {root:g,head:h};
 });
 let currentTime=0;
 return {hero,shell,duck,feet,paper,mother,children,
  revealAnchor(){const p=new T.Vector3(0,.72,.1);return hero.localToWorld(p);},
  update(t:number,state:ArtState){
   currentTime=t;const p=storyAt(t),m=state.motion;
   hero.position.set(p.x,p.y+Math.abs(p.step)*.035*m,p.z);
   hero.rotation.z=p.step*.047*m;hero.rotation.x=Math.sin(t*2)*.011*m;
   shell.rotation.z=Math.sin(t*2.5+.3)*.014*m;
   head.rotation.y=(Math.sin(t*2.7)*.12+p.freeze*.3)*m;head.rotation.x=-p.freeze*.12*m;
   feet.forEach((foot,i)=>{const s=Math.sin(t*8.5+i*Math.PI)*(p.walking?1:0)*m;foot.position.y=.045+Math.max(0,s)*.13;foot.position.z=.24+s*.18;foot.rotation.x=-Math.max(0,s)*.35;});
   const mx=2.2+p.invite*.75;motherv(mx,2.6-p.invite*.27);
   mother.rotation.y=-Math.PI/2+p.invite*.34;mother.rotation.z=Math.sin(t*1.5)*.012*m;
   children.forEach((c,i)=>{
    const x=1.3+i*.62-p.curious*(.4+i*.09)+p.invite*.6;
    const z=3.15+(i%2)*.4-p.join*.2;
    c.root.position.set(x,bridgeHeight(x),z);c.root.rotation.y=-1.7+p.invite*.8;
    c.root.rotation.z=Math.sin(t*3+i)*.035*m;c.head.rotation.z=Math.sin(t*2.1+i)*.13*p.curious*m;
   });
   scene.updateMatrixWorld(true);
  },
  setPass(inner:boolean){shell.visible=!inner;duck.visible=inner;},
  get time(){return currentTime;}
 };
 function motherv(x:number,z:number){mother.position.set(x,bridgeHeight(x)+.03,z);}
}
