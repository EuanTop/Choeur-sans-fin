import {DURATION} from '../state.ts';
import {takeFor,cuesFor} from './poem.ts';
import {hallImpulse} from './hall.ts';

/** The orchestra stays at unity; speech becomes a distant part of its acoustic field. */
export async function renderSpokenPoem(music:AudioBuffer,voiceName:string){
 const sr=music.sampleRate,total=DURATION*3,c=new OfflineAudioContext(2,total*sr,sr),take=takeFor(voiceName),cues=cuesFor(voiceName);
 const response=await fetch(take.url);if(!response.ok)throw Error('The French recording is missing: '+take.url);
 const bytes=await response.arrayBuffer();
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
 if(digest!==take.sha256)throw Error('The French recording changed; realign the poem before rendering');
 const voice=await c.decodeAudioData(bytes);if(voice.duration<cues.at(-1)!.sourceEnd)throw Error('The French recording is incomplete');
 let squares=0,count=0;const samples=voice.getChannelData(0);
 for(const q of cues)for(let i=Math.floor(q.sourceStart*sr);i<Math.floor(q.sourceEnd*sr);i++){const v=samples[i]!;if(Math.abs(v)>.008){squares+=v*v;count++;}}
 const match=Math.max(.5,Math.min(2,.14/Math.sqrt(squares/Math.max(1,count))));
 const input=c.createGain(),high=c.createBiquadFilter(),soft=c.createBiquadFilter(),presence=c.createBiquadFilter(),compress=c.createDynamicsCompressor(),pan=c.createStereoPanner(),dry=c.createGain();
 input.gain.value=match;high.type='highpass';high.frequency.value=160;soft.type='lowpass';soft.frequency.value=6500;
 presence.type='peaking';presence.frequency.value=2600;presence.Q.value=.7;presence.gain.value=-1;
 compress.threshold.value=-22;compress.knee.value=16;compress.ratio.value=2;compress.attack.value=.025;compress.release.value=.20;
 input.connect(high).connect(soft).connect(presence).connect(compress).connect(pan);
 const orbit=Float32Array.from({length:total*48+1},(_,i)=>.16*Math.sin(i/48/DURATION*Math.PI*2));pan.pan.setValueCurveAtTime(orbit,0,total);
 dry.gain.value=.65;pan.connect(dry).connect(c.destination);
 let seed=7919;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1;};
 const pre=c.createDelay(.2),room=c.createConvolver(),hp=c.createBiquadFilter(),lp=c.createBiquadFilter(),wet=c.createGain();
 pre.delayTime.value=.035;room.buffer=hallImpulse(c,random);hp.type='highpass';hp.frequency.value=135;lp.type='lowpass';lp.frequency.value=4800;wet.gain.value=.20;
 pan.connect(pre).connect(room).connect(hp).connect(lp).connect(wet).connect(c.destination);
 for(let lap=0;lap<3;lap++)for(const cue of cues){
  const source=c.createBufferSource(),edge=c.createGain(),duration=cue.sourceEnd-cue.sourceStart,t=lap*DURATION+cue.start;source.buffer=voice;
  edge.gain.setValueAtTime(0,t);edge.gain.linearRampToValueAtTime(1,t+.012);edge.gain.setValueAtTime(1,t+duration-.045);edge.gain.linearRampToValueAtTime(0,t+duration);
  source.connect(edge).connect(input);source.start(t,cue.sourceStart,duration);
 }
 const raw=await c.startRendering(),result=new AudioBuffer({numberOfChannels:2,length:DURATION*sr,sampleRate:sr});
 // Match only the spoken contribution, never the music bus.
 // The selected recording retains its own dynamic contour.
 let speechEnergy=0,musicEnergy=0;
 for(let ch=0;ch<2;ch++){
  const speech=raw.getChannelData(ch).subarray(DURATION*sr,DURATION*2*sr),score=music.getChannelData(ch);
  for(const cue of cues)for(let i=Math.round(cue.start*sr);i<Math.round((cue.start+cue.sourceEnd-cue.sourceStart+.5)*sr);i++){
   speechEnergy+=speech[i]!**2;musicEnergy+=score[i]!**2;
  }
 }
 const speechGain=.52*Math.sqrt(musicEnergy/Math.max(1e-10,speechEnergy));
 for(let ch=0;ch<2;ch++){
  const speech=raw.getChannelData(ch).subarray(DURATION*sr,DURATION*2*sr),out=result.getChannelData(ch);
  for(let i=0;i<out.length;i++)out[i]=speech[i]!*speechGain;
 }
 return result;
}
