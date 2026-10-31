import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,stat,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {defaults,schema,validatePatch,DURATION} from '../src/state.ts';
import {Renderer} from './renderer.mjs';

export function controlPlugin({rendererFactory=(root,origin)=>new Renderer(root,origin),now=()=>performance.now()}={}){
 const epoch=randomUUID();
 let revision=0,appliedRevision=-1,frameTime=0,state={...defaults},anchor=now();
 let root,renderer,origin,active;
 const jobs=new Map(),keys=new Map();
 const current=()=>({...state,time:state.paused?state.time:(state.time+(now()-anchor)/1000)%DURATION});
 const error=(code,message)=>Object.assign(Error(message),{code});
 const reply=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 async function body(req){let size=0;const parts=[];for await(const p of req){size+=p.length;if(size>65536)throw error(413,'Request too large');parts.push(p);}try{const v=JSON.parse(Buffer.concat(parts).toString()||'{}');if(!v||typeof v!=='object'||Array.isArray(v))throw Error();return v;}catch{throw error(400,'Expected JSON object');}}
 const publicJob=j=>{const {snapshot,...rest}=j;return rest;};
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
 return {name:'duck-feet-control',configureServer(server){
  root=server.config.root;origin=`http://127.0.0.1:${server.config.server.port}`;renderer=rendererFactory(root,origin);
  server.httpServer?.on('close',()=>renderer.close());
  server.middlewares.use(async(req,res,next)=>{
   if(!req.url?.startsWith('/__art'))return next();
   try{
    const hosts=[`127.0.0.1:${server.config.server.port}`,`localhost:${server.config.server.port}`];
    if(!hosts.includes(req.headers.host))throw error(403,'Invalid Host');
    if(req.method!=='GET'&&req.headers.origin!=='http://'+req.headers.host)throw error(403,'Same-origin request required');
    const path=new URL(req.url,origin).pathname.slice(6);
    if(req.method==='GET'&&path==='')return reply(res,200,{protocol:1,project:'duck-feet',duration:DURATION,capabilities:['schema','state.read','state.patch','capture','jobs','jobs.cancel'],rendererConnected:renderer.ready});
    if(req.method==='GET'&&path==='/jobs')return reply(res,200,{jobs:[...jobs.values()].map(publicJob)});
    if(req.method==='GET'&&path==='/diagnostics'){
     if(!renderer.ready||typeof renderer.call!=='function')throw error(503,'Capture renderer not connected');
     const r=await renderer.call('Runtime.evaluate',{expression:'window.art.diagnostics()',returnByValue:true},10000);
     if(r.exceptionDetails)throw error(500,'Artwork diagnostics failed');
     return reply(res,200,r.result?.value??{});
    }
    if(req.method==='GET'&&path==='/schema')return reply(res,200,{parameters:schema,defaults});
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
    const match=path.match(/^\/jobs\/([a-zA-Z0-9-]+)(\/cancel)?$/);
    if(match){const j=jobs.get(match[1]);if(!j)throw error(404,'Unknown job');if(req.method==='GET'&&!match[2])return reply(res,200,publicJob(j));if(req.method==='POST'&&match[2]){await body(req);if(!['completed','failed','canceled'].includes(j.status))j.status='canceled';return reply(res,200,publicJob(j));}}
    throw error(404,'Unknown endpoint');
   }catch(e){if(!res.headersSent)reply(res,e.code||500,{error:e.message});}
  });
 }};
}
