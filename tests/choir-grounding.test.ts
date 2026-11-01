import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {CHOIR_GROUPS,choirGestureAt} from '../src/lantern/choir-groups.ts';
import {choirSupportPoints,choirGroundOffset,galleryFloorY,CHOIR_SCALE} from '../src/lantern/choir-grounding.ts';

test('the real swan belly clears each gallery across the composed poses and motion limits',async()=>{
 const bytes=await readFile(new URL('../public/models/swan.glb',import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);
 const vertices:number[]=[],point=new T.Vector3();
 gltf.scene.traverse(o=>{if(o instanceof T.Mesh&&o.name.startsWith('body_')){const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);vertices.push(point.x,point.y,point.z);}}});
 const position=new T.Float32BufferAttribute(vertices,3),support=choirSupportPoints(position);
 const restBox=new T.Box3().setFromBufferAttribute(position);
 assert.ok(.35+restBox.min.y*CHOIR_SCALE*.90<galleryFloorY(0)-.30,'the old bottom-row placement must reproduce the reported cut belly');
 for(let section=0;section<6;section++)for(const motion of [0,1,1.6])for(const time of [0,1,4.94,5.43,10.25,16,24,31.99]){
  const pose=choirGestureAt(time,section),shape=CHOIR_GROUPS[section]!.shape,floor=galleryFloorY(Math.floor(section/2));
  const offset=choirGroundOffset(support,shape[1],pose,motion);
  // Independently transform the full real torso, including vertices not used by
  // the support sampler, with the renderer's matrix order.
  const transform=new T.Matrix4().makeTranslation(0,floor,0)
   .multiply(new T.Matrix4().makeScale(CHOIR_SCALE,CHOIR_SCALE,CHOIR_SCALE))
   .multiply(new T.Matrix4().makeTranslation(0,offset,0))
   .multiply(new T.Matrix4().makeScale(...shape))
   .multiply(new T.Matrix4().makeTranslation(0,pose.bob*Math.min(1.4,motion),0))
   .multiply(new T.Matrix4().makeRotationX(-Math.min(1.48,pose.wing*motion)*.028))
   .multiply(new T.Matrix4().makeScale(1,1+Math.max(0,pose.wing-.04)*.012*motion,1));
  let bottom=Infinity;
  for(let i=0;i<position.count;i++)bottom=Math.min(bottom,point.fromBufferAttribute(position,i).applyMatrix4(transform).y);
  const intendedBob=pose.bob*Math.min(1.4,motion)*shape[1]*CHOIR_SCALE;
  assert.ok(bottom>=floor-.00001,`section ${section} penetrates at ${time}`);
  assert.ok(bottom-floor-intendedBob<.020,'a resting bird should not hover above the floor');
 }
});
