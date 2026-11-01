import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {mkdtemp,mkdir,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// @ts-ignore: service also runs directly in Node.
import {defaults,DURATION} from '../src/state.ts';
import {controlPlugin} from '../scripts/control.mjs';

test('local control: atomic state, exact pause clock, Origin guards, capture lifecycle',async()=>{
 const root=await mkdtemp(join(tmpdir(),'cloth-control-'));await mkdir(join(root,'artifacts'));
 let tick=0,handler:any,resolveFrame:any,resolveAudio:any,calls=0,musicCalls=0;
 const renderer={ready:true,close(){},audio(){musicCalls++;return new Promise(resolve=>{resolveAudio=resolve;});},frame(){calls++;return new Promise(resolve=>{resolveFrame=resolve;});}};
 const plugin=controlPlugin({rendererFactory:()=>renderer,now:()=>tick});
 plugin.configureServer({config:{root,server:{port:5176}},httpServer:{on(){}},middlewares:{use(fn:any){handler=fn;}}});
 async function request(method:string,path:string,value?:unknown,origin='http://127.0.0.1:5176'){
  const req=Readable.from(value===undefined?[]:[Buffer.from(JSON.stringify(value))]) as any;
  req.url='/__art'+path;req.method=method;req.headers={host:'127.0.0.1:5176',origin};
  let status=0,result:any;const res={headersSent:false,writeHead(code:number){status=code;this.headersSent=true;},end(raw:string){result=JSON.parse(raw);}};
  await handler(req,res,()=>{throw Error('Unexpected middleware fallthrough');});return {status,body:result};
 }
 try{
  tick=5000;let s=await request('GET','/state');assert.equal(s.body.state.time,defaults.time+5);
  const epoch=s.body.epoch;await request('POST','/ack',{epoch:'stale',revision:0,frameTime:5});s=await request('GET','/state');assert.equal(s.body.appliedRevision,-1);
  await request('POST','/ack',{epoch,revision:0,frameTime:5});s=await request('GET','/state');assert.equal(s.body.appliedRevision,0);
  let r=await request('PATCH','/state',{expectedRevision:0,patch:{paused:true}});assert.equal(r.body.state.time,defaults.time+5);tick=12000;s=await request('GET','/state');assert.equal(s.body.state.time,defaults.time+5);
  r=await request('PATCH','/state',{expectedRevision:1,patch:{light:1.6,wind:99}});assert.equal(r.status,400);s=await request('GET','/state');assert.equal(s.body.revision,1);assert.equal(s.body.state.light,1);
  r=await request('PATCH','/state',{expectedRevision:0,patch:{light:1.6}});assert.equal(r.status,409);
  r=await request('PATCH','/state',{expectedRevision:1,patch:{paused:false}});assert.equal(r.status,200);tick=14000;s=await request('GET','/state');assert.equal(s.body.state.time,defaults.time+7);
  assert.equal((await request('PATCH','/state',{expectedRevision:2,patch:{light:1}},'https://example.com')).status,403);
  assert.equal((await request('POST','/capture',{revision:2,time:8,width:9999,idempotencyKey:'invalid'})).status,400);
  const command={revision:2,time:8,width:300,height:400,idempotencyKey:'capture-once'};
  r=await request('POST','/capture',command);assert.equal(r.status,202);const id=r.body.jobId;
  while(!resolveFrame)await new Promise(resolve=>setImmediate(resolve));
  const duplicate=await request('POST','/capture',command);assert.equal(duplicate.body.jobId,id);assert.equal(calls,1);
  assert.equal((await request('POST','/capture',{...command,time:9})).status,409);
  resolveFrame(Buffer.from('mock-render-result'));
  let job:any;for(let i=0;i<100;i++){job=(await request('GET','/jobs/'+id)).body;if(job.status==='completed')break;await new Promise(resolve=>setTimeout(resolve,2));}
  assert.equal(job.status,'completed');assert.equal((await readFile(job.files[0].path)).toString(),'mock-render-result');
  r=await request('POST','/capture',{...command,idempotencyKey:'cancel-me'});const canceled=r.body.jobId;resolveFrame=null;while(!resolveFrame)await new Promise(resolve=>setImmediate(resolve));
  await request('POST','/jobs/'+canceled+'/cancel',{});resolveFrame(Buffer.from('must-not-publish'));
  await new Promise(resolve=>setTimeout(resolve,10));job=(await request('GET','/jobs/'+canceled)).body;assert.equal(job.status,'canceled');assert.deepEqual(job.files,[]);
  const score=(await request('GET','/music/score')).body;
  assert.equal(score.duration,DURATION);assert.deepEqual(score.cues.map((c:any)=>c.time),[4,12,20,28]);
  assert.equal((await request('POST','/music/render',{revision:2,version:'stale',idempotencyKey:'bad-music'})).status,409);
  const musicCommand={revision:2,version:score.version,idempotencyKey:'music-once'};
  r=await request('POST','/music/render',musicCommand);const musicId=r.body.jobId;
  while(!resolveAudio)await new Promise(resolve=>setImmediate(resolve));
  assert.equal((await request('POST','/music/render',musicCommand)).body.jobId,musicId);assert.equal(musicCalls,1);
  resolveAudio({version:score.version,bytes:Buffer.from('mock-wave')});
  for(let i=0;i<100;i++){job=(await request('GET','/jobs/'+musicId)).body;if(job.status==='completed')break;await new Promise(resolve=>setTimeout(resolve,2));}
  assert.equal(job.status,'completed');assert.equal(job.files[0].channels,2);assert.equal((await readFile(job.files[0].path)).toString(),'mock-wave');
  resolveAudio=null;r=await request('POST','/music/render',{...musicCommand,idempotencyKey:'cancel-music'});const cancelMusic=r.body.jobId;
  while(!resolveAudio)await new Promise(resolve=>setImmediate(resolve));await request('POST','/jobs/'+cancelMusic+'/cancel',{});
  resolveAudio({version:score.version,bytes:Buffer.from('do-not-publish')});await new Promise(resolve=>setTimeout(resolve,10));
  assert.deepEqual((await request('GET','/jobs/'+cancelMusic)).body.files,[]);
  tick=50000;s=await request('GET','/state');assert.ok(s.body.state.time<DURATION);assert.equal(s.body.state.paused,false);
  r=await request('PATCH','/state',{expectedRevision:2,patch:{time:0,paused:false}});assert.equal(r.status,200);tick=51000;s=await request('GET','/state');assert.equal(s.body.state.time,1);
  assert.equal((await request('GET','/music/score?voice=invalid')).status,400);
  const a=(await request('GET','/music/score?voice=Voice%20A')).body,b=(await request('GET','/music/score?voice=Voice%20B')).body;
  assert.notEqual(a.version,b.version);assert.equal(b.voice,'Voice B');
  r=await request('PATCH','/state',{expectedRevision:3,patch:{voice:'Voice C'}});assert.equal(r.status,200);
  assert.equal((await request('GET','/music/score')).body.voice,'Voice C');
  assert.equal((await request('POST','/music/render',{revision:4,version:a.version,idempotencyKey:'wrong-take'})).status,409);
  const before=(await request('GET','/music/score')).body.version;
  assert.equal((await request('PATCH','/state',{expectedRevision:4,patch:{poemVolume:3.01}})).status,400);
  assert.equal((await request('PATCH','/state',{expectedRevision:4,patch:{poemVolume:1.8}})).status,200);
  const after=(await request('GET','/music/score')).body;assert.notEqual(after.version,before);assert.equal(after.poemVolume,1.8);
  assert.equal((await request('GET','/music/score?volume=0')).body.poemVolume,0);
  assert.equal((await request('GET','/music/score?volume=4')).status,400);
 }finally{await rm(root,{recursive:true,force:true});}
});
