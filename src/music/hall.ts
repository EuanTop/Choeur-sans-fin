/** The same room, early reflections and decay are used by choir and spoken voices. */
export function hallImpulse(context:BaseAudioContext,random:()=>number){
 const sr=context.sampleRate,ir=context.createBuffer(2,Math.round(sr*7.2),sr);
 for(let ch=0;ch<2;ch++){
  const a=ir.getChannelData(ch);let low=0;
  for(let i=0;i<a.length;i++){const t=i/sr;low=.74*low+.26*random();a[i]=low*Math.exp(-t*.80)*Math.min(1,t/.12);}
  for(const [time,level] of [[.066,.24],[.117,.17],[.194,.12],[.301,.075]])a[Math.round((time!+ch*.013)*sr)]!+=level!;
 }
 return ir;
}
