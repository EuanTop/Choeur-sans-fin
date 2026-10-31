import {DURATION} from './state.ts';

export const TAU=Math.PI*2;
export const wrap=(x:number,period:number)=>((x%period)+period)%period;
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(a:number,b:number,t:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
export const SEGMENT_LENGTH=16;
export const STREET_PERIOD=32;
export const RECYCLE_LENGTH=96;
export const SPEED=STREET_PERIOD/DURATION;

/** Modules recycle behind the camera, and are interchangeable every 16 m. */
export function segmentZ(index:number,t:number){
 return wrap(index*SEGMENT_LENGTH-SPEED*t+80,RECYCLE_LENGTH)-80;
}

export function storyAt(time:number){
 const t=wrap(time,DURATION),phase=t/DURATION*TAU;
 const slip=smooth(6.8,8.2,t)*(1-smooth(17.5,20.5,t));
 const noticed=smooth(8.0,10.0,t)*(1-smooth(21.0,24.0,t));
 const reach=smooth(16.4,17.6,t)*(1-smooth(20.5,21.8,t));
 const raisedFoot=smooth(7.1,7.7,t)*(1-smooth(9.1,9.6,t));
 return {t,phase,slip,noticed,reach,raisedFoot,
  step:Math.sin(phase*24),stride:phase*24,
  x:2.45+.08*Math.sin(phase*2),z:1.2,
  travel:SPEED*t,
  headTurn:Math.sin(phase*3)*.08+noticed*.23,
 };
}

/** Different houses react a fraction apart; all use the same scene clock. */
export function doorClosure(time:number,index:number){
 const t=wrap(time,DURATION),delay=(index%8)*.23;
 const close=smooth(8.1+delay,9.3+delay+(index%3)*.3,t);
 const hesitation=index%3===1?.48+.52*smooth(10.5+delay,11.6+delay,t):1;
 return close*hesitation*(1-smooth(21.0+delay,23.2+delay+(index%3)*.35,t));
}
