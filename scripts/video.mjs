import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {mkdir,stat,statfs,readFile,writeFile,rename,rm,readdir,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {DURATION} from '../src/state.ts';
import {musicVersionFor} from '../src/music/score.ts';
import {verify} from './verify.mjs';

export const profiles={'portrait-hd':[1440,1920],'portrait-4k':[2880,3840]};
export const DEFAULT_PROFILE='portrait-hd';
const FPS=30,FRAMES=DURATION*FPS,MAX_BYTES=4*1024**3,PROJECT='choeur-sans-fin';
export function checkJob(j){if(j.status==='canceled')throw Error('canceled');if(j.status==='failed')throw Error(j.error||'Export failed');if(Date.now()>j.deadline)throw Error('Export exceeded the 60 minute deadline');}
function processFor(j,p){j.process=p;try{checkJob(j)}catch(e){p.kill('SIGTERM');throw e;}}
export function encodingArgs(profile,wav,share,platform=process.platform){
 if(!Object.hasOwn(profiles,profile))throw Error('Unknown export profile');
 const codec=profile==='portrait-hd'?['-c:v','libx264','-preset','medium','-crf','17','-profile:v','high','-level:v','5.0','-maxrate','24M','-bufsize','48M']:platform==='darwin'?['-c:v','hevc_videotoolbox','-q:v','80','-tag:v','hvc1']:['-c:v','libx265','-preset','medium','-crf','17','-x265-params','pools=4:frame-threads=2:log-level=error','-tag:v','hvc1'];
 return ['-hide_banner','-loglevel','error','-y','-threads','4','-f','image2pipe','-vcodec','png','-framerate',String(FPS),'-i','pipe:0','-i',wav,'-map','0:v:0','-map','1:a:0','-frames:v',String(FRAMES),'-vf','scale=iw:ih:out_color_matrix=bt709:out_range=tv',...codec,'-pix_fmt','yuv420p','-g','30','-threads','4','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-c:a','aac','-b:a','256k','-movflags','+faststart','-t',String(DURATION),share];
}
async function cachedAudio(root,voice,level){
 const version=musicVersionFor(voice,level),dir=join(root,'artifacts/audio');
 const candidates=await Promise.all((await readdir(dir)).filter(f=>f.startsWith(version+'-')&&f.endsWith('.wav')).map(async f=>({path:join(dir,f),info:await stat(join(dir,f))})));
 candidates.sort((a,b)=>b.info.mtimeMs-a.info.mtimeMs);return candidates.find(f=>f.info.size===44+DURATION*44100*4)?.path;
}
/** Only exports carrying our retention marker are eligible for automatic retirement. */
export async function retirePrevious(exports,current){
 for(const entry of await readdir(exports,{withFileTypes:true})){
  if(!entry.isDirectory()||entry.name===current||entry.name.startsWith('.'))continue;
  const path=join(exports,entry.name);let m;try{m=JSON.parse(await readFile(join(path,'manifest.json'),'utf8'));}catch{continue;}
  if(m.projectId===PROJECT&&m.retention==='latest-share-only'&&m.retained!==true)await rm(path,{recursive:true,force:true});
 }
}
export async function video(root,renderer,j,profile=DEFAULT_PROFILE){
 if(!Object.hasOwn(profiles,profile))throw Error('Unknown export profile');const [width,height]=profiles[profile];
 await stat(join(root,'artifacts'));let disk=await statfs(join(root,'artifacts'));
 if(Number(disk.bavail)*Number(disk.bsize)<2*1024**3)throw Error('At least 2 GiB free output storage required');
 const exports=join(root,'artifacts/exports'),dir=join(exports,'.job-'+j.jobId);await mkdir(dir,{recursive:true});j.cleanup=[dir];j.stage='preparing music';
 let wav=await cachedAudio(root,j.snapshot.voice,j.snapshot.poemVolume).catch(()=>undefined);const version=musicVersionFor(j.snapshot.voice,j.snapshot.poemVolume);
 if(!wav){const a=await renderer.audio(j.snapshot);checkJob(j);if(a.version!==version)throw Error('Music version changed');const folder=join(root,'artifacts/audio');await mkdir(folder,{recursive:true});wav=join(folder,version+'-'+j.jobId+'.wav');await writeFile(wav,a.bytes);}
 checkJob(j);const share=join(dir,'share.mp4'),stamp=await renderer.sourceStamp();j.stage='rendering MP4 frames';j.width=width;j.height=height;j.frames=FRAMES;j.frame=0;
 const p=spawn(process.env.FFMPEG_PATH||'ffmpeg',encodingArgs(profile,wav,share),{stdio:['pipe','ignore','pipe']});processFor(j,p);let log='',pipeError;
 p.stderr.on('data',b=>log=(log+b).slice(-5000));p.stdin.on('error',e=>pipeError=e);const done=once(p,'close');done.catch(()=>{});
 const sourceFrames=[],sampleFrames=[0,FRAMES/4,FRAMES/2,FRAMES*3/4,FRAMES-1];
 try{
  for(let frame=0;frame<FRAMES;frame++){
   checkJob(j);if(pipeError)throw pipeError;if(await renderer.sourceStamp()!==stamp)throw Error('Source changed during export; restart with the new artwork');
   const png=await renderer.frame(frame/FPS,width,height,{...j.snapshot,aspect:'3:4'});checkJob(j);
   if(sampleFrames.includes(frame))sourceFrames.push({frame,pngSha256:createHash('sha256').update(png).digest('hex')});
   if(!p.stdin.write(png))await Promise.race([once(p.stdin,'drain'),done.then(()=>{throw Error('Encoder closed early: '+log);})]);
   j.frame=frame+1;j.progress=(frame+1)/FRAMES*.85;
   if(frame%60===0){disk=await statfs(dir);if(Number(disk.bavail)*Number(disk.bsize)<512*1024**2||(await stat(share).catch(()=>({size:0}))).size>MAX_BYTES)throw Error('Export storage limit reached');}
  }
  p.stdin.end();const [code]=await done;if(code!==0)throw Error('MP4 encoding failed: '+log);
 }catch(e){p.kill('SIGTERM');await done.catch(()=>{});throw e;}
 const manifest={project:'Chœur sans fin',projectId:PROJECT,retention:'latest-share-only',profile,duration:DURATION,fps:FPS,frames:FRAMES,width,height,revision:j.revision,snapshot:j.snapshot,sourceStamp:stamp,sourceFrames,createdAt:j.createdAt,music:version,audioSha256:createHash('sha256').update(await readFile(wav)).digest('hex')};
 await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest,null,2));j.stage='verifying MP4';j.progress=.90;
 await verify(dir,true,p=>processFor(j,p));checkJob(j);j.committing=true;j.stage='publishing verified MP4';
 const name=PROJECT+'-'+j.jobId.slice(0,8),final=join(exports,name),alias=join(exports,'.latest-'+j.jobId);await rename(dir,final);j.cleanup=[final,alias];
 await symlink(name,alias);await rename(alias,join(exports,'latest'));j.cleanup=[];j.published=true;
 j.files=[{path:join(final,'share.mp4'),type:'share',width,height,duration:DURATION,fps:FPS},{path:join(final,'validation.json'),type:'validation'}];
 try{await retirePrevious(exports,name);}catch(e){j.retentionWarning='Current MP4 is safe; previous export cleanup failed: '+e.message;}
}
