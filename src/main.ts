import './style.css';
import {createMusicPlayer,musicWav} from './music/soundtrack.ts';
import {createAnalogFinish} from './finishing.ts';
import {createArtwork} from './scene.ts';
import {defaults,schema,DURATION} from './state.ts';
import type {ArtState} from './state.ts';
declare global{interface Window{art:{ready:boolean;renderFrame:(t:number,w:number,h:number,state:ArtState)=>Promise<string>;diagnostics:()=>unknown;renderMusic:typeof musicWav}}}
const renderMode=new URL(location.href).searchParams.has('render');if(renderMode)document.body.dataset.render='true';
const canvas=document.querySelector<HTMLCanvasElement>('#art')!,ctx=canvas.getContext('2d')!;
const status=document.querySelector<HTMLElement>('#status')!;
let state={...defaults},revision=-1,epoch='',anchor=performance.now(),lastAck=-1,lastPoll=0,busy=false;
const player=createMusicPlayer(syncControls),finish=createAnalogFinish();
const controls=document.querySelector('#controls')!;
let volumeTimer:ReturnType<typeof setTimeout>|undefined,desiredVolume:number|undefined,volumeCommit:Promise<void>|undefined;
async function commitVolume(){
 clearTimeout(volumeTimer);volumeTimer=undefined;if(volumeCommit)return volumeCommit;
 volumeCommit=(async()=>{while(desiredVolume!==undefined){const target=desiredVolume;if(await patch({poemVolume:target})&&desiredVolume===target)desiredVolume=undefined;}})().finally(()=>{volumeCommit=undefined;});return volumeCommit;
}
const choirGuide=document.createElement('p');choirGuide.className='note';choirGuide.innerHTML='Lower: Low voice (L) · Contralto (R)<br>Middle: Alto (L) · Mezzo (R)<br>Upper: Soprano I (L) · II (R)';controls.append(choirGuide);
for(const [key,s] of Object.entries(schema)){
 if(key==='paused'||key==='music'||(s.type==='enum'&&s.values.length===1))continue;
 const label=document.createElement('label');label.innerHTML=`<span>${s.label}<output data-output="${key}"></output></span>`;
 const input=s.type==='enum'?document.createElement('select'):document.createElement('input');input.dataset.key=key;
 if(s.type==='boolean'){label.className='toggle';(input as HTMLInputElement).type='checkbox';}
 else if(s.type==='enum')for(const v of s.values){const o=new Option(v,v);input.append(o);}else{Object.assign(input,{type:'range',min:s.min,max:s.max,step:key==='time'?.05:key==='camera'?.5:.01});}
 if(key==='poemVolume'){
  input.addEventListener('input',()=>{desiredVolume=state.poemVolume=Number(input.value);syncControls();clearTimeout(volumeTimer);volumeTimer=setTimeout(()=>void commitVolume(),100);});
  input.addEventListener('change',()=>void commitVolume());
 }else input.addEventListener('change',()=>void patch({[key]:s.type==='boolean'?(input as HTMLInputElement).checked:s.type==='enum'?input.value:Number(input.value),...(key==='time'?{paused:true}:{})}));
 label.append(input);controls.append(label);
}
function syncControls(){for(const input of document.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-key]')){const key=input.dataset.key as keyof ArtState;if(input instanceof HTMLInputElement&&input.type==='checkbox')input.checked=Boolean(state[key]);else input.value=String(state[key]);const o=document.querySelector(`[data-output="${key}"]`);if(o)o.textContent=key==='poemVolume'?Math.round(state.poemVolume*100)+'%':typeof state[key]==='number'?Number(state[key]).toFixed(key==='time'?1:2):'';}document.querySelector('#pause')!.textContent=state.paused?'Play':'Pause';document.querySelector('#music')!.textContent=state.music?(player.isLoading(state.voice)?'Preparing voice…':player.isReady(state.voice)?'Music on':'Resume music'):'Enable music';}
async function poll(){if(busy)return;busy=true;try{const r=await fetch('/__art/state');if(!r.ok)throw Error('Control service unavailable');const v=await r.json();if(v.revision!==revision||v.epoch!==epoch){if(v.epoch!==epoch)lastAck=-1;epoch=v.epoch;revision=v.revision;state=v.state;if(desiredVolume!==undefined)state.poemVolume=desiredVolume;anchor=performance.now();syncControls();}}catch(e){console.warn(e);}finally{busy=false;}}
async function patch(change:Partial<ArtState>){const r=await fetch('/__art/state',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:revision,patch:change})});if(!r.ok){await poll();return false;}const v=await r.json();state=v.state;revision=v.revision;epoch=v.epoch;if(desiredVolume!==undefined)state.poemVolume=desiredVolume;anchor=performance.now();syncControls();return true;}
document.querySelector('#menu')!.addEventListener('click',()=>{document.querySelector<HTMLElement>('#panel')!.hidden=false;});
document.querySelector('#close')!.addEventListener('click',()=>{document.querySelector<HTMLElement>('#panel')!.hidden=true;});
document.querySelector('#pause')!.addEventListener('click',()=>void patch({paused:!state.paused}));document.querySelector('#restart')!.addEventListener('click',()=>void patch({time:0,paused:false}));
document.querySelector('#music')!.addEventListener('click',async()=>{const button=document.querySelector<HTMLButtonElement>('#music')!;try{button.disabled=true;if(!state.music||!player.isReady(state.voice)){button.textContent='Preparing music…';await player.unlock(state.voice);await patch({music:true});}else await patch({music:false});}catch(e){button.textContent='Retry music';console.error(e);}finally{button.disabled=false;}});
let exportJob:string|undefined;
const exportButton=document.querySelector<HTMLButtonElement>('#export')!,cancelButton=document.querySelector<HTMLButtonElement>('#cancel-export')!,exportStatus=document.querySelector<HTMLElement>('#export-status')!;
exportButton.addEventListener('click',async()=>{
 exportButton.disabled=true;cancelButton.hidden=false;
 try{
  await commitVolume();
  const response=await fetch('/__art/exports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,profile:'portrait-hd',idempotencyKey:crypto.randomUUID()})});
  const started=await response.json();if(!response.ok)throw Error(started.error);exportJob=started.jobId;
  while(exportJob){
   const response=await fetch('/__art/jobs/'+exportJob),job=await response.json();if(!response.ok)throw Error(job.error);
   exportStatus.textContent=job.status==='completed'?'MP4 saved in artifacts/exports/latest.':`${job.stage??job.status} · ${Math.round(job.progress*100)}%`;
   if(job.status==='completed')break;if(job.status==='failed'||job.status==='canceled')throw Error(job.error??'Export canceled');
   await new Promise(resolve=>setTimeout(resolve,1500));
  }
 }catch(e){exportStatus.textContent=String(e);}finally{exportJob=undefined;exportButton.disabled=false;cancelButton.hidden=true;}
});
cancelButton.addEventListener('click',async()=>{if(exportJob)await fetch('/__art/jobs/'+exportJob+'/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});});
function text(w:number,h:number){
 ctx.save();ctx.fillStyle='#fff0cf';ctx.shadowColor='#1a1026aa';ctx.shadowBlur=w*.005;ctx.font=`${w*.049}px Goudy`;ctx.fillText('Chœur sans fin',w*.055,h*.065);
 ctx.shadowBlur=0;ctx.font=`${w*.016}px Goudy`;ctx.fillStyle='#f3ddbc';ctx.fillText('Et la nuit recommence',w*.057,h*.087);ctx.fillStyle='#fff0cf';
 ctx.shadowBlur=0;ctx.font=`${w*.023}px Goudy`;ctx.textAlign='right';ctx.fillText('@EuanTop',w*.945,h*.065);
 ctx.restore();
}
try{
 await document.fonts.load('24px Goudy');const art=await createArtwork();
 function draw(t:number,w:number,h:number,s:ArtState){if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}art.render(t,w,h,s);ctx.drawImage(art.canvas,0,0,w,h);text(w,h);if(s.analog)finish(ctx,w,h,t);}
 function fit(){const [a,b]=state.aspect.split(':').map(Number),ratio=a!/b!;const w=Math.min(innerWidth,innerHeight*ratio),h=w/ratio;canvas.style.width=w+'px';canvas.style.height=h+'px';return [Math.round(w*Math.min(devicePixelRatio,1.5)),Math.round(h*Math.min(devicePixelRatio,1.5))];}
 window.art={ready:false,async renderFrame(t,w,h,s){draw(t,w,h,s);return canvas.toDataURL('image/png');},diagnostics:()=>art.diagnostics(),renderMusic:musicWav};
 await poll();const size=fit();draw(state.time,size[0]!,size[1]!,state);window.art.ready=true;status.hidden=true;
 document.querySelector('#save')!.addEventListener('click',()=>{const a=document.createElement('a');a.download='endless-chorus.png';a.href=canvas.toDataURL('image/png');a.click();});
 function animate(now:number){if(renderMode)return;try{const t=state.paused?state.time:(state.time+(now-anchor)/1000)%DURATION;const [w,h]=fit();draw(t,w!,h!,state);player.update(t,state.paused,state.music,state.voice,state.poemVolume);if(lastAck!==revision&&revision>=0){lastAck=revision;void fetch('/__art/ack',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({epoch,revision,frameTime:t})});}if(now-lastPoll>600){lastPoll=now;void poll();}requestAnimationFrame(animate);}catch(e){status.hidden=false;status.textContent=String(e);console.error(e);}}
 if(!renderMode)requestAnimationFrame(animate);addEventListener('pagehide',()=>{player.dispose();art.dispose();},{once:true});
}catch(e){status.textContent=String(e);console.error(e);}
