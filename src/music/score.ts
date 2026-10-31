import {DURATION} from '../state.ts';
import {PERFORMANCE_CUES} from '../lantern/performance.ts';
export const MUSIC_VERSION='lantern-gospel-01';
export const CHORDS=[
 {name:'Cm9',bass:36,notes:[48,55,58,63,74]},
 {name:'Cm9',bass:36,notes:[48,55,58,63,74]},
 {name:'Abmaj9',bass:32,notes:[48,55,58,63,68]},
 {name:'Fm9',bass:29,notes:[48,53,56,63,67]},
 {name:'Ebmaj9/G',bass:31,notes:[50,55,58,63,65]},
 {name:'Bbadd9',bass:34,notes:[48,53,58,62,65]},
 {name:'Fm9',bass:29,notes:[48,53,56,63,67]},
 {name:'G7b9',bass:31,notes:[47,53,56,62,67]},
 {name:'Cm9',bass:36,notes:[48,55,58,63,74]},
 {name:'Abmaj9',bass:32,notes:[48,55,58,63,68]},
 {name:'Ebmaj9/G',bass:31,notes:[50,55,58,63,65]},
 {name:'Fm9',bass:29,notes:[48,53,56,63,67]},
 {name:'Abmaj9',bass:32,notes:[48,55,58,63,68]},
 {name:'Dm7b5',bass:38,notes:[48,53,56,62,65]},
 {name:'G7sus to G7',bass:31,notes:[47,53,55,62,67]},
 {name:'Cm9',bass:36,notes:[48,55,58,63,74]},
] as const;
export function musicScore(){return {version:MUSIC_VERSION,duration:DURATION,style:'Minor gospel / organ, voiced choir, warm bass and antiphonal duck calls',cues:PERFORMANCE_CUES,chords:CHORDS.map((c,i)=>({...c,time:i*2,duration:2}))};}
