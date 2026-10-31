import test from 'node:test';
import assert from 'node:assert/strict';
import {CHORDS,harmonyAt} from '../src/music/score.ts';
import {cyclePitchCorrection} from '../src/music/soundtrack.ts';
import {PERFORMANCE_CUES,chorusEnergyAt,sectionEnergyAt} from '../src/lantern/performance.ts';
import {DURATION} from '../src/state.ts';

const roots:Record<string,number>={A:9,Bb:10,C:0,D:2,Eb:3,F:5,'F#':6,G:7,B:11};
const formulas:Record<string,number[]>={'':[0,4,7],'m7':[0,3,7,10],maj9:[0,4,7,11,2],'5':[0,7],'m(add9)':[0,3,7,2],m:[0,3,7],maj7:[0,4,7,11],'6':[0,4,7,9],add9:[0,4,7,2],sus4:[0,5,7],'sus4(b9)':[0,5,7,1],'7b9':[0,4,7,10,1]};
test('the sounding voicings match their chord names, including altered tones and slash basses',()=>{
 let next=0;
 for(const h of CHORDS){
  assert.ok(Math.abs(h.time-next)<1e-9,'harmonic events must cover the clock without overlaps or gaps');next=h.time+h.duration;
  const label=h.name.replace(/\/(?:Ab|Bb|C|Db|D|Eb|F#|F|G)$/,''),match=label.match(/^([A-G](?:b|#)?)(.*)$/)!;
  const root=roots[match[1]!]!,formula=formulas[match[2]!]!;assert.ok(formula,h.name);
  for(const note of h.notes)assert.ok(formula.includes((note-root+120)%12),`${h.name} contains an unintended ${note}`);
  assert.equal(h.notes.length,6);for(let i=1;i<6;i++)assert.ok(h.notes[i]!>h.notes[i-1]!,'voices must not cross');
 }
 assert.ok(Math.abs(next-DURATION)<1e-9);
 for(const cue of PERFORMANCE_CUES){const h=harmonyAt(cue.time),pcs=new Set([...h.notes,h.bass].map(n=>n%12));assert.ok(pcs.has(cue.note%12));assert.ok(pcs.has(cue.reply%12),'the answering duck call must fit the active harmony');}
});
test('continuous choir lines move by small intervals and return to the opening voicing',()=>{
 let small=0,total=0;
 CHORDS.forEach((h,i)=>{const next=CHORDS[(i+1)%CHORDS.length]!;for(let lane=0;lane<6;lane++){const d=Math.abs(h.notes[lane]!-next.notes[lane]!);assert.ok(d<=6);if(d<=2)small++;total++;}});
 assert.ok(small/total>.65,'most voices should hold a common tone or move by step');
 assert.ok(CHORDS.filter(h=>h.time<16).every(h=>h.bass===38),'the held final must survive the changing choral harmony');
});
test('persistent voices close their oscillator phase without an audible tuning change',()=>{
 for(let lane=0;lane<6;lane++)for(const detune of [-5.5,0,5.8]){
  const frequencies=CHORDS.map(h=>440*2**((h.notes[lane]!-69)/12)*2**(detune/1200));
  const correction=cyclePitchCorrection(frequencies,CHORDS.map(h=>h.duration));
  const cycles=frequencies.reduce((s,f,i)=>s+(f+correction)*CHORDS[i]!.duration,0);
  assert.ok(Math.abs(cycles-Math.round(cycles))<1e-8);
  assert.ok(frequencies.every(f=>Math.abs(1200*Math.log2((f+correction)/f))<.65));
 }
 for(const cue of PERFORMANCE_CUES){assert.ok(chorusEnergyAt(cue.time)>.99);assert.ok(chorusEnergyAt(cue.time+4)<.31);}
 for(let t=0;t<32;t+=.1)for(let section=0;section<6;section++){const energy=sectionEnergyAt(t,section);assert.ok(energy>0&&energy<=1);assert.ok(Math.abs(energy-sectionEnergyAt(t+32,section))<1e-9);}
 assert.ok(Math.abs(chorusEnergyAt(32-.0001)-chorusEnergyAt(.0001))<.001);
});
