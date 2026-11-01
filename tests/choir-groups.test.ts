import test from 'node:test';
import assert from 'node:assert/strict';
import {CHOIR_GROUPS,choirSection,choirGestureAt} from '../src/lantern/choir-groups.ts';
import {vocalActivityAt,CHOIR_PARTS} from '../src/music/arrangement.ts';

test('gallery sections map to six real voices and three consistent silhouettes',()=>{
 assert.equal(CHOIR_GROUPS.length,CHOIR_PARTS.length);
 for(let row=0;row<3;row++){
  assert.equal(choirSection(row,-1),row*2);assert.equal(choirSection(row,1),row*2+1);
  assert.deepEqual(CHOIR_GROUPS[row*2]!.shape,CHOIR_GROUPS[row*2+1]!.shape);
 }
 assert.equal(new Set(CHOIR_GROUPS.map(g=>g.family)).size,3);
 for(const g of CHOIR_GROUPS)assert.ok(g.shape.every(v=>v>=.85&&v<=1.15));
});
test('part choreography rests with its voice, stays bounded and closes the loop',()=>{
 for(let section=0;section<6;section++)for(let t=0;t<32;t+=.05){
  const q=choirGestureAt(t,section),next=choirGestureAt(t+32,section);
  for(const key of ['wing','spread','head','bob'] as const){assert.ok(Number.isFinite(q[key]));assert.ok(Math.abs(q[key]-next[key])<1e-8);}
  assert.ok(q.wing>=0&&q.wing<=1.55);assert.ok(q.spread>=0&&q.spread<=1.04);assert.ok(q.head<=0&&q.head>=-.62);assert.ok(q.bob>=0&&q.bob<=.06);
  if(vocalActivityAt(t,section)<1e-7)assert.deepEqual(q,{wing:.04,spread:0,head:0,bob:0});
 }
});
test('lead phrases get a broad stroke while soprano replies get two distinct strokes',()=>{
 assert.ok(choirGestureAt(4.94,2).wing>choirGestureAt(4.5,2).wing+.5);
 const length=.75*.90/2;
 const first=choirGestureAt(4.25+length/2,4).wing,gap=choirGestureAt(4.25+length,4).wing,second=choirGestureAt(4.25+length*1.5,4).wing;
 assert.ok(first>gap+.4);assert.ok(second>gap+.3);
});
