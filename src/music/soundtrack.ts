import {DURATION} from '../state.ts';
import {PERFORMANCE_CUES} from '../lantern/performance.ts';
import {CHORDS,MUSIC_VERSION} from './score.ts';

const SAMPLE_RATE=44100;
const hz=(midi:number)=>440*2**((midi-69)/12);
let pending:Promise<AudioBuffer>|undefined;
/** Three identical performances with finite reverb/delay tails; retain the settled middle lap. */
export function renderSoundtrack(){
 return pending??=synthesize().catch(e=>{pending=undefined;throw e;});
}
async function synthesize(){
 const c=new OfflineAudioContext(2,DURATION*3*SAMPLE_RATE,SAMPLE_RATE);
 const master=c.createGain();master.gain.value=.68;
 const compressor=c.createDynamicsCompressor();compressor.threshold.value=-20;compressor.knee.value=16;compressor.ratio.value=2.2;compressor.attack.value=.024;compressor.release.value=.23;master.connect(compressor).connect(c.destination);
 const reverb=c.createConvolver(),ir=c.createBuffer(2,Math.floor(SAMPLE_RATE*2.8),SAMPLE_RATE);
 let seed=314159;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1;};
 for(let ch=0;ch<2;ch++){const a=ir.getChannelData(ch);let low=0;for(let i=0;i<a.length;i++){const t=i/SAMPLE_RATE;low=.63*low+.37*random();a[i]=low*Math.exp(-t*2.5)*(.25+.75*Math.min(1,t/.06));}}
 reverb.buffer=ir;const wet=c.createGain();wet.gain.value=.23;reverb.connect(wet).connect(master);
 const delayL=c.createDelay(1),delayR=c.createDelay(1);delayL.delayTime.value=1/3;delayR.delayTime.value=2/3;
 for(const [node,pan] of [[delayL,-.65],[delayR,.65]] as const){const g=c.createGain(),p=c.createStereoPanner();g.gain.value=.075;p.pan.value=pan;node.connect(g).connect(p).connect(master);}
 function outlet(pan:number,send=.3){const input=c.createGain(),p=c.createStereoPanner(),dry=c.createGain(),fx=c.createGain();p.pan.value=pan;dry.gain.value=.94;fx.gain.value=send;input.connect(p);p.connect(dry).connect(master);p.connect(fx).connect(reverb);fx.connect(delayL);fx.connect(delayR);return input;}
 function envelope(node:GainNode,start:number,duration:number,gain:number,attack:number,release:number){const g=node.gain;g.setValueAtTime(0,start);g.linearRampToValueAtTime(gain,start+attack);g.setValueAtTime(gain*.83,start+Math.max(attack,duration-release));g.linearRampToValueAtTime(0,start+duration);}
 const organWave=c.createPeriodicWave(new Float32Array(9),new Float32Array([0,1,.22,.50,.10,.16,.04,.035,.02]));
 function organ(note:number,start:number,duration:number,gain:number,pan:number){
  const o=c.createOscillator(),filter=c.createBiquadFilter(),g=c.createGain();o.setPeriodicWave(organWave);o.frequency.value=hz(note);filter.type='lowpass';filter.frequency.value=note<48?550:2600;filter.Q.value=.4;envelope(g,start,duration,gain,.025,Math.min(.18,duration*.4));o.connect(filter).connect(g).connect(outlet(pan,.22));o.start(start);o.stop(start+duration+.01);
 }
 function voice(note:number,start:number,duration:number,gain:number,pan:number,bright=false){
  const out=c.createGain(),level=c.createGain();envelope(level,start,duration,gain,bright?.09:.32,bright?.28:.48);out.connect(level).connect(outlet(pan,.52));
  const source=c.createGain();source.gain.value=.45;
  for(const detune of [-3.5,3.5]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=hz(note);o.detune.value=detune;o.connect(source);o.start(start);o.stop(start+duration+.01);}
  // A /ɑ/ vowel bank: a shared breath, rather than a synthetic bell melody.
  for(const [frequency,q,weight] of [[780,4.8,.72],[1180,6.5,.37],[2750,8,.075]]){const f=c.createBiquadFilter(),g=c.createGain();f.type='bandpass';f.frequency.setValueAtTime(frequency!*(bright?1.06:1),start);f.Q.value=q!;g.gain.value=weight!;source.connect(f).connect(g).connect(out);}
  const chest=c.createBiquadFilter(),chestGain=c.createGain();chest.type='lowpass';chest.frequency.value=430;chestGain.gain.value=.095;source.connect(chest).connect(chestGain).connect(out);
 }
 function quack(note:number,start:number,side:number){
  const o=c.createOscillator(),source=c.createGain(),env=c.createGain();o.type='sawtooth';const f=hz(note);o.frequency.setValueAtTime(f*1.10,start);o.frequency.exponentialRampToValueAtTime(f*.82,start+.065);o.frequency.exponentialRampToValueAtTime(f,start+.15);source.gain.value=.44;
  for(const [a,b,q,gain] of [[850,1120,5.5,.8],[1750,1400,7,.25]]){const filter=c.createBiquadFilter(),g=c.createGain();filter.type='bandpass';filter.frequency.setValueAtTime(a!,start);filter.frequency.exponentialRampToValueAtTime(b!,start+.13);filter.Q.value=q!;g.gain.value=gain!;source.connect(filter).connect(g).connect(env);}
  envelope(env,start,.17,.32,.012,.085);o.connect(source);env.connect(outlet(side*.16,.32));o.start(start);o.stop(start+.18);
 }
 for(let lap=0;lap<3;lap++){
  const offset=lap*DURATION;
  CHORDS.forEach((chord,bar)=>{
   const t=offset+bar*2,energy=.85+.15*Math.sin(bar/16*Math.PI);
   chord.notes.forEach((note,i)=>voice(note,t+i*.007,2.42,.10*energy*(i===4?.57:1),-.66+i*.33));
   // Rounded bass and a light, swung organ pulse leave room for the choir.
   organ(chord.bass,t+.025,1.12,.23,0);organ(chord.bass+7,t+4/3,.50,.11,0);
   for(const [beat,velocity] of [[0,.043],[2/3,.024],[5/3,.035]])for(const note of chord.notes.slice(1,4))organ(note,t+beat!+.022,.25,velocity!*energy,Math.sin(bar*.7)*.32);
  });
  // One short motif recurs in four harmonic settings; the calls take the gaps.
  for(let phrase=0;phrase<4;phrase++){
   const start=phrase*8;
   const motif=[{t:.25,index:1,d:.55},{t:1,index:2,d:.48},{t:1+2/3,index:3,d:.62},{t:2+2/3,index:2,d:.77}];
   for(const n of motif){const chord=CHORDS[Math.floor((start+n.t)/2)]!,pitch=chord.notes[n.index]!;organ(pitch,offset+start+n.t,n.d,.092,Math.sin((start+n.t)*Math.PI/16)*.45);}
  }
  for(const cue of PERFORMANCE_CUES){
   quack(cue.note,offset+cue.time,cue.side);quack(cue.note-2,offset+cue.time+.18,cue.side);
   const chord=CHORDS[Math.floor(cue.time/2)]!;
   chord.notes.slice(1).forEach((note,i)=>voice(note,offset+cue.time+.50+i*.009,.92,.085,-cue.side*(.18+i*.12),true));
  }
 }
 const raw=await c.startRendering(),result=new AudioBuffer({numberOfChannels:2,length:DURATION*SAMPLE_RATE,sampleRate:SAMPLE_RATE});
 let peak=0;for(let ch=0;ch<2;ch++){const data=raw.getChannelData(ch).subarray(DURATION*SAMPLE_RATE,DURATION*2*SAMPLE_RATE);result.copyToChannel(data,ch);for(const v of data)peak=Math.max(peak,Math.abs(v));}
 const gain=Math.min(2,.86/Math.max(.0001,peak));for(let ch=0;ch<2;ch++){const data=result.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]!*=gain;}
 return result;
}
export async function musicWav(){
 const buffer=await renderSoundtrack(),length=buffer.length,bytes=new Uint8Array(44+length*4),v=new DataView(bytes.buffer);
 const word=(offset:number,text:string)=>{for(let i=0;i<text.length;i++)v.setUint8(offset+i,text.charCodeAt(i));};
 word(0,'RIFF');v.setUint32(4,36+length*4,true);word(8,'WAVE');word(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,SAMPLE_RATE,true);v.setUint32(28,SAMPLE_RATE*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);word(36,'data');v.setUint32(40,length*4,true);
 const left=buffer.getChannelData(0),right=buffer.getChannelData(1);for(let i=0;i<length;i++){v.setInt16(44+i*4,Math.round(Math.max(-1,Math.min(1,left[i]!))*32767),true);v.setInt16(46+i*4,Math.round(Math.max(-1,Math.min(1,right[i]!))*32767),true);}
 let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
 return {version:MUSIC_VERSION,base64:btoa(binary)};
}
export function createMusicPlayer(){
 let context:AudioContext|undefined,buffer:AudioBuffer|undefined,source:AudioBufferSourceNode|undefined,startTime=0,offset=0,lastScene=0;
 const stop=()=>{source?.stop();source?.disconnect();source=undefined;};
 return {
  async unlock(){context??=new AudioContext();await context.resume();if(!buffer){try{const response=await fetch('/__art/music/audio');if(!response.ok||response.headers.get('X-Music-Version')!==MUSIC_VERSION)throw Error('No current cached music');buffer=await context.decodeAudioData(await response.arrayBuffer());}catch{buffer=await renderSoundtrack();}}},
  update(time:number,paused:boolean,enabled:boolean){lastScene=time;if(!context||!buffer||context.state!=='running')return;if(paused||!enabled){stop();return;}
   const playhead=source?(offset+context.currentTime-startTime)%DURATION:-1;
   const delta=Math.abs(((playhead-time+DURATION*1.5)%DURATION)-DURATION*.5);
   if(!source||delta>.10){stop();source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(context.destination);startTime=context.currentTime;offset=lastScene;source.start(startTime,offset);}
  },
  dispose(){stop();void context?.close();}
 };
}
