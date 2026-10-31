import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {RATIO,CENTRE,OFFSET,levelPose,zoomPose,duckPose} from '../src/lantern/cycle.ts';
import {DURATION} from '../src/state.ts';
import {createPumpkin,skinPoint} from '../src/lantern/pumpkin.ts';
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

test('the swimming passenger follows a closed route and stays safely in front of the shell',()=>{
 const character=createDuck();
 for(let t=0;t<DURATION;t+=.1){const p=duckPose(t);assert.ok(p.position.z>=7.4);assert.ok(Number.isFinite(p.yaw));character.update(t,1.6);assert.ok(character.root.position.y<0,'water must cover the lower body');}
 const end=duckPose(DURATION-.001),start=duckPose(.001);assert.ok(end.position.distanceTo(start.position)<.003);assert.ok(end.tangent.distanceTo(start.tangent)<.003);
 character.update(0,0);const still=character.root.position.clone();character.update(16,0);assert.ok(still.distanceTo(character.root.position)<1e-12,'zero motion must stop the passenger');
});
