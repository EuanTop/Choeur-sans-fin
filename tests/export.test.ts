import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
// @ts-ignore: local Vite plugin also runs directly in Node.
import {controlPlugin} from '../scripts/control.mjs';

test('export commands bind a snapshot, deduplicate, guard profiles and cancel without exposing process handles',async()=>{
 let handler:any,resolveExport:any,snapshot:any,calls=0,killed=false;
 const plugin=controlPlugin({now:()=>0,rendererFactory:()=>({close(){},ready:false}),exporter:async(_root:any,_renderer:any,job:any)=>{
  calls++;snapshot=job.snapshot;job.process={kill(){killed=true;}};
  await new Promise(resolve=>resolveExport=resolve);
 }});
 plugin.configureServer({config:{root:'.',server:{port:5176}},httpServer:{on(){}},middlewares:{use(fn:any){handler=fn;}}});
 async function request(method:string,path:string,value?:unknown,origin='http://127.0.0.1:5176'){
  const req=Readable.from(value===undefined?[]:[Buffer.from(JSON.stringify(value))]) as any;req.url='/__art'+path;req.method=method;req.headers={host:'127.0.0.1:5176',origin};
  let status=0,body:any;const res={headersSent:false,writeHead(s:number){status=s;this.headersSent=true;},end(raw:string){body=JSON.parse(raw);}};
  await handler(req,res,()=>{});return {status,body};
 }
 const command={revision:0,profile:'portrait-4k',idempotencyKey:'export-one'};
 assert.equal((await request('POST','/exports',command,'https://example.com')).status,403);
 assert.equal((await request('POST','/exports',{...command,profile:'unbounded'})).status,400);
 assert.equal((await request('POST','/exports',{...command,revision:7})).status,409);
 const started=await request('POST','/exports',command);assert.equal(started.status,202);const id=started.body.jobId;
 assert.equal((await request('POST','/exports',command)).body.jobId,id);assert.equal(calls,1);
 assert.equal((await request('POST','/exports',{...command,idempotencyKey:'second'})).status,409);
 await request('PATCH','/state',{expectedRevision:0,patch:{light:1.5}});assert.equal(snapshot.light,1);
 const running=(await request('GET','/jobs/'+id)).body;assert.equal(running.process,undefined);assert.equal(running.snapshot,undefined);assert.equal(running.timer,undefined);
 await request('POST','/jobs/'+id+'/cancel',{});assert.equal(killed,true);
 resolveExport();await new Promise(resolve=>setTimeout(resolve,10));
 const canceled=(await request('GET','/jobs/'+id)).body;assert.equal(canceled.status,'canceled');assert.deepEqual(canceled.files,[]);
});
