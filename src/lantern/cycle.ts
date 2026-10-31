import {Vector3} from 'three';
import {DURATION} from '../state.ts';

export const RATIO=.20;
export const OFFSET=new Vector3(0,0,-3.6);
export const CENTRE=OFFSET.clone().divideScalar(1-RATIO);
export const LEVELS=[-2,-1,0,1,2,3] as const;
export const TAU=Math.PI*2;
export const wrap=(n:number,p=DURATION)=>((n%p)+p)%p;
/** F(x)=q*x+a. Scaling about its fixed point shifts one nested world per lap. */
export function levelPose(level:number){
 const scale=RATIO**level;
 return {scale,position:CENTRE.clone().multiplyScalar(1-scale)};
}
export function zoomPose(time:number){
 const u=wrap(time)/DURATION,scale=RATIO**u;
 return {u,scale,position:CENTRE.clone().multiplyScalar(1-scale)};
}
/** The camera follows one passenger; the recursive environment supplies the travel. */
export function duckPose(time:number){
 const phase=wrap(time)/DURATION*TAU;
 return {position:new Vector3(.045*Math.sin(phase*2),-.22,10+.07*Math.sin(phase)),tangent:new Vector3(0,0,1),yaw:0,phase};
}
