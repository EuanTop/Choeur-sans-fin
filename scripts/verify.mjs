import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
export function command(binary,args,onProcess){return new Promise((resolve,reject)=>{
 const p=spawn(binary,args,{stdio:['ignore','pipe','pipe']});let chunks=[],error='';onProcess?.(p);
 p.stdout.on('data',b=>chunks.push(b));p.stderr.on('data',b=>error=(error+b).slice(-4000));p.on('error',reject);
 p.on('close',code=>code===0?resolve(Buffer.concat(chunks).toString()):reject(Error(binary+' failed: '+error)));
});}
/** MP4 is intentionally lossy. Validate complete decoding without claiming RGB/PCM equality. */
export async function verify(dir,save=true,onProcess){
 const m=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8')),{width,height,duration,frames,fps}=m;
 if(!Number.isFinite(duration)||duration<=0||duration>48||fps!==30||frames!==Math.round(duration*fps)||!Number.isInteger(width)||!Number.isInteger(height)||width<64||height<64||width>3840||height>3840)throw Error('Invalid export manifest');
 const path=join(dir,'share.mp4'),meta=JSON.parse(await command('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path],onProcess));
 const v=meta.streams.find(s=>s.codec_type==='video'),a=meta.streams.find(s=>s.codec_type==='audio'),expected=m.profile==='portrait-4k'?'hevc':'h264';
 if(!v||!a||v.width!==width||v.height!==height||v.codec_name!==expected||v.pix_fmt!=='yuv420p'||v.r_frame_rate!==`${fps}/1`||a.codec_name!=='aac'||a.channels!==2||Math.abs(Number(meta.format.duration)-duration)>.08)throw Error('MP4 metadata mismatch');
 const report={size:[width,height],duration,frames,codec:v.codec_name,audioCodec:a.codec_name,channels:a.channels,bytes:Number(meta.format.size),decoders:{},lossless:false};
 for(const [name,extra] of [['software',[]],...(process.platform==='darwin'?[['hardware',['-hwaccel','videotoolbox']]]:[])]){
  const progress=await command('ffmpeg',['-hide_banner','-loglevel','error','-xerror',...extra,'-threads','4','-i',path,'-map','0:v:0','-map','0:a:0','-progress','pipe:1','-nostats','-f','null','-'],onProcess);
  const counts=[...progress.matchAll(/^frame=(\d+)$/gm)].map(x=>Number(x[1]));if(counts.at(-1)!==frames)throw Error(name+' decoder did not produce '+frames+' frames');report.decoders[name]={passed:true,decodedFrames:frames};
 }
 if(save)await writeFile(join(dir,'validation.json'),JSON.stringify(report,null,2));return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){if(!process.argv[2])throw Error('Pass a completed export directory');console.log(JSON.stringify(await verify(process.argv[2]),null,2));}
