import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';
// @ts-ignore: local rendering backend runs directly in Node.
import {Renderer} from '../scripts/renderer.mjs';

test('a capture cannot accept a ready flag from the previous source revision',async()=>{
 const root=await mkdtemp(join(tmpdir(),'cloth-source-'));
 try{
  await mkdir(join(root,'src'));await writeFile(join(root,'src/main.ts'),'old');
  const r=new Renderer(root,'http://127.0.0.1:5176');r.stamp=await r.sourceStamp();
  let href='http://127.0.0.1:5176/?render=1&source='+r.stamp,target=href,checks=0,reloads=0;
  r.connect=async()=>{r.ready=true;};
  r.call=async(method:string,args:any)=>{
   if(method==='Page.navigate'){target=args.url;reloads++;return {};}
   if(method!=='Runtime.evaluate')throw Error(method);
   if(args.expression.includes('Boolean(window.art?.ready)')){checks++;if(checks>=2)href=target;}
   const renderFrame=()=> 'data:image/png;base64,'+Buffer.from(href===target?'new':'old').toString('base64');
   return {result:{value:await runInNewContext(args.expression,{window:{art:{ready:true,renderFrame}},location:{href},URL})}};
  };
  await writeFile(join(root,'src/main.ts'),'new');
  const image=await r.frame(0,100,100,{});
  assert.equal(image.toString(),'new');assert.ok(checks>=2);assert.equal(reloads,1);
  await r.frame(0,100,100,{});assert.equal(reloads,1);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('a failed renderer launch is closed and a subsequent attempt can reconnect',async()=>{
 const r=new Renderer('/unused','http://127.0.0.1:5176');let attempts=0,closed=0;
 r.open=async()=>{attempts++;if(attempts===1)throw Error('shader failed');r.ready=true;};
 r.close=async()=>{closed++;r.ready=false;};
 await assert.rejects(r.connect(),/shader failed/);assert.equal(closed,1);
 await r.connect();assert.equal(attempts,2);assert.equal(r.ready,true);
});
