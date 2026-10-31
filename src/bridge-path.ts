import * as T from 'three';
import {TAU} from './story.ts';

export const PATH_PERIOD=32;
export function bridgePoint(s:number){return new T.Vector3(2.25*Math.sin(s*TAU/PATH_PERIOD-.40),.84+.09*Math.cos(s*TAU/16),s);}
export function bridgeTangent(s:number){return new T.Vector3(2.25*TAU/PATH_PERIOD*Math.cos(s*TAU/PATH_PERIOD-.40),-.09*TAU/16*Math.sin(s*TAU/16),1).normalize();}
export function canalCentre(s:number){return .40*Math.sin(s*TAU/PATH_PERIOD-.25);}
export function bridgeSide(s:number){const t=bridgeTangent(s);return new T.Vector3(t.z,0,-t.x).normalize();}
