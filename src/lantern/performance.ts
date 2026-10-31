import {DURATION} from '../state.ts';

// One score clock drives the duck's gestures and their musical answers.
export const PERFORMANCE_CUES=[
 {id:'left-call',time:4,side:-1,note:67},
 {id:'right-answer',time:12,side:1,note:65},
 {id:'left-double',time:20,side:-1,note:67},
 {id:'right-farewell',time:28,side:1,note:62},
] as const;
export function gestureAt(time:number){
 let look=0,tilt=0,wing=0,jaw=0;
 for(const cue of PERFORMANCE_CUES){
  const delta=((time-cue.time+DURATION*1.5)%DURATION+DURATION)%DURATION-DURATION*.5;
  const reach=Math.exp(-((delta/.42)**2));
  look+=cue.side*reach;tilt+=reach;
  if(delta>=0&&delta<.8)wing+=Math.sin(Math.PI*delta/.8)**2*(.5+.5*Math.sin(delta*Math.PI*7.5));
  for(const onset of [0,.18]){const age=delta-onset;if(age>=0&&age<.15)jaw+=Math.sin(Math.PI*age/.15)**2;}
 }
 return {look,tilt,wing,jaw};
}
