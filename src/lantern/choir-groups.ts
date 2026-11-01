import {DURATION} from '../state.ts';
import {CHOIR_PARTS,VOCAL_ROLE_GAIN,vocalActivityAt} from '../music/arrangement.ts';
import type {VocalRole} from '../music/arrangement.ts';

export const CHOIR_GROUPS=[
 {voice:'Low foundation',gallery:'Lower left',family:'ground',shape:[1.12,.90,1.06]},
 {voice:'Contralto',gallery:'Lower right',family:'ground',shape:[1.12,.90,1.06]},
 {voice:'Alto',gallery:'Middle left',family:'chorale',shape:[1,1,1]},
 {voice:'Mezzo',gallery:'Middle right',family:'chorale',shape:[1,1,1]},
 {voice:'Lyrical soprano',gallery:'Upper left',family:'bright',shape:[.90,1.12,.96]},
 {voice:'Clear soprano',gallery:'Upper right',family:'bright',shape:[.90,1.12,.96]},
] as const;
export function choirSection(row:number,side:number){return row*2+(side>0?1:0);}
const focus:Record<VocalRole,number>={foundation:.48,inner:.46,pad:.24,lead:1,response:.86,'co-lead':.92};
export type ChoirGesture={wing:number;spread:number;head:number;bob:number};
function stroke(age:number,length:number){return age>=0&&age<length?Math.sin(Math.PI*age/length)**2:0;}

/** One pose per real voice part. Every bird in that gallery receives the same pose. */
export function choirGestureAt(time:number,section:number):ChoirGesture{
 const group=CHOIR_GROUPS[section]!,notes=CHOIR_PARTS[section]!;
 let t=((time%DURATION)+DURATION)%DURATION;
 let note=notes.find(n=>t>=n.time&&t<n.time+n.duration);
 if(!note){t+=DURATION;note=notes.find(n=>t>=n.time&&t<n.time+n.duration);}
 const activity=vocalActivityAt(time,section);
 if(!note||activity<1e-7)return {wing:.04,spread:0,head:0,bob:0};
 const envelope=activity/VOCAL_ROLE_GAIN[note.role],amount=envelope*focus[note.role],age=t-note.time;
 const slow=.5-.5*Math.cos(Math.PI*t); // shared half-time pulse, without per-bird offsets
 if(group.family==='ground')return {wing:.04+amount*(.22+1.18*slow),spread:amount*.94,head:-amount*(.14+.13*slow),bob:0};
 const supporting=note.role==='pad';
 if(group.family==='chorale'){
  const flap=supporting?.36*slow:stroke(age,Math.min(.88,note.duration*.92));
  return {wing:.04+amount*(.20+1.28*flap),spread:amount*(.72+.24*flap),head:-amount*(.25+.18*flap),bob:amount*flap*.045};
 }
 const length=Math.min(.72,note.duration*.90)/2;
 const first=stroke(age,length),second=.82*stroke(age-length,length);
 const flutter=supporting?.30*slow:Math.max(first,second);
 return {wing:.04+amount*(.18+1.18*flutter),spread:amount*(.62+.30*flutter),head:-amount*(.30+.14*flutter),bob:amount*flutter*.055};
}
