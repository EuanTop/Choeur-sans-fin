import {hallImpulse} from './hall.ts';
import {blendSample,outputCurve} from './level.ts';
import {renderSpokenPoem} from './poem-mix.ts';
import {DURATION,defaults} from '../state.ts';
import {PERFORMANCE_CUES,sectionEnergyAt} from '../lantern/performance.ts';
import {CHORDS,musicVersionFor,poemVersionFor,BASE_AUDIO_VERSION} from './score.ts';
import {vocalPitchTimeline,roleAt} from './arrangement.ts';
import {CHOIR_SECTIONS,voiceProfile,glottalWave} from './voices.ts';

const SAMPLE_RATE=44100,hz=(midi:number)=>440*2**((midi-69)/12);
let base:Promise<AudioBuffer>|undefined;const pending=new Map<string,Promise<AudioBuffer>>();
export async function renderSoundtrackParts(voice='Voice A'){
 poemVersionFor(voice);base??=synthesize().catch(e=>{base=undefined;throw e;});const music=await base;
 if(!pending.has(voice))pending.set(voice,renderSpokenPoem(music,voice).catch(e=>{pending.delete(voice);throw e;}));
 return {music,poem:await pending.get(voice)!};
}
export async function renderSoundtrack(voice='Voice A',level=defaults.poemVolume){
 musicVersionFor(voice,level);const {music,poem}=await renderSoundtrackParts(voice),out=new AudioBuffer({numberOfChannels:2,length:music.length,sampleRate:music.sampleRate});
 for(let ch=0;ch<2;ch++){const a=music.getChannelData(ch),b=poem.getChannelData(ch),d=out.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=blendSample(a[i]!,b[i]!,level);}return out;
}
export function cyclePitchCorrection(frequencies:readonly number[],durations:readonly number[]){const cycles=frequencies.reduce((sum,f,i)=>sum+f*durations[i]!,0);return (Math.round(cycles)-cycles)/DURATION;}

async function synthesize(){
 const total=DURATION*3,c=new OfflineAudioContext(2,total*SAMPLE_RATE,SAMPLE_RATE),master=c.createGain(),compressor=c.createDynamicsCompressor();
 master.gain.value=.72;compressor.threshold.value=-16;compressor.knee.value=16;compressor.ratio.value=1.7;compressor.attack.value=.035;compressor.release.value=.4;master.connect(compressor).connect(c.destination);
 let seed=7919;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1;};
 const curve=(f:(time:number)=>number)=>{const v=new Float32Array(total*48+1);for(let i=0;i<v.length;i++)v[i]=f(i/48);return v;};
 const ir=hallImpulse(c,random);
 const pre=c.createDelay(.2),reverb=c.createConvolver(),hp=c.createBiquadFilter(),lp=c.createBiquadFilter(),wet=c.createGain();
 pre.delayTime.value=.035;reverb.buffer=ir;hp.type='highpass';hp.frequency.value=135;lp.type='lowpass';lp.frequency.value=4800;wet.gain.value=.65;pre.connect(reverb).connect(hp).connect(lp).connect(wet).connect(master);
 function outlet(pan:number,send:number){const input=c.createGain(),p=c.createStereoPanner(),fx=c.createGain();p.pan.value=pan;fx.gain.value=send;input.connect(p).connect(master);p.connect(fx).connect(pre);return {input,panner:p,send:fx};}
 function envelope(g:AudioParam,t:number,duration:number,level:number,attack:number,release:number){g.setValueAtTime(0,t);g.linearRampToValueAtTime(level,t+attack);g.setValueAtTime(level*.87,t+Math.max(attack,duration-release));g.linearRampToValueAtTime(0,t+duration);}
 function pitch(param:AudioParam,line:readonly {time:number;duration:number;midi:number}[],detune:number){
  const fs=line.map(h=>hz(h.midi)*2**(detune/1200)),correction=cyclePitchCorrection(fs,line.map(h=>h.duration));param.value=fs.at(-1)!+correction;
  for(let lap=0;lap<3;lap++)line.forEach((h,i)=>{const t=lap*DURATION+h.time;param.setValueAtTime(fs[(i+fs.length-1)%fs.length]!+correction,t);param.linearRampToValueAtTime(fs[i]!+correction,t+.080);});
 }
 // Six sections × four independent glottal sources, not copies of one organ tone.
 const placements=[-.10,.10,-.72,.72,-.43,.43];
 for(let lane=0;lane<6;lane++){
  const section=CHOIR_SECTIONS[lane]!,profile=voiceProfile(section),line=vocalPitchTimeline(lane);
  for(let singer=0;singer<4;singer++){
   const delay=singer*.018,energy=(t:number)=>sectionEnergyAt(t-delay,lane);
   const level=c.createGain(),soften=c.createBiquadFilter(),room=outlet(placements[lane]!+(singer-1.5)*.065,lane===0?.40:.70);soften.type='lowpass';soften.frequency.value=section.cutoff;soften.Q.value=.55;
   level.gain.setValueCurveAtTime(curve(t=>section.mix*energy(t)*.40),0,total);level.connect(soften).connect(room.input);
   room.send.gain.setValueCurveAtTime(curve(t=>{const role=roleAt(t-delay,lane);return lane===0?.35:role==='lead'?.36:role==='co-lead'?.44:role==='response'?.48:.70;}),0,total);
   const o=c.createOscillator(),source=c.createGain(),wave=glottalWave(section.open+singer*.006,section.closing-singer*.003,lane*.31+singer*1.7);
   o.setPeriodicWave(c.createPeriodicWave(wave.real,wave.imag));source.gain.value=.25;
   pitch(o.frequency,line,[-7.5,-2.5,2.5,7.5][singer]!);
   const vibrato=c.createOscillator(),amount=c.createGain();vibrato.frequency.value=(176+lane*4+singer)/DURATION;amount.gain.value=.28+lane*.055;vibrato.connect(amount).connect(o.frequency);vibrato.start(0);vibrato.stop(total);
   const drift=c.createOscillator(),driftGain=c.createGain();drift.frequency.value=(1+singer%2)/DURATION;driftGain.gain.value=.17;drift.connect(driftGain).connect(o.frequency);drift.start(0);drift.stop(total);
   const tract=section.tract*(.976+singer*.016);
   const averageF0=line.reduce((sum,h)=>sum+hz(h.midi)*h.duration,0)/DURATION;
   for(let band=0;band<5;band++){
    const f=c.createBiquadFilter(),gain=c.createGain();f.type='bandpass';
    const morph=(t:number)=>section.vowelMin+(section.vowelMax-section.vowelMin)*energy(t);
    f.frequency.setValueCurveAtTime(curve(t=>tract*(profile.o.frequency[band]!+(profile.a.frequency[band]!-profile.o.frequency[band]!)*morph(t))),0,total);
    f.Q.setValueCurveAtTime(curve(t=>{const m=morph(t),freq=profile.o.frequency[band]!+(profile.a.frequency[band]!-profile.o.frequency[band]!)*m;const bw=profile.o.bandwidth[band]!+(profile.a.bandwidth[band]!-profile.o.bandwidth[band]!)*m;return freq/(bw*1.70);}),0,total);
    gain.gain.setValueCurveAtTime(curve(t=>{const m=morph(t),db=profile.o.decibels[band]!+(profile.a.decibels[band]!-profile.o.decibels[band]!)*m;return 10**(db/20)*Math.min(20,profile.a.frequency[band]!/averageF0)*.35;}),0,total);
    source.connect(f).connect(gain).connect(level);
   }
   const chest=c.createBiquadFilter(),body=c.createGain();chest.type='lowpass';chest.frequency.value=320;body.gain.value=section.body;source.connect(chest).connect(body).connect(level);
   o.connect(source);o.start(0);o.stop(total);
  }
 }
 // A steady, very low organ pedal supplies forward motion without a drum groove.
 for(const [transpose,gain] of [[0,.012],[-12,.003]]){
  const o=c.createOscillator(),g=c.createGain();pitch(o.frequency,CHORDS.map(h=>({time:h.time,duration:h.duration,midi:h.bass+transpose!})),0);g.gain.setValueCurveAtTime(curve(t=>gain!*(.89+.11*Math.cos(Math.PI*t))),0,total);o.connect(g).connect(outlet(0,.12).input);o.start(0);o.stop(total);
 }
 // Individual breaths at phrase boundaries are quiet; the hall carries the mass.
 const air=c.createBuffer(1,Math.round(SAMPLE_RATE*.20),SAMPLE_RATE);{const a=air.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=random()*Math.sin(Math.PI*i/a.length)**2;}
 for(let lap=0;lap<3;lap++)for(let phrase=0;phrase<4;phrase++)for(const side of [-1,1]){
  const s=c.createBufferSource(),hi=c.createBiquadFilter(),lo=c.createBiquadFilter(),g=c.createGain();s.buffer=air;hi.type='highpass';hi.frequency.value=900;lo.type='lowpass';lo.frequency.value=3700;g.gain.value=.008;s.connect(hi).connect(lo).connect(g).connect(outlet(side*.62,.75).input);s.start(lap*DURATION+phrase*8+.055+(side>0?.025:0));
 }
 function bell(time:number){
  for(const [ratio,gain,decay] of [[.5,.012,5.8],[1,.014,5.1],[1.25,.003,4.3],[1.5,.005,3.8],[2,.002,2.8]]){
   const o=c.createOscillator(),g=c.createGain();o.frequency.value=hz(50)*ratio!;g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(gain!,time+.025);g.gain.exponentialRampToValueAtTime(.00001,time+decay!);o.connect(g).connect(outlet(-.34,.80).input);o.start(time);o.stop(time+decay!+.01);
  }
 }
 function quack(note:number,time:number,side:number){
  const o=c.createOscillator(),source=c.createGain(),env=c.createGain();o.type='sawtooth';source.gain.value=.28;const f=hz(note);o.frequency.setValueAtTime(f*1.025,time);o.frequency.exponentialRampToValueAtTime(f*.98,time+.055);o.frequency.exponentialRampToValueAtTime(f,time+.14);
  for(const [a,b,q,weight] of [[880,1120,4.5,.73],[1650,1400,6,.21]]){const filter=c.createBiquadFilter(),g=c.createGain();filter.type='bandpass';filter.frequency.setValueAtTime(a!,time);filter.frequency.exponentialRampToValueAtTime(b!,time+.13);filter.Q.value=q!;g.gain.value=weight!;source.connect(filter).connect(g).connect(env);}
  envelope(env.gain,time,.165,.10,.011,.085);o.connect(source);env.connect(outlet(side*.04,.055).input);o.start(time);o.stop(time+.18);
 }
 for(let lap=0;lap<3;lap++){bell(lap*DURATION+.04);bell(lap*DURATION+16.04);for(const cue of PERFORMANCE_CUES){quack(cue.note,lap*DURATION+cue.time,cue.side);quack(cue.reply,lap*DURATION+cue.time+.18,cue.side);}}
 const raw=await c.startRendering(),result=new AudioBuffer({numberOfChannels:2,length:DURATION*SAMPLE_RATE,sampleRate:SAMPLE_RATE});let peak=0;
 for(let ch=0;ch<2;ch++){const data=raw.getChannelData(ch).subarray(DURATION*SAMPLE_RATE,DURATION*2*SAMPLE_RATE);result.copyToChannel(data,ch);for(const v of data)peak=Math.max(peak,Math.abs(v));}
 const gain=Math.min(12,.86/Math.max(.0001,peak));for(let ch=0;ch<2;ch++){const a=result.getChannelData(ch);for(let i=0;i<a.length;i++)a[i]!*=gain;}return result;
}
function encodeWave(buffer:AudioBuffer){
 const length=buffer.length,bytes=new Uint8Array(44+length*4),v=new DataView(bytes.buffer);
 const word=(offset:number,text:string)=>{for(let i=0;i<text.length;i++)v.setUint8(offset+i,text.charCodeAt(i));};
 word(0,'RIFF');v.setUint32(4,36+length*4,true);word(8,'WAVE');word(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,SAMPLE_RATE,true);v.setUint32(28,SAMPLE_RATE*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);word(36,'data');v.setUint32(40,length*4,true);
 const left=buffer.getChannelData(0),right=buffer.getChannelData(1);for(let i=0;i<length;i++){v.setInt16(44+i*4,Math.round(Math.max(-1,Math.min(1,left[i]!))*32767),true);v.setInt16(46+i*4,Math.round(Math.max(-1,Math.min(1,right[i]!))*32767),true);}
 let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
 return btoa(binary);
}
export async function musicWav(state:{voice:string;poemVolume:number}={voice:defaults.voice,poemVolume:defaults.poemVolume}){
 const parts=await renderSoundtrackParts(state.voice),mixed=await renderSoundtrack(state.voice,state.poemVolume);
 return {version:musicVersionFor(state.voice,state.poemVolume),base64:encodeWave(mixed),baseVersion:BASE_AUDIO_VERSION,poemVersion:poemVersionFor(state.voice),musicBase64:encodeWave(parts.music),poemBase64:encodeWave(parts.poem)};
}
export function createMusicPlayer(changed:()=>void=()=>{}){
 let context:AudioContext|undefined,sources:AudioBufferSourceNode[]=[],gain:GainNode|undefined,output:GainNode|undefined,startTime=0,offset=0,playing='',lastScene=0,lastLevel=-1;
 const buffers=new Map<string,{music:AudioBuffer;poem:AudioBuffer}>(),loading=new Map<string,Promise<void>>(),failed=new Set<string>();
 const stop=()=>{sources.forEach(s=>{s.stop();s.disconnect();});sources=[];gain?.disconnect();gain=undefined;};
 async function load(voice:string){
  if(buffers.has(voice))return;if(loading.has(voice))return loading.get(voice)!;
  const request=(async()=>{try{let audio:{music:AudioBuffer;poem:AudioBuffer};
   try{
    const [a,b]=await Promise.all([fetch('/__art/music/base'),fetch('/__art/music/poem?voice='+encodeURIComponent(voice))]);
    if(!a.ok||!b.ok||a.headers.get('X-Music-Version')!==BASE_AUDIO_VERSION||b.headers.get('X-Music-Version')!==poemVersionFor(voice))throw Error('No cached stems');
    const [music,poem]=await Promise.all([a.arrayBuffer().then(x=>context!.decodeAudioData(x)),b.arrayBuffer().then(x=>context!.decodeAudioData(x))]);audio={music,poem};
   }catch{audio=await renderSoundtrackParts(voice);}buffers.set(voice,audio);
  }catch(e){failed.add(voice);console.error(e);}finally{loading.delete(voice);changed();}})();loading.set(voice,request);changed();await request;
 }
 return {
  isReady(voice='Voice A'){return Boolean(context&&context.state==='running'&&buffers.has(voice));},
  isLoading(voice:string){return loading.has(voice);},
  async unlock(voice='Voice A'){
   if(!context){context=new AudioContext();output=context.createGain();output.gain.value=.25;const limiter=context.createWaveShaper();limiter.curve=outputCurve();output.connect(limiter).connect(context.destination);}
   await context.resume();failed.delete(voice);await load(voice);if(!buffers.has(voice))throw Error('Could not load poem voice');
  },
  update(time:number,paused:boolean,enabled:boolean,voice='Voice A',level=defaults.poemVolume){
   lastScene=time;if(!context||context.state!=='running')return;if(paused||!enabled){stop();return;}
   const buffer=buffers.get(voice);if(!buffer){stop();if(!failed.has(voice)&&!loading.has(voice))void load(voice);return;}
   const playhead=sources.length?(offset+context.currentTime-startTime)%DURATION:-1,delta=Math.abs(((playhead-time+DURATION*1.5)%DURATION)-DURATION*.5);
   if(!sources.length||playing!==voice||delta>.10){
    stop();gain=context.createGain();gain.gain.value=level;gain.connect(output!);lastLevel=level;startTime=context.currentTime;offset=lastScene;playing=voice;
    for(const [kind,b] of Object.entries(buffer)){const source=context.createBufferSource();source.buffer=b;source.loop=true;source.connect(kind==='poem'?gain:output!);source.start(startTime,offset);sources.push(source);}
   }
   if(level!==lastLevel){gain!.gain.setTargetAtTime(level,context.currentTime,.025);lastLevel=level;}
  },
  dispose(){stop();void context?.close();}
 };
}
