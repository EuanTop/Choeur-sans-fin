import test from 'node:test';
import {readFileSync,lstatSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {VOICE_NAMES,takeFor,POEM_CUES,cuesFor,narrationEnd,riverPoemPose,riverPoemText} from '../src/music/poem.ts';
import {musicVersionFor} from '../src/music/score.ts';

test('the approved take keeps all source phrases and rejects unpublished alternatives',()=>{
 assert.deepEqual(VOICE_NAMES,['Voice B']);
 assert.equal(new Set(VOICE_NAMES.map(musicVersionFor)).size,1);
 assert.throws(()=>musicVersionFor('Voice A'));assert.throws(()=>musicVersionFor('Voice C'));
 for(const voice of VOICE_NAMES)for(const [i,c] of cuesFor(voice).entries()){
  assert.ok(c.sourceStart>=0&&c.sourceEnd>c.sourceStart);
  assert.ok(narrationEnd(c)<c.holdEnd,'the poem remains visible until its voice finishes');
  if(i)assert.ok(cuesFor(voice)[i-1]!.sourceEnd<=c.sourceStart,'never repeat a source word');
 }
 assert.throws(()=>musicVersionFor('../Downloads/private.wav'));
});
test('river lettering stays ahead of the duck and closes invisibly at the loop',()=>{
 for(let index=0;index<POEM_CUES.length;index++){
  for(let t=0;t<32;t+=.025){
   const a=riverPoemPose(t,index),b=riverPoemPose(t+32,index);
   assert.equal(a.visible,b.visible);assert.ok(Math.abs(a.z-b.z)<1e-8);assert.ok(Math.abs(a.alpha-b.alpha)<1e-8);
   assert.ok(a.alpha>=0&&a.alpha<=.64);
   assert.equal(a.z,13);
  }
  assert.equal(riverPoemPose(0,index).visible,false);assert.equal(riverPoemPose(31.99,index).visible,false);
 }
});

test('river text removes punctuation but retains French word apostrophes',()=>{
 for(const c of POEM_CUES)assert.ok(!/[.,;:!?…]/u.test(riverPoemText(c.text)));
 assert.ok(riverPoemText(POEM_CUES[4].text).includes('m’éloigne'));
});

test('the selected narration is a self-contained runtime asset with the approved bytes',()=>{
 const path=new URL('../public'+takeFor('Voice B').url,import.meta.url);
 assert.equal(lstatSync(path).isSymbolicLink(),false);
 assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),takeFor('Voice B').sha256);
 assert.deepEqual(readdirSync(new URL('../public/audio/',import.meta.url)).filter(f=>/\.(wav|mp3)$/i.test(f)),['poem-fr-b.wav']);
});
