import {DURATION} from '../state.ts';

export const VOICE_NAMES=['Voice A','Voice B','Voice C'] as const;
export type VoiceName=typeof VOICE_NAMES[number];
export const VOICE_TAKES={
 'Voice A':{id:'a',url:'/audio/poem-fr.mp3',sha256:'8f17201fc4c94d470848440188e60387d112ffb17bc5974164a66d398a1c9959',ranges:[[0,1.72],[2.34,3.85],[4.52,5.79],[5.87,7.57],[8.25,10.20],[10.32,12.30]]},
 'Voice B':{id:'b',url:'/audio/poem-fr-b.wav',sha256:'21d0a1f5948b645ce4eb01d4db5d58dfab1d061e79d353b30692a4a2414c524e',ranges:[[0,2.46],[3.15,5.75],[6.85,8.48],[9.20,11.10],[12.10,14.62],[15.35,17.40]]},
 'Voice C':{id:'c',url:'/audio/poem-fr-c.wav',sha256:'c1a8aae8c4b002790634c72eceb5fa4f9f0b728677175ccb23fde35f0cbd0195',ranges:[[.15,2.22],[2.90,4.38],[5.36,6.91],[7.50,9.20],[10.53,12.67],[12.76,14.80]]},
} as const;
export function takeFor(voice:string){if(!VOICE_NAMES.includes(voice as VoiceName))throw Error('Unknown poem voice');return VOICE_TAKES[voice as VoiceName];}
/** The six phrase entrances are shared; only silent source pauses are rearranged. */
export const POEM_CUES=[
 {text:'Les voix remplissent la nuit.',start:4,holdEnd:7.35},
 {text:'Je passe entre elles.',start:8,holdEnd:10.85},
 {text:'Sous chaque voûte,',start:11.5,holdEnd:13.55},
 {text:'une autre nuit commence.',start:14.2,holdEnd:18.75},
 {text:'Je ne sais plus si je m’éloigne,',start:19.5,holdEnd:22.35},
 {text:'ou si le monde revient vers moi.',start:23,holdEnd:28.1},
] as const;
export function cuesFor(voice:string){return POEM_CUES.map((c,i)=>{const [sourceStart,sourceEnd]=takeFor(voice).ranges[i]!;return {...c,sourceStart,sourceEnd};});}
export function narrationEnd(cue:{start:number;sourceStart:number;sourceEnd:number}){return cue.start+cue.sourceEnd-cue.sourceStart;}
const smooth=(x:number)=>{const v=Math.max(0,Math.min(1,x));return v*v*(3-2*v);};
export function riverPoemPose(time:number,index:number){
 const t=((time%DURATION)+DURATION)%DURATION,c=POEM_CUES[index];if(!c)throw Error('Unknown poem line');
 const begin=c.start-.45,end=c.holdEnd+.35,progress=(t-begin)/(end-begin);
 if(progress<=0||progress>=1)return {visible:false,alpha:0,z:13};
 return {visible:true,alpha:.64*smooth(progress/.18)*(1-smooth((progress-.76)/.24)),z:13};
}

export function riverPoemText(text:string){return text.replace(/[.,;:!?…]+/gu,'');}
