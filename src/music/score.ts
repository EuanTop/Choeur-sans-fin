import {VOICE_NAMES,takeFor,cuesFor} from './poem.ts';
import {CHOIR_PARTS} from './arrangement.ts';
import {CHOIR_SECTIONS} from './voices.ts';
import {DURATION,defaults} from '../state.ts';
import {PERFORMANCE_CUES} from '../lantern/performance.ts';
export const BASE_AUDIO_VERSION='lantern-base-06';
export function poemVersionFor(voice:string){const t=takeFor(voice);return 'lantern-poem-11-'+t.id+'-'+t.sha256.slice(0,8);}
export function musicVersionFor(voice:string,level=defaults.poemVolume){if(!Number.isFinite(level)||level<0||level>3)throw Error('Invalid poem volume');return poemVersionFor(voice)+'-mix-p'+level.toString().replace('.','_');}
export const MUSIC_VERSION=musicVersionFor(defaults.voice);
export const TEMPO=60;
export type Harmony={time:number;duration:number;name:string;bass:number;notes:readonly number[];role:string};
/** A warm major-key choral arc, with common tones and a gentle plagal return. */
export const CHORDS:readonly Harmony[]=[
 {time:0,duration:4,name:'Dadd9',bass:38,notes:[38,45,54,57,64,69],role:'a luminous tonic; open space above a stable bass'},
 {time:4,duration:4,name:'D6',bass:38,notes:[38,45,54,59,62,66],role:'the upper voice settles while an inner voice rises'},
 {time:8,duration:4,name:'Gmaj9/D',bass:38,notes:[38,47,54,57,62,67],role:'the choir opens into a broad subdominant'},
 {time:12,duration:4,name:'G6/D',bass:38,notes:[38,43,55,59,62,64],role:'a gentle descending answer, without a dominant push'},
 {time:16,duration:4,name:'D/F#',bass:42,notes:[42,45,54,57,62,66],role:'a quietly lifted tonic inversion'},
 {time:20,duration:4,name:'Bm7/D',bass:38,notes:[38,47,54,57,62,69],role:'a shaded relative-minor phrase within the same warmth'},
 {time:24,duration:4,name:'Gmaj9/D',bass:38,notes:[38,47,54,57,62,67],role:'the full choir returns, keeping common tones'},
 {time:28,duration:2,name:'G6/D',bass:38,notes:[38,43,55,59,62,64],role:'a soft Amen-like subdominant'},
 {time:30,duration:2,name:'Dadd9',bass:38,notes:[38,45,54,57,64,69],role:'plagal homecoming; the opening continues across the seam'},
];
export function harmonyAt(time:number){const t=((time%DURATION)+DURATION)%DURATION;return [...CHORDS].reverse().find(c=>c.time<=t)!;}
export function musicScore(voice=defaults.voice,level=defaults.poemVolume){return {version:musicVersionFor(voice,level),voice,poemVolume:level,voices:VOICE_NAMES,narration:{language:'fr',sha256:takeFor(voice).sha256,cues:cuesFor(voice)},duration:DURATION,tempo:TEMPO,meter:'slow four-beat choral phrases',key:'D major, with relative-minor shading',style:'Original sacred wordless choir; warm plagal harmony, female-led mixed choir with independent melodic parts, alternating leads and a spacious hall',sections:CHOIR_SECTIONS,parts:CHOIR_PARTS,cues:PERFORMANCE_CUES,chords:CHORDS};}
