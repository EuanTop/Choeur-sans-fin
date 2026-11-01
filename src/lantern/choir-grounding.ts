import type {BufferAttribute,InterleavedBufferAttribute} from 'three';
import type {ChoirGesture} from './choir-groups.ts';

export const CHOIR_SCALE=1.8;
export const GALLERY_STEP=8.4;
export function galleryFloorY(row:number){return row===0?.65:row*GALLERY_STEP;}
export type SupportPoint={y:number;z:number};
/** Keep the lower torso, below the neck deformation, after model simplification. */
export function choirSupportPoints(position:BufferAttribute|InterleavedBufferAttribute){
 const points:SupportPoint[]=[];
 for(let i=0;i<position.count;i++)if(position.getY(i)<.46)points.push({y:position.getY(i),z:position.getZ(i)});
 if(!points.length)throw Error('The swan model has no lower-body support vertices');
 return points;
}
/** Match the shader's breath, body lean and family scale; intentional bob remains. */
export function choirGroundOffset(points:readonly SupportPoint[],shapeY:number,pose:ChoirGesture,motion:number){
 const wing=Math.min(1.48,pose.wing*motion),lean=-wing*.028;
 const breath=1+Math.max(0,pose.wing-.04)*.012*motion,c=Math.cos(lean),s=Math.sin(lean);
 let bottom=Infinity;
 for(const p of points)bottom=Math.min(bottom,(c*p.y*breath-s*p.z)*shapeY);
 return .008-bottom;
}
