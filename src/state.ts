export const DURATION=32;
export const schema={
 aspect:{type:'enum',values:['3:4','9:16','16:9'],label:'Frame'},
 time:{type:'number',min:0,max:DURATION,label:'Scene time'},
 paused:{type:'boolean',label:'Pause'},
 music:{type:'boolean',label:'Music'},
 motion:{type:'number',min:0,max:1.6,label:'Character motion'},
 choirVariation:{type:'number',min:0,max:1,label:'Choir individuality'},
 wind:{type:'number',min:0,max:1.6,label:'Night breeze'},
 light:{type:'number',min:.3,max:1.8,label:'Amber light'},
 camera:{type:'number',min:-20,max:20,label:'Viewpoint'},
} as const;
export const defaults={aspect:'3:4',time:0,paused:false,music:false,motion:1,choirVariation:1,wind:1,light:1,camera:0};
export type ArtState=typeof defaults;
export function validatePatch(value:unknown):Partial<ArtState>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Expected a parameter object');
 for(const [key,v] of Object.entries(value)){
  const s=schema[key as keyof typeof schema];if(!s)throw Error('Unknown parameter: '+key);
  if(s.type==='boolean'){if(typeof v!=='boolean')throw Error('Expected boolean: '+key);}
  else if(s.type==='enum'){if(typeof v!=='string'||!s.values.includes(v as never))throw Error('Unknown option: '+key);}
  else if(typeof v!=='number'||!Number.isFinite(v)||v<s.min||v>s.max)throw Error('Out of range: '+key);
 }
 return value as Partial<ArtState>;
}
