import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {mkdir,stat,statfs,readFile,writeFile,rename,rm,readdir,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
import {DURATION} from '../src/state.ts';
import {musicVersionFor} from '../src/music/score.ts';
import {verify} from './verify.mjs';

export const profiles={'portrait-4k':[2880,3840],'portrait-hd':[1440,1920]};
const FPS=30,FRAMES=DURATION*FPS,MAX_BYTES=12*1024**3;
const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';
export function checkJob(j){if(j.status==='canceled')throw Error('canceled');if(j.status==='failed')throw Error(j.error||'Export failed');if(Date.now()>j.deadline)throw Error('Export exceeded the 60 minute deadline');}
function processFor(j,p){j.process=p;try{checkJob(j)}catch(e){p.kill('SIGTERM');throw e;}}
async function run(j,args){
 const p=spawn(ffmpeg,args,{stdio:['ignore','ignore','pipe']});processFor(j,p);let log='';p.stderr.on('data',b=>log=(log+b).slice(-5000));
 const [code]=await once(p,'close');if(code!==0)throw Error('Encoder failed: '+log);checkJob(j);
}
async function cachedAudio(root,voice){
 const version=musicVersionFor(voice);
 const dir=join(root,'artifacts/audio');const files=await readdir(dir);
 const candidates=await Promise.all(files.filter(f=>f.startsWith(version+'-')&&f.endsWith('.wav')).map(async f=>({path:join(dir,f),info:await stat(join(dir,f))})));
 candidates.sort((a,b)=>b.info.mtimeMs-a.info.mtimeMs);return candidates.find(f=>f.info.size===44+DURATION*44100*4)?.path;
}
export async function video(root,renderer,j,profile){
 const [width,height]=profiles[profile];
 await stat(join(root,'artifacts'));let disk=await statfs(join(root,'artifacts'));
 if(Number(disk.bavail)*Number(disk.bsize)<8*1024**3)throw Error('At least 8 GiB free output storage required');
 const exports=join(root,'artifacts/exports'),dir=join(exports,'.job-'+j.jobId);
 await mkdir(dir,{recursive:true});j.cleanup=[dir];j.stage='preparing music';
 const wav=join(dir,'source-audio.wav'),cached=await cachedAudio(root,j.snapshot.voice).catch(()=>undefined);
 if(cached)await copyFile(cached,wav);else{const a=await renderer.audio(j.snapshot);checkJob(j);if(a.version!==musicVersionFor(j.snapshot.voice))throw Error('Music version changed');await writeFile(wav,a.bytes);}
 checkJob(j);const master=join(dir,'master.mkv'),share=join(dir,'share.mp4');
 const stamp=await renderer.sourceStamp();j.stage='rendering frames';j.width=width;j.height=height;j.frames=FRAMES;j.frame=0;
 const p=spawn(ffmpeg,['-hide_banner','-loglevel','error','-y','-threads','4','-f','image2pipe','-vcodec','png','-framerate',String(FPS),'-i','pipe:0','-i',wav,'-map','0:v:0','-map','1:a:0','-frames:v',String(FRAMES),'-c:v','ffv1','-level','3','-coder','1','-context','1','-pix_fmt','gbrp','-threads','4','-c:a','pcm_s16le','-t',String(DURATION),master],{stdio:['pipe','ignore','pipe']});
 processFor(j,p);let log='',pipeError; p.stderr.on('data',b=>log=(log+b).slice(-5000));p.stdin.on('error',e=>pipeError=e);
 const done=once(p,'close');done.catch(()=>{});
 const validation=join(dir,'source-frames');await mkdir(validation);const sourceFrames=[],sampleFrames=[0,Math.floor(FRAMES/4),Math.floor(FRAMES/2),Math.floor(FRAMES*3/4),FRAMES-1];
 try{
  for(let frame=0;frame<FRAMES;frame++){
   checkJob(j);if(pipeError)throw pipeError;if(await renderer.sourceStamp()!==stamp)throw Error('Source changed during export; restart with the new artwork');
   const png=await renderer.frame(frame/FPS,width,height,{...j.snapshot,aspect:'3:4'});checkJob(j);
   if(sampleFrames.includes(frame)){const name=`source-${frame}.png`;await writeFile(join(validation,name),png);sourceFrames.push({frame,name,pngSha256:createHash('sha256').update(png).digest('hex')});}
   if(!p.stdin.write(png))await Promise.race([once(p.stdin,'drain'),done.then(()=>{throw Error('Encoder closed early: '+log);})]);
   j.frame=frame+1;j.progress=(frame+1)/FRAMES*.78;
   if(frame%60===0){disk=await statfs(dir);if(Number(disk.bavail)*Number(disk.bsize)<2*1024**3||(await stat(master).catch(()=>({size:0}))).size>MAX_BYTES)throw Error('Export storage limit reached');}
  }
  p.stdin.end();const [code]=await done;if(code!==0)throw Error('FFV1 encoding failed: '+log);
 }catch(e){p.kill('SIGTERM');await done.catch(()=>{});throw e;}
 checkJob(j);j.stage='encoding 4K sharing video';j.progress=.82;
 const common=['-hide_banner','-loglevel','error','-y','-i',master];
 try{await run(j,[...common,'-c:v','hevc_videotoolbox','-q:v','80','-tag:v','hvc1','-pix_fmt','yuv420p','-g','30','-c:a','aac','-b:a','256k','-movflags','+faststart',share]);}
 catch(e){checkJob(j);await run(j,[...common,'-c:v','libx265','-preset','medium','-crf','17','-x265-params','pools=4:frame-threads=2:log-level=error','-tag:v','hvc1','-pix_fmt','yuv420p','-g','30','-c:a','aac','-b:a','256k','-movflags','+faststart',share]);}
 const manifest={project:'Endless Chorus',duration:DURATION,fps:FPS,frames:FRAMES,width,height,revision:j.revision,snapshot:j.snapshot,sourceStamp:stamp,sourceFrames,sourceFramesDirectory:'source-frames',createdAt:j.createdAt,music:musicVersionFor(j.snapshot.voice)};
 await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest,null,2));j.stage='verifying complete decode, RGB and PCM';j.progress=.90;
 await verify(dir,'master.mkv','share.mp4',true,p=>processFor(j,p));checkJob(j);
 j.committing=true;j.stage='finalizing verified files';
 const name='endless-chorus-'+j.jobId.slice(0,8),final=join(exports,name);await rename(dir,final);j.cleanup=[];j.published=true;
 j.files=[{path:join(final,'share.mp4'),type:'share',width,height,duration:DURATION,fps:FPS},{path:join(final,'master.mkv'),type:'lossless',width,height,duration:DURATION,fps:FPS},{path:join(final,'validation.json'),type:'validation'}];
}
