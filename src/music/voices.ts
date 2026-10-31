/** Source-filter reference values from Csound's documented bass/tenor/alto tables.
 * Values are acoustic parameters, not recordings. Each singer perturbs the tract length.
 * https://csound.com/manual/misc/formants/
 */
export type Vowel={frequency:readonly number[];decibels:readonly number[];bandwidth:readonly number[]};
export const VOICE_PROFILES={
 bass:{a:{frequency:[600,1040,2250,2450,2750],decibels:[0,-7,-9,-9,-20],bandwidth:[60,70,110,120,130]},o:{frequency:[400,750,2400,2600,2900],decibels:[0,-11,-21,-20,-40],bandwidth:[40,80,100,120,120]}},
 tenor:{a:{frequency:[650,1080,2650,2900,3250],decibels:[0,-6,-7,-8,-22],bandwidth:[80,90,120,130,140]},o:{frequency:[400,800,2600,2800,3000],decibels:[0,-10,-12,-12,-26],bandwidth:[40,80,100,120,120]}},
 alto:{a:{frequency:[800,1150,2800,3500,4950],decibels:[0,-4,-20,-36,-60],bandwidth:[80,90,120,130,140]},o:{frequency:[450,800,2830,3500,4950],decibels:[0,-9,-16,-28,-55],bandwidth:[70,80,100,130,135]}},
} satisfies Record<string,{a:Vowel;o:Vowel}>;
/** Fourier coefficients of a differentiated, asymmetrical glottal opening/closure cycle. */
export function glottalWave(open:number,closing:number,phase:number){
 const count=512,flow=new Float64Array(count),real=new Float32Array(65),imag=new Float32Array(65);
 for(let i=0;i<count;i++){const x=i/count;flow[i]=x<open?.5*(1-Math.cos(Math.PI*x/open)):x<open+closing?Math.cos((x-open)/closing*Math.PI/2):0;}
 for(let k=1;k<real.length;k++)for(let i=0;i<count;i++){
  const derivative=(flow[(i+1)%count]!-flow[(i+count-1)%count]!)*.5,angle=2*Math.PI*k*i/count+k*phase;
  real[k]!+=derivative*Math.cos(angle);imag[k]!+=derivative*Math.sin(angle);
 }
 return {real,imag};
}
