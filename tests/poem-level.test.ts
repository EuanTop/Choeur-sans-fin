import test from 'node:test';
import assert from 'node:assert/strict';
import {blendSample} from '../src/music/level.ts';
import {createMusicPlayer} from '../src/music/soundtrack.ts';
import {BASE_AUDIO_VERSION,poemVersionFor,musicVersionFor} from '../src/music/score.ts';

test('poem gain leaves music alone, mutes at zero and keeps amplified peaks bounded',()=>{
 for(const a of [-.86,-.1,0,.2,.86])assert.equal(blendSample(a,.3,0),a);
 assert.equal(blendSample(.1,.1,2),.1+.1*2);
 for(const level of [0,1,1.25,3])for(const a of [-.86,0,.86])for(const b of [-.8,0,.8])assert.ok(Math.abs(blendSample(a,b,level))<=1);
 assert.notEqual(musicVersionFor('Voice B',1),musicVersionFor('Voice B',1.25));
});
test('adjusting poem gain changes its gain node without restarting either synchronized stem',async()=>{
 const originalContext=globalThis.AudioContext,originalFetch=globalThis.fetch;let starts=0,stops=0;const ramps:number[]=[],gains:any[]=[];
 class Context{
  state='running';currentTime=0;destination={};
  async resume(){} async close(){} async decodeAudioData(){return {duration:32};}
  createGain(){const n={gain:{value:1,setTargetAtTime(v:number){ramps.push(v);}},connect(){return this;},disconnect(){}};gains.push(n);return n;}
  createWaveShaper(){return {curve:null,connect(){return this;}};}
  createBufferSource(){return {buffer:null,loop:false,connect(){},disconnect(){},start(){starts++;},stop(){stops++;}};}
 }
 globalThis.AudioContext=Context as unknown as typeof AudioContext;
 globalThis.fetch=(async(input:any)=>new Response(new Uint8Array(8),{headers:{'X-Music-Version':String(input).includes('/base')?BASE_AUDIO_VERSION:poemVersionFor('Voice B')}})) as typeof fetch;
 const player=createMusicPlayer();
 try{
  await player.unlock('Voice B');player.update(4,false,true,'Voice B',1.25);assert.equal(starts,2);
  player.update(4,false,true,'Voice B',2);assert.equal(starts,2);assert.equal(stops,0);assert.equal(ramps.at(-1),2);
  assert.equal(gains[0].gain.value,.25,'the music output headroom gain remains fixed');
  player.update(4,false,true,'Voice B',0);assert.equal(ramps.at(-1),0);assert.equal(starts,2);
 }finally{player.dispose();globalThis.AudioContext=originalContext;globalThis.fetch=originalFetch;}
});
