import {DURATION} from '../state.ts';

export type VocalRole='foundation'|'inner'|'pad'|'lead'|'response'|'co-lead';
export type VocalEvent={id:string;time:number;duration:number;midi:number;phrase:string;role:VocalRole;velocity:number;passing?:boolean};
type Note=readonly [time:number,duration:number,midi:number,passing?:boolean];
const roleGain:Record<VocalRole,number>={foundation:.34,inner:.46,pad:.32,lead:1,response:.73,'co-lead':.83};
export function roleAt(time:number,section:number):VocalRole{
 const t=((time%DURATION)+DURATION)%DURATION;
 if(section===0)return 'foundation';if(section===1)return 'inner';
 if(section===2)return t<8||t>=16&&t<20?'lead':t>=20&&t<24?'response':'pad';
 if(section===3)return t>=8&&t<16||t>=28?'lead':t>=24?'co-lead':'pad';
 if(section===4)return t>=20&&t<24?'lead':t>=4&&t<8||t>=16&&t<20?'response':'pad';
 return t>=24&&t<28?'co-lead':t>=8&&t<16||t>=28?'response':'pad';
}
function phraseAt(section:number,time:number){
 if(section===0)return 'ground-'+Math.floor(time/8);
 if(section===1)return 'inner-'+Math.floor(time/4);
 return `voice-${section}-${Math.floor(time/4)}`;
}
function part(section:number,notes:readonly Note[]){return notes.map(([time,duration,midi,passing],i):VocalEvent=>({id:`CHO-${section+1}-${String(i+1).padStart(3,'0')}`,time,duration,midi,passing,phrase:phraseAt(section,time),role:roleAt(time,section),velocity:.91+.07*Math.sin(i*1.7+section*.8)}));}

/** Absolute MIDI pitches. Rests, lengths and onsets are composed separately for each part. */
export const CHOIR_PARTS:readonly (readonly VocalEvent[])[]=[
 part(0,[[.75,6.85,50],[8,7.5,50],[16,3.6,54],[20,3.7,50],[24,8.5,50]]),
 part(1,[[.5,1.5,57],[2.5,1.2,54],[4,1.2,54],[5.25,.75,55,true],[6,1.5,54],[8.5,1.5,59],[10,1.5,57],[12.5,1,59],[13.5,1,57,true],[14.5,1,55],[16.5,1.5,57],[18,1.6,54],[20.5,1.5,54],[22,1.5,57],[24.5,1.5,59],[26,1.5,57],[28.5,.75,55],[29.25,.75,59],[30,1.5,57]]),
 part(2,[[0,.85,57],[1,1.4,62],[2.5,.5,64],[3,.85,66],[4,.5,64,true],[4.5,1.25,62],[5.75,.75,59],[6.5,1,57],[8,3.65,54],[12,3.5,55],[16,.75,54],[17,.75,57],[18,1.25,62],[19.5,.45,66],[20,.75,66],[21,.5,64,true],[21.5,1,62],[22.5,.75,59],[23.25,.5,57],[24,3.5,54],[28,1.75,55],[30,2,54]]),
 part(3,[[0,3.75,57],[4,3.7,59],[8,.75,59],[9,1.25,62],[10.25,.75,66],[11,.5,64,true],[11.5,.4,62],[12,.75,64],[13,.75,62],[14,.75,59],[15,.5,57,true],[15.5,.45,55],[16,3.7,57],[20,3.5,62],[24,.75,62],[25,.75,66],[26,.75,67],[27,.75,66],[28,.75,64],[29,.75,62],[30,.75,66],[31,.5,64],[31.5,.5,62]]),
 part(4,[[.75,2.5,64],[4.25,.75,66],[5.25,1,69],[6.5,.65,66],[7.25,.5,62],[8,3.5,69],[12,1.5,67],[13.5,1.5,64],[16,1.5,66],[18,.5,64,true],[18.5,1,62],[20.25,.75,66],[21.25,1,69],[22.5,.65,66],[23.25,.5,62],[24,3.5,69],[28,1.75,67],[30,2.6,69]]),
 part(5,[[.5,3.3,69],[4,1.7,66],[6,1.7,69],[8.25,.75,66],[9.25,.75,67],[10.25,1.25,69],[11.5,.4,67],[12.25,.75,67],[13.25,1.25,71],[14.75,.5,69,true],[15.25,.5,67],[16,3.7,69],[20,3.7,66],[24.25,.75,69],[25.25,.75,71],[26.25,.75,69],[27.25,.5,67],[28,.75,71],[29,.5,69,true],[29.5,.4,67],[30,2.4,66]]),
];

/** Continuous pitches continue silently across rests, so the phase integral includes them. */
export function vocalPitchTimeline(section:number){
 const notes=CHOIR_PARTS[section]!,points=[{time:0,midi:notes.at(-1)!.midi}];
 for(const n of notes){if(n.time===0)points[0]={time:0,midi:n.midi};else points.push({time:n.time,midi:n.midi});}
 return points.map((p,i)=>({...p,duration:(points[i+1]?.time??DURATION)-p.time}));
}
function smooth(a:number,b:number,v:number){const x=Math.max(0,Math.min(1,(v-a)/(b-a)));return x*x*(3-2*x);}
/** Gate per phrase, not per legato note. Real rests stay silent; changing notes can stay connected. */
export function vocalActivityAt(time:number,section:number){
 let t=((time%DURATION)+DURATION)%DURATION;const notes=CHOIR_PARTS[section]!;
 let i=notes.findIndex(n=>t>=n.time&&t<n.time+n.duration);
 if(i<0){t+=DURATION;i=notes.findIndex(n=>t>=n.time&&t<n.time+n.duration);}if(i<0)return 0;
 const n=notes[i]!;let first=i,last=i;
 while(first>0){const a=notes[first-1]!,b=notes[first]!;if(a.phrase!==b.phrase||Math.abs(a.time+a.duration-b.time)>.001)break;first--;}
 while(last<notes.length-1){const a=notes[last]!,b=notes[last+1]!;if(a.phrase!==b.phrase||Math.abs(a.time+a.duration-b.time)>.001)break;last++;}
 const start=notes[first]!.time,end=notes[last]!.time+notes[last]!.duration,span=end-start;
 const attack=Math.min(.18,span*.24),release=Math.min(.26,span*.25);
 const gate=smooth(start,start+attack,t)*(1-smooth(end-release,end,t));
 const contour=.87+.13*Math.sin(Math.PI*(t-start)/span);
 return gate*contour*n.velocity*roleGain[n.role];
}
