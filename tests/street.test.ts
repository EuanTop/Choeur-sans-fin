import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {bridgePoint,bridgeTangent,bridgeSide} from '../src/bridge-path.ts';
import {storyAt,doorClosure,segmentZ} from '../src/story.ts';
import {defaults,DURATION} from '../src/state.ts';
import {createDuck} from '../src/actors.ts';

test('the winding bridge repeats without a position or tangent kink',()=>{
 let min=Infinity,max=-Infinity;
 for(let s=0;s<=DURATION;s+=.125){
  const p=bridgePoint(s),next=bridgePoint(s+32);
  min=Math.min(min,p.x);max=Math.max(max,p.x);
  assert.ok(Math.abs(next.x-p.x)<1e-10);
  assert.ok(Math.abs(next.y-p.y)<1e-10);
  assert.ok(bridgeTangent(s).distanceTo(bridgeTangent(s+32))<1e-10);
  assert.ok(Math.abs(bridgeTangent(s).dot(bridgeSide(s)))<1e-10);
 }
 assert.ok(max-min>4,'the route must visibly wind, rather than be a straight corridor');
 const signature=(time:number)=>Array.from({length:6},(_,i)=>({z:segmentZ(i,time),variant:i%2})).sort((a,b)=>a.z-b.z);
 assert.deepEqual(signature(0),signature(DURATION),'recycled houses must retain their variant at the seam');
});

test('hood slips before doors close, with staggered and hesitant closures',()=>{
 assert.ok(storyAt(8).slip>.9);
 assert.equal(doorClosure(8,0),0);
 const mid=Array.from({length:8},(_,i)=>doorClosure(10,i));
 assert.ok(mid.some(v=>v>.99));
 assert.ok(mid.some(v=>v>.1&&v<.75));
 assert.ok(new Set(mid.map(v=>v.toFixed(2))).size>=4);
 for(let i=0;i<8;i++){
  assert.equal(doorClosure(15,i),1);
  assert.equal(doorClosure(27,i),0);
 }
 assert.ok(storyAt(19).reach>.9);
 assert.equal(storyAt(24).slip,0);
});

test('duck stays on the winding bridge and its webbed feet do not sink',()=>{
 const duck=createDuck(new T.Scene());
 for(const motion of [0,1,1.6])for(let t=0;t<DURATION;t+=.125){
  duck.update(t,{...defaults,motion});duck.root.updateMatrixWorld(true);
  const p=bridgePoint(storyAt(t).travel);
  assert.ok(Math.abs(duck.root.position.x-p.x)<1e-10);
  for(const foot of duck.feet){
   foot.traverse(o=>{
    if(!(o instanceof T.Mesh))return;
    o.geometry.computeBoundingBox();const bounds=o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld);
    assert.ok(bounds.min.y>p.y-.025,`foot sinks at ${t}s / ${motion}`);
   });
  }
 }
 const snapshot=(t:number)=>{duck.update(t,defaults);duck.root.updateMatrixWorld(true);return [duck.root,...duck.feet,duck.hood].map(o=>o.matrixWorld.elements.slice());};
 const a=snapshot(DURATION-.001),b=snapshot(.001);
 for(let i=0;i<a.length;i++)for(let j=0;j<16;j++)assert.ok(Math.abs(a[i]![j]!-b[i]![j]!)<.02,'the pose must be continuous across the loop');
});
