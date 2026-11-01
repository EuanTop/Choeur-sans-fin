import * as T from 'three';
import {HALL_SCALE} from './proportions.ts';
import {createHall} from './hall.ts';
import {createPumpkin} from './pumpkin.ts';
import {phase} from './materials.ts';
import {choirMotion,choirPoses,choirGrounds,type SwanParts} from './choir.ts';
import {choirSupportPoints,choirGroundOffset} from './choir-grounding.ts';
import {CHOIR_GROUPS,choirGestureAt} from './choir-groups.ts';
import {LEVELS,levelPose,zoomPose} from './cycle.ts';

export function createNestedWorld(scene:T.Scene,parts:SwanParts){
 const root=new T.Group();root.name='Self-similar space';scene.add(root);
 const support=choirSupportPoints(parts.body!.getAttribute('position'));
 const hall=createHall(parts),pumpkin=createPumpkin();hall.scale.set(HALL_SCALE.x,HALL_SCALE.y,1);
 const levels=LEVELS.map(index=>{
  const group=new T.Group();group.name='Recursive world '+index;const pose=levelPose(index);group.position.copy(pose.position);group.scale.setScalar(pose.scale);root.add(group);
  const instance=hall.clone(true),clip=new T.Plane(new T.Vector3(0,0,-1),35.2),clones=new Map<T.Material,T.Material>();
  function cloneMaterial(source:T.Material){if(!clones.has(source)){const m=source.clone();m.onBeforeCompile=source.onBeforeCompile;m.customProgramCacheKey=source.customProgramCacheKey;m.clippingPlanes=[clip];m.clipShadows=true;if(m instanceof T.ShaderMaterial){m.clipping=true;if(m.uniforms.uPhase)m.uniforms.uPhase=phase;}clones.set(source,m);}return clones.get(source)!;}
  instance.traverse(o=>{if(!(o instanceof T.Mesh))return;o.material=cloneMaterial(o.material as T.Material);if(o.customDepthMaterial)o.customDepthMaterial=cloneMaterial(o.customDepthMaterial);if(o.customDistanceMaterial)o.customDistanceMaterial=cloneMaterial(o.customDistanceMaterial);});
  group.add(instance,pumpkin.clone(true));
  return {index,group,scale:pose.scale,clip};
 });
 return {root,levels,choirGroups:()=>CHOIR_GROUPS.map((g,i)=>({...g,pose:choirPoses.value[i]!.toArray(),groundOffset:choirGrounds.value[i]})),update(time:number,motion:number){
  choirMotion.value=motion;for(let i=0;i<6;i++){const q=choirGestureAt(time,i);choirPoses.value[i]!.set(q.wing,q.spread,q.head,q.bob);choirGrounds.value[i]=choirGroundOffset(support,CHOIR_GROUPS[i]!.shape[1],q,motion);}const zoom=zoomPose(time);root.position.copy(zoom.position);root.scale.setScalar(zoom.scale);
  for(const l of levels){const s=l.scale*zoom.scale;l.group.visible=s<=6&&s>=.003;}
  root.updateMatrixWorld(true);for(const l of levels)l.clip.set(new T.Vector3(0,0,-1),35.2).applyMatrix4(l.group.matrixWorld);return zoom;
 }};
}
