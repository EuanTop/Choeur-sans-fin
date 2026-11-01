/** Speech gain is independent of the music. Only peaks above the headroom knee are softened. */
export function blendSample(music:number,poem:number,level:number){
 const x=music+poem*level,a=Math.abs(x);return a<=.92?x:Math.sign(x)*(.92+.08*Math.tanh((a-.92)/.08));
}
export function outputCurve(){return Float32Array.from({length:32769},(_,i)=>blendSample((i/32768*2-1)*4,0,0));}
