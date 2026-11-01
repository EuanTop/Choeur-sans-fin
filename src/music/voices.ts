/** Source-filter reference values from Csound's documented bass/tenor/alto/soprano tables.
 * Values are acoustic parameters, not recordings. Each singer perturbs the tract length.
 * https://csound.com/manual/misc/formants/
 */
export type Vowel={frequency:readonly number[];decibels:readonly number[];bandwidth:readonly number[]};
export const VOICE_PROFILES={
 bass:{a:{frequency:[600,1040,2250,2450,2750],decibels:[0,-7,-9,-9,-20],bandwidth:[60,70,110,120,130]},o:{frequency:[400,750,2400,2600,2900],decibels:[0,-11,-21,-20,-40],bandwidth:[40,80,100,120,120]}},
 tenor:{a:{frequency:[650,1080,2650,2900,3250],decibels:[0,-6,-7,-8,-22],bandwidth:[80,90,120,130,140]},o:{frequency:[400,800,2600,2800,3000],decibels:[0,-10,-12,-12,-26],bandwidth:[40,80,100,120,120]}},
 alto:{a:{frequency:[800,1150,2800,3500,4950],decibels:[0,-4,-20,-36,-60],bandwidth:[80,90,120,130,140]},o:{frequency:[450,800,2830,3500,4950],decibels:[0,-9,-16,-28,-55],bandwidth:[70,80,100,130,135]}},
 soprano:{a:{frequency:[800,1150,2900,3900,4950],decibels:[0,-6,-32,-20,-50],bandwidth:[80,90,120,130,140]},o:{frequency:[450,800,2830,3800,4950],decibels:[0,-11,-22,-22,-50],bandwidth:[40,80,100,120,120]}},
} satisfies Record<string,{a:Vowel;o:Vowel}>;
/** Sections retain separate musical lines while using different registers and vocal tracts. */
export const CHOIR_SECTIONS=[
 {name:'Soft male support',family:'male',profile:'tenor',mix:.28,tract:.99,open:.66,closing:.23,vowelMin:.12,vowelMax:.55,cutoff:3000,body:.008},
 {name:'Velvet contralto',family:'female',profile:'alto',mix:.82,tract:.96,open:.66,closing:.24,vowelMin:.18,vowelMax:.64,cutoff:3400,body:.018},
 {name:'Warm alto',family:'female',profile:'alto',mix:1.0,tract:1.0,open:.67,closing:.23,vowelMin:.16,vowelMax:.61,cutoff:3600,body:.016},
 {name:'Round mezzo',family:'female',profile:'mezzo',mix:1.04,tract:1.02,open:.68,closing:.23,vowelMin:.15,vowelMax:.66,cutoff:3700,body:.012},
 {name:'Lyrical soprano',family:'female',profile:'soprano',mix:1.0,tract:.99,open:.65,closing:.24,vowelMin:.20,vowelMax:.73,cutoff:4000,body:.008},
 {name:'Clear soprano',family:'female',profile:'soprano',mix:.90,tract:1.035,open:.62,closing:.23,vowelMin:.26,vowelMax:.82,cutoff:4300,body:.006},
] as const;
function blendVowel(a:Vowel,b:Vowel,weight:number):Vowel{
 const mix=(x:readonly number[],y:readonly number[])=>x.map((v,i)=>v+(y[i]!-v)*weight);
 return {frequency:mix(a.frequency,b.frequency),decibels:mix(a.decibels,b.decibels),bandwidth:mix(a.bandwidth,b.bandwidth)};
}
export function voiceProfile(section:typeof CHOIR_SECTIONS[number]){
 if(section.profile!=='mezzo')return VOICE_PROFILES[section.profile];
 return {a:blendVowel(VOICE_PROFILES.alto.a,VOICE_PROFILES.soprano.a,.4),o:blendVowel(VOICE_PROFILES.alto.o,VOICE_PROFILES.soprano.o,.4)};
}
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
