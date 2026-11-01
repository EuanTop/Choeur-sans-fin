import {DURATION} from './state.ts';

const SIZE=256,RATE=12,STATES=DURATION*RATE;
function noise(pixel:number,frame:number){let v=Math.imul(pixel+1,374761393)^Math.imul(frame+17,668265263);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967295*2-1;}
export function grainClock(time:number){const phase=((time%DURATION)+DURATION)%DURATION*RATE,index=Math.floor(phase);return {index,next:(index+1)%STATES,mix:phase-index};}
/** An independent top layer after both the scene and the typography. No scene resampling. */
export function createAnalogFinish(){
 const tile=document.createElement('canvas');tile.width=SIZE;tile.height=SIZE;const texture=tile.getContext('2d')!,data=texture.createImageData(SIZE,SIZE);
 let cached=-1;const first=new Float32Array(SIZE*SIZE),second=new Float32Array(SIZE*SIZE);
 return (ctx:CanvasRenderingContext2D,w:number,h:number,time:number)=>{
  const clock=grainClock(time);
  if(cached!==clock.index){for(let i=0;i<first.length;i++){first[i]=noise(i,clock.index);second[i]=noise(i,clock.next);}cached=clock.index;}
  const a=Math.cos(clock.mix*Math.PI/2),b=Math.sin(clock.mix*Math.PI/2);
  for(let i=0;i<first.length;i++){const grey=Math.round(127+72*(first[i]!*a+second[i]!*b)),j=i*4;data.data[j]=grey;data.data[j+1]=grey;data.data[j+2]=grey;data.data[j+3]=255;}
  texture.putImageData(data,0,0);const scale=w/900,pattern=ctx.createPattern(tile,'repeat')!;pattern.setTransform(new DOMMatrix().scale(scale));
  ctx.save();ctx.shadowBlur=0;ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=.24;ctx.fillStyle=pattern;ctx.fillRect(0,0,w,h);
  ctx.globalCompositeOperation='source-over';const phase=((time%DURATION)+DURATION)%DURATION*2,cycle=Math.floor(phase),fade=Math.sin(Math.PI*(phase-cycle))**2;
  for(let i=0;i<Math.round(18*(h/w)/(4/3));i++){
   const x=(noise(i*7,cycle)+1)*.5*w,y=(noise(i*7+1,cycle)+1)*.5*h,r=(.35+.75*(noise(i*7+2,cycle)+1)*.5)*scale;
   ctx.globalAlpha=fade*(.06+.10*(noise(i*7+3,cycle)+1)*.5);ctx.fillStyle=i%3===0?'#fff0d0':'#120b19';ctx.beginPath();ctx.ellipse(x,y,r,r*.70,noise(i*7+4,cycle)*Math.PI,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;const vignette=ctx.createRadialGradient(w*.5,h*.46,Math.min(w,h)*.30,w*.5,h*.46,Math.max(w,h)*.72);vignette.addColorStop(0,'#10051900');vignette.addColorStop(1,'#10051924');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);ctx.restore();
 };
}
