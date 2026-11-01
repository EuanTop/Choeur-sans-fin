import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,stat,rm,rename,readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {defaults,schema,validatePatch,DURATION} from '../src/state.ts';
import {musicScore,musicVersionFor,poemVersionFor,BASE_AUDIO_VERSION} from '../src/music/score.ts';
import {Renderer} from './renderer.mjs';
import {video,profiles} from './video.mjs';

export function controlPlugin({rendererFactory=(root,origin)=>new Renderer(root,origin),now=()=>performance.now(),exporter=video}={}){
 const epoch=randomUUID();
 let revision=0,appliedRevision=-1,frameTime=0,state={...defaults},anchor=now();
 let root,renderer,origin,active;
 const jobs=new Map(),keys=new Map();
 const current=()=>({...state,time:state.paused?state.time:(state.time+(now()-anchor)/1000)%DURATION});
 const error=(code,message)=>Object.assign(Error(message),{code});
 const reply=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 async function body(req){let size=0;const parts=[];for await(const p of req){size+=p.length;if(size>65536)throw error(413,'Request too large');parts.push(p);}try{const v=JSON.parse(Buffer.concat(parts).toString()||'{}');if(!v||typeof v!=='object'||Array.isArray(v))throw Error();return v;}catch{throw error(400,'Expected JSON object');}}
 const publicJob=j=>{const {snapshot,process,cleanup,timer,...rest}=j;return rest;};
 async function capture(j,b){
  j.status='running';
  try{
   await stat(join(root,'artifacts'));
   const png=await renderer.frame(b.time??j.snapshot.time,b.width??1080,b.height??1440,j.snapshot);
   if(j.status==='canceled')return;
   const dir=join(root,'artifacts/images');await mkdir(dir,{recursive:true});
   const path=join(dir,`${j.jobId}.png`);await writeFile(path,png);if(j.status==='canceled'){await rm(path,{force:true});return;}
   j.files=[{path,width:b.width??1080,height:b.height??1440,time:b.time??j.snapshot.time}];j.status='completed';j.progress=1;
  }catch(e){if(j.status!=='canceled'){j.status='failed';j.error=e.message;}}
  finally{if(active===j.jobId)active=null;}
 }
 return {name:'lantern-control',configureServer(server){
  root=server.config.root;origin=`http://127.0.0.1:${server.config.server.port}`;renderer=rendererFactory(root,origin);
  server.httpServer?.on('close',()=>{for(const j of jobs.values())if(!['completed','failed','canceled'].includes(j.status)){j.status='canceled';j.process?.kill('SIGTERM');}return renderer.close();});
  server.middlewares.use(async(req,res,next)=>{
   if(!req.url?.startsWith('/__art'))return next();
   try{
    const hosts=[`127.0.0.1:${server.config.server.port}`,`localhost:${server.config.server.port}`];
    if(!hosts.includes(req.headers.host))throw error(403,'Invalid Host');
    if(req.method!=='GET'&&req.headers.origin!=='http://'+req.headers.host)throw error(403,'Same-origin request required');
    const url=new URL(req.url,origin),path=url.pathname.slice(6);
    const requestedVoice=()=>{const v=url.searchParams.get('voice')??state.voice;if(!schema.voice.values.includes(v))throw error(400,'Unknown poem voice');return v;};
    if(req.method==='GET'&&path==='')return reply(res,200,{protocol:1,project:'endless-chorus',duration:DURATION,profiles,capabilities:['schema','state.read','state.patch','capture','exports','jobs','jobs.cancel','music.score','music.render'],rendererConnected:renderer.ready});
    if(req.method==='GET'&&(path==='/music/base'||path==='/music/poem')){
     const version=path==='/music/base'?BASE_AUDIO_VERSION:poemVersionFor(requestedVoice());
     let bytes;try{bytes=await readFile(join(root,'artifacts/audio',version+'.wav'));}catch{throw error(404,'Audio stems have not been rendered');}
     if(bytes.length!==44+DURATION*44100*4)throw error(404,'Audio stem is incomplete');
     res.writeHead(200,{'Content-Type':'audio/wav','Content-Length':bytes.length,'Cache-Control':'no-store','X-Music-Version':version});res.end(bytes);return;
    }
    const requestedLevel=()=>{const raw=url.searchParams.get('volume'),v=raw===null?state.poemVolume:Number(raw);if(raw===''||!Number.isFinite(v)||v<0||v>3)throw error(400,'Invalid poem volume');return v;};
    if(req.method==='GET'&&path==='/music/audio'){
     const version=musicVersionFor(requestedVoice(),requestedLevel()),dir=join(root,'artifacts/audio');let entries=[];
     try{entries=(await readdir(dir)).filter(p=>p.startsWith(version+'-')&&p.endsWith('.wav'));}catch{throw error(404,'Music has not been rendered');}
     const files=await Promise.all(entries.map(async p=>({path:join(dir,p),stat:await stat(join(dir,p))})));files.sort((a,b)=>b.stat.mtimeMs-a.stat.mtimeMs);
     const file=files.find(f=>f.stat.size===44+DURATION*44100*4);if(!file)throw error(404,'Music has not been rendered');
     const bytes=await readFile(file.path);res.writeHead(200,{'Content-Type':'audio/wav','Content-Length':bytes.length,'Cache-Control':'no-store','X-Music-Version':version});res.end(bytes);return;
    }
    if(req.method==='GET'&&path==='/music/score')return reply(res,200,musicScore(requestedVoice(),requestedLevel()));
    if(req.method==='GET'&&path==='/jobs')return reply(res,200,{jobs:[...jobs.values()].map(publicJob)});
    if(req.method==='GET'&&path==='/diagnostics'){
     if(!renderer.ready||typeof renderer.call!=='function')throw error(503,'Capture renderer not connected');
     const r=await renderer.call('Runtime.evaluate',{expression:'window.art.diagnostics()',returnByValue:true},10000);
     if(r.exceptionDetails)throw error(500,'Artwork diagnostics failed');
     return reply(res,200,r.result?.value??{});
    }
    if(req.method==='GET'&&path==='/schema')return reply(res,200,{parameters:schema,defaults,profiles});
    if(req.method==='GET'&&path==='/state')return reply(res,200,{epoch,revision,state:current(),appliedRevision,frameTime});
    if(req.method==='PATCH'&&path==='/state'){
     const b=await body(req);if(b.expectedRevision!==revision)throw error(409,'Revision conflict');
     let patch;try{patch=validatePatch(b.patch);}catch(e){throw error(400,e.message);}
     state={...current(),...patch};anchor=now();revision++;return reply(res,200,{epoch,revision,state,appliedRevision,frameTime});
    }
    if(req.method==='POST'&&path==='/ack'){const b=await body(req);if(b.epoch===epoch&&b.revision===revision&&Number.isFinite(b.frameTime)){appliedRevision=revision;frameTime=b.frameTime;}return reply(res,200,{appliedRevision});}
    if(req.method==='POST'&&path==='/capture'){
     const b=await body(req),key=b.idempotencyKey;if(typeof key!=='string'||!key||key.length>128)throw error(400,'A bounded idempotency key is required');
     const sig=JSON.stringify(b),prior=keys.get(key);if(prior){if(prior.signature!==sig)throw error(409,'Key belongs to another request');return reply(res,200,publicJob(jobs.get(prior.id)));}
     if(b.revision!==revision)throw error(409,'Revision conflict');if(active)throw error(409,'A capture is already running');if(jobs.size>=100)throw error(429,'Session job limit');
     const w=b.width??1080,h=b.height??1440,t=b.time??current().time;
     if(!Number.isInteger(w)||!Number.isInteger(h)||Math.min(w,h)<64||Math.max(w,h)>3840||w*h>11059200||!Number.isFinite(t)||t<0||t>DURATION)throw error(400,'Invalid capture size or time');
     const j={jobId:randomUUID(),status:'queued',progress:0,revision,snapshot:current(),files:[]};jobs.set(j.jobId,j);keys.set(key,{signature:sig,id:j.jobId});active=j.jobId;
     reply(res,202,publicJob(j));void capture(j,{...b,time:t});return;
    }
    if(req.method==='POST'&&path==='/music/render'){
     const b=await body(req),key=b.idempotencyKey;
     if(typeof key!=='string'||!key||key.length>128)throw error(400,'A bounded idempotency key is required');
     const sig=JSON.stringify(b),prior=keys.get(key);if(prior){if(prior.signature!==sig)throw error(409,'Key belongs to another request');return reply(res,200,publicJob(jobs.get(prior.id)));}
     if(b.version!==musicVersionFor(state.voice,state.poemVolume))throw error(409,'Music version changed');
     if(b.revision!==revision)throw error(409,'Revision conflict');if(active)throw error(409,'A render is already running');if(jobs.size>=100)throw error(429,'Session job limit');
     const j={jobId:randomUUID(),status:'running',progress:0,revision,version:musicVersionFor(state.voice,state.poemVolume),snapshot:current(),files:[]};jobs.set(j.jobId,j);keys.set(key,{signature:sig,id:j.jobId});active=j.jobId;
     reply(res,202,publicJob(j));
     void(async()=>{try{await stat(join(root,'artifacts'));const output=await renderer.audio(j.snapshot);if(j.status==='canceled')return;if(output.version!==j.version)throw Error('Music changed during rendering');const dir=join(root,'artifacts/audio');await mkdir(dir,{recursive:true});const path=join(dir,j.version+'-'+j.jobId+'.wav'),temporary=path+'.partial';try{await writeFile(temporary,output.bytes);if(j.status==='canceled')return;await rename(temporary,path);if(j.status==='canceled'){await rm(path,{force:true});return;}if(typeof output.musicBase64==='string'&&typeof output.poemBase64==='string'){
      if(output.baseVersion!==BASE_AUDIO_VERSION||output.poemVersion!==poemVersionFor(j.snapshot.voice))throw Error('Stem version changed');
      for(const [id,data] of [[BASE_AUDIO_VERSION,output.musicBase64],[poemVersionFor(j.snapshot.voice),output.poemBase64]]){
       const bytes=Buffer.from(data,'base64');if(bytes.length!==44+DURATION*44100*4)throw Error('Incomplete audio stem');
       const stem=join(dir,id+'.wav'),partial=stem+'.'+j.jobId+'.partial';try{await writeFile(partial,bytes);await rename(partial,stem);}finally{await rm(partial,{force:true});}
      }
     }
     j.files=[{path,version:j.version,duration:DURATION,channels:2,sampleRate:44100}];j.status='completed';j.progress=1;}finally{await rm(temporary,{force:true});}}catch(e){if(j.status!=='canceled'){j.status='failed';j.error=e.message;}}finally{if(active===j.jobId)active=null;}})();return;
    }
    if(req.method==='POST'&&path==='/exports'){
     const b=await body(req),key=b.idempotencyKey;
     if(typeof key!=='string'||!key||key.length>128)throw error(400,'A bounded idempotency key is required');
     const sig='exports:'+JSON.stringify(b),prior=keys.get(key);if(prior){if(prior.signature!==sig)throw error(409,'Key belongs to another request');return reply(res,200,publicJob(jobs.get(prior.id)));}
     const profile=b.profile??'portrait-4k';if(!Object.hasOwn(profiles,profile))throw error(400,'Unknown export profile');
     if(b.revision!==revision)throw error(409,'Revision conflict');if(active)throw error(409,'A render is already running');if(jobs.size>=100)throw error(429,'Session job limit');
     const j={jobId:randomUUID(),status:'running',stage:'preparing',progress:0,revision,snapshot:current(),createdAt:new Date().toISOString(),deadline:Date.now()+60*60*1000,files:[]};
     jobs.set(j.jobId,j);keys.set(key,{signature:sig,id:j.jobId});active=j.jobId;
     j.timer=setTimeout(()=>{if(!j.published&&!['completed','failed','canceled'].includes(j.status)){j.status='failed';j.error='Export exceeded the 60 minute deadline';j.process?.kill('SIGTERM');void renderer.close();}},60*60*1000);
     reply(res,202,publicJob(j));
     void(async()=>{try{await exporter(root,renderer,j,profile);if(j.status==='canceled')throw Error('canceled');j.status='completed';j.stage='complete';j.progress=1;}catch(e){if(j.status!=='canceled'){j.status='failed';j.error=e.message;}j.process?.kill('SIGTERM');for(const p of j.cleanup??[])await rm(p,{recursive:true,force:true}).catch(()=>{});}finally{clearTimeout(j.timer);delete j.process;if(active===j.jobId)active=null;}})();return;
    }
    const match=path.match(/^\/jobs\/([a-zA-Z0-9-]+)(\/cancel)?$/);
    if(match){const j=jobs.get(match[1]);if(!j)throw error(404,'Unknown job');if(req.method==='GET'&&!match[2])return reply(res,200,publicJob(j));if(req.method==='POST'&&match[2]){await body(req);if(j.committing&&!j.published)throw error(409,'Verified output publication is committing');if(!['completed','failed','canceled'].includes(j.status)&&!j.published){j.status='canceled';j.process?.kill('SIGTERM');if(j.frames)void renderer.close();}return reply(res,200,publicJob(j));}}
    throw error(404,'Unknown endpoint');
   }catch(e){if(!res.headersSent)reply(res,e.code||500,{error:e.message});}
  });
 }};
}
