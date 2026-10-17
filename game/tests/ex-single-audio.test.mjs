import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=new URL('../dist/assets/audio/reveals/',import.meta.url);
function wavInfo(b){
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');
 let format,data;
 for(let p=12;p+8<=b.length;){const id=b.toString('ascii',p,p+4),size=b.readUInt32LE(p+4);if(id==='fmt ')format={channels:b.readUInt16LE(p+10),rate:b.readUInt32LE(p+12),align:b.readUInt16LE(p+20)};if(id==='data')data=size;p+=8+size+(size%2);}
 return {...format,frames:data/format.align};
}
test('EX choir reveal has the same frame count as grade7 and its own final cue',async()=>{
 const grade7=wavInfo(await readFile(new URL('musiclab-grade7-step-3-brass-v14.wav',base)));
 const ex=wavInfo(await readFile(new URL('musiclab-ex-single-choir-v15.wav',base)));
 assert.deepEqual(ex,grade7);assert.equal(ex.frames/ex.rate,3.1);
 const score=JSON.parse(await readFile(new URL('./fixtures/reveal-audio/musiclab-ex-single-choir-v15.json',import.meta.url),'utf8'));
 const reference=JSON.parse(await readFile(new URL('./fixtures/reveal-audio/musiclab-grade7-step-3-brass-v14.json',import.meta.url),'utf8'));
 for(let i=0;i<reference.tracks.length;i++)for(let j=0;j<reference.tracks[i].notes.length;j++){
  const before=reference.tracks[i].notes[j],after=score.tracks[i].notes[j];
  assert.equal(after[0],before[0]);assert.equal(after[2],before[2]);assert.equal(after[1],before[1]+(reference.tracks[i].drums?0:3));
 }
 assert.ok(score.tracks.some(t=>t.program===52));assert.ok(score.tracks.some(t=>t.program===53));
 const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');assert.ok(app.includes("i===3?'./assets/audio/reveals/musiclab-ex-single-choir-v15.wav'"));
});
