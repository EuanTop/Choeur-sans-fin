import * as T from 'three';
import {levelPose,zoomPose} from './cycle.ts';

export function createLighting(scene:T.Scene){
 scene.add(new T.HemisphereLight('#d2a4ee','#41224c',.52));
 const key=new T.DirectionalLight('#d9c8ff',1.65);key.position.set(-12,25,22);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-24,right:24,top:28,bottom:-20,near:.5,far:100});key.shadow.bias=-.00012;key.shadow.normalBias=.035;key.shadow.radius=2;scene.add(key);
 const fill=new T.DirectionalLight('#a38aff',.78);fill.position.set(15,15,4);scene.add(fill);
 const rim=new T.DirectionalLight('#ffb874',1.25);rim.position.set(0,22,-25);scene.add(rim);
 const roomLights=[-2,-1,0,1,2,3].flatMap(level=>[-1,1].map(side=>{const light=new T.PointLight('#ffad64',1,1,2);scene.add(light);return {light,level,at:new T.Vector3(side*15,5.7,-5),base:150,range:7};}));
 const interiorLights=[-2,-1,0,1,2,3].map(level=>{const light=new T.PointLight('#ffb35d',1,1,2);scene.add(light);return {light,level,at:new T.Vector3(0,4.3,1.8),base:160,range:5.5};});
 const lights=[-2,-1,0,1,2,3].flatMap(level=>[-1,1].map(side=>{const light=new T.PointLight('#ff9347',1,120,2);scene.add(light);return {light,level,at:new T.Vector3(side*7,8,8),base:105,range:12};}));
 return {update(time:number,gain:number){const z=zoomPose(time);for(const l of [...lights,...roomLights,...interiorLights]){const p=levelPose(l.level),s=p.scale*z.scale;l.light.position.copy(l.at).multiplyScalar(p.scale).add(p.position).multiplyScalar(z.scale).add(z.position);l.light.visible=s<=6&&s>=.003;l.light.intensity=l.base*s*s*gain;l.light.distance=l.range*s;}key.intensity=1.65*Math.sqrt(gain);}};
}
