import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readdir,rm,symlink,readlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// @ts-ignore: shared Node exporter.
import {encodingArgs,DEFAULT_PROFILE,retirePrevious} from '../scripts/video.mjs';

test('share encoding has one MP4 output, stereo AAC and no master intermediate',()=>{
 const args=encodingArgs(DEFAULT_PROFILE,'score.wav','share.mp4');
 assert.equal(DEFAULT_PROFILE,'portrait-hd');
 assert.equal(args[args.indexOf('-c:v')+1],'libx264');
 assert.equal(args[args.indexOf('-c:a')+1],'aac');
 assert.equal(args.at(-1),'share.mp4');
 assert.equal(args.includes('ffv1'),false);
 assert.equal(args.some((v:string)=>v.endsWith('.mkv')),false);
 assert.equal(encodingArgs('portrait-4k','score.wav','share.mp4','darwin').includes('hevc_videotoolbox'),true);
});

test('retention removes only superseded marked exports, preserves current, explicit history and unknown folders',async()=>{
 const root=await mkdtemp(join(tmpdir(),'art-retention-'));
 try{
  for(const [name,fields] of Object.entries({old:{},current:{},retained:{retained:true},foreign:{projectId:'another-artwork'}})){
   await mkdir(join(root,name));
   await writeFile(join(root,name,'manifest.json'),JSON.stringify({projectId:'choeur-sans-fin',retention:'latest-share-only',...fields}));
  }
  await mkdir(join(root,'unknown'));await mkdir(join(root,'.job-live'));
  await symlink('current',join(root,'latest'));
  await retirePrevious(root,'current');
  assert.deepEqual((await readdir(root)).sort(),['.job-live','current','foreign','latest','retained','unknown']);
  assert.equal(await readlink(join(root,'latest')),'current');
 }finally{await rm(root,{recursive:true,force:true});}
});
