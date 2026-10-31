import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {RATIO,CENTRE,OFFSET,levelPose,zoomPose,duckPose} from '../src/lantern/cycle.ts';
import {DURATION} from '../src/state.ts';
import {createPumpkin,skinPoint} from '../src/lantern/pumpkin.ts';
import {solidRibbon} from '../src/lantern/geometry.ts';
import {mouthSection,fitHallPoint,hallDerivatives} from '../src/lantern/mouth-fit.ts';
import {PUMPKIN} from '../src/lantern/pumpkin.ts';
import {createDuck} from '../src/lantern/duck.ts';

test('one continuous pullback replaces each world with its parent without a scale cut',()=>{
 assert.ok(CENTRE.clone().multiplyScalar(RATIO).add(OFFSET).distanceTo(CENTRE)<1e-12);
 const before=zoomPose(DURATION-.000001),after=zoomPose(.000001);
 for(let level=-1;level<=2;level++){
  const previous=levelPose(level-1),next=levelPose(level);
  const pa=previous.position.clone().multiplyScalar(before.scale).add(before.position),pb=next.position.clone().multiplyScalar(after.scale).add(after.position);
  assert.ok(pa.distanceTo(pb)<.0001);
  assert.ok(Math.abs(previous.scale*before.scale-next.scale*after.scale)<.00001);
 }
 for(let t=0;t<DURATION;t+=.25){const a=zoomPose(t),b=zoomPose(t+.01);assert.ok(b.scale<a.scale,'the camera pullback must progress continuously');}
});

test('pumpkin has a real open mouth, a solid curved shell and finite surface normals',()=>{
 const pumpkin=createPumpkin();pumpkin.updateMatrixWorld(true);
 const cast=(x:number,y:number)=>new T.Raycaster(new T.Vector3(x,y,15),new T.Vector3(0,0,-1),0,30).intersectObject(pumpkin,true);
 assert.equal(cast(0,3.8).length,0,'the mouth must see through the shell, rather than hit an image plane');
 assert.ok(cast(6,4).length>0,'the cheek must remain a solid surface');
 assert.ok(cast(4.25,8.8).length>0,'a recessed light sits behind the eye opening');
 pumpkin.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const key of ['position','normal']){const a=o.geometry.attributes[key];assert.ok(a);for(const n of a!.array)assert.ok(Number.isFinite(n),`${key} must stay finite at poles and cut edges`);}});
 for(let y=-1;y<=11;y+=.1)assert.ok(Number.isFinite(skinPoint(0,y).z));
});

test('one tracked duck stays in its screen area and returns seamlessly to its pose',()=>{
 const character=createDuck();
 for(let t=0;t<DURATION;t+=.1){const p=duckPose(t);assert.ok(Math.abs(p.position.x)<.05);assert.ok(Math.abs(p.position.z-10)<.08);assert.equal(p.yaw,0);character.update(t,1.6);assert.ok(character.root.position.y<0);}
 const end=duckPose(DURATION-.001),start=duckPose(.001);assert.ok(end.position.distanceTo(start.position)<.003);
 character.update(0,0);const still=character.root.position.clone();character.update(16,0);assert.ok(still.distanceTo(character.root.position)<1e-12);
 character.update(4,1);const head=character.root.getObjectByName('head')!;assert.ok(head.rotation.y<-.5,'a cue must produce a clearly readable side glance');
 character.update(12,1);assert.ok(head.rotation.y>.5,'the answering phrase turns the other way');
});

test('continuous balcony solids have two faces per edge and no internal segment caps',()=>{
 const points=[new T.Vector3(0,1,0),new T.Vector3(.1,1,1),new T.Vector3(.4,1,2),new T.Vector3(.9,1,3)];
 const geometry=solidRibbon(points,2,.25),idx=geometry.index!,edges=new Map<string,number>();
 for(let i=0;i<idx.count;i+=3)for(const [a,b] of [[0,1],[1,2],[2,0]]){const x=idx.getX(i+a!),y=idx.getX(i+b!),key=[Math.min(x,y),Math.max(x,y)].join(':');edges.set(key,(edges.get(key)||0)+1);}
 for(const count of edges.values())assert.equal(count,2);
 assert.equal(idx.count/3,(points.length-1)*8+4);
});

test('arcades widen below the spring line and turn inward at the upper pumpkin arch',()=>{
 assert.ok(PUMPKIN.thickness>=.95,'carved skin must have a substantial inner wall');
 assert.ok(mouthSection(0).width>1.3);assert.ok(mouthSection(25).width<.85);
 for(let y=0;y<=25.2;y+=.6)for(let z=-35;z<=35;z+=2){
  const p=new T.Vector3(13,y,z),[x,dy,dz]=hallDerivatives(p) as [T.Vector3,T.Vector3,T.Vector3];
  assert.ok(x.dot(dy.clone().cross(dz))>.1,'the bend must not fold inside out');
  assert.ok(fitHallPoint(p).toArray().every(Number.isFinite));
 }
});
