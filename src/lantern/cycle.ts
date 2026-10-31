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
export function duckPose(time:number){
 const p=wrap(time)/DURATION*TAU;
 const position=new Vector3(-3.2+3.5*Math.sin(p),-.22,9+1.5*Math.cos(p));
 const tangent=new Vector3(3.5*Math.cos(p),0,-1.5*Math.sin(p)).normalize();
 return {position,tangent,yaw:Math.atan2(tangent.x,tangent.z),phase:p};
}
