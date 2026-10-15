"""MusicLab audition: red and gold royal container, tier 5."""
import sys,json
from pathlib import Path
import numpy as np
import soundfile as sf
sys.path.insert(0,'C:/MusicLab/scripts')
from musiclab import make_midi,native_render,metrics,ENGINE,SOUNDFONT
root=Path(__file__).parent
source=root/'audio-sources/musiclab-royal-wait';source.mkdir(parents=True,exist_ok=True)
beats,bpm=16,68
tracks=[dict(name='Muted royal horn',program=60,volume=54,pan=58,notes=[]),dict(name='Crimson velvet strings',program=48,volume=54,pan=64,notes=[]),dict(name='Starlight harp',program=46,volume=52,pan=44,notes=[]),dict(name='Quiet royal woodwinds',program=71,volume=35,pan=84,notes=[])]
chords=[[48,55,60,64],[45,52,57,60],[53,60,64,67],[48,55,60,64]]
for bar,chord in enumerate(chords):
 at=bar*4
 for pitch in chord:tracks[1]['notes'].append([at,pitch,4.05,44])
 for j,pitch in enumerate(chord+[chord[2]+12,chord[1]+12,chord[2],chord[1]]):tracks[2]['notes'].append([at+j*.5,pitch+12,1.6,40 if j%2==0 else 34])
 for j,pitch in enumerate([chord[2]+12,chord[3]+12]):tracks[3]['notes'].append([at+.5+j*2,pitch,1.6,42])
for at,pitch,length in [(0,60,2.5),(3,64,.8),(4,67,2.5),(7,64,.8),(8,69,2.5),(11,67,.8),(12,64,1.7),(14,62,.8),(15,60,1.1)]:tracks[0]['notes'].append([at,pitch,length,52])
score=dict(title='绯金秘藏',bpm=bpm,loop_beats=beats,tracks=tracks)
(source/'score.json').write_text(json.dumps(score,ensure_ascii=False,indent=2),encoding='utf-8');make_midi(score,source/'score.mid')
repeated=dict(bpm=bpm,tracks=[dict(t,notes=[[at+n*beats,p,d,v] for n in range(3) for at,p,d,v in t['notes']]) for t in tracks])
make_midi(repeated,source/'three-loops.mid');y,sr=native_render(source/'three-loops.mid',source/'render-raw.wav')
length=round(beats*60/bpm*sr);y=y[length:2*length].copy();y*=.6/np.max(np.abs(y))
# Keep the preceding loop's instrument tails: do not fade the seam to silence.
# Correct only the last 2 ms toward the next sample, preserving the 16-beat period.
fade=round(.002*sr)
delta=y[0]-y[-1]
y[-fade:]+=np.linspace(0,1,fade)[:,None]*delta
assert len(y)==length and np.isfinite(y).all()
out=root/'artifacts/musiclab-royal-container-wait-preview.wav';sf.write(out,y,sr,subtype='PCM_16')
report=dict(engine=str(ENGINE),soundfont=str(SOUNDFONT),loop_beats=beats,**metrics(y,sr),seam_delta=float(np.max(np.abs(y[0]-y[-1]))))
(source/'verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2));print(out.resolve())
