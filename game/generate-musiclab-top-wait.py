"""MusicLab audition: gold crown / cyan star top-tier container."""
import sys,json
from pathlib import Path
import numpy as np
import soundfile as sf
sys.path.insert(0,'C:/MusicLab/scripts')
from musiclab import make_midi,native_render,metrics,ENGINE,SOUNDFONT
root=Path(__file__).parent
source=root/'audio-sources/musiclab-top-wait';source.mkdir(parents=True,exist_ok=True)
beats,bpm=16,72
tracks=[dict(name='Warm royal horn',program=60,volume=60,pan=58,notes=[]),dict(name='Velvet strings',program=48,volume=46,pan=64,notes=[]),dict(name='Starlight harp',program=46,volume=52,pan=44,notes=[]),dict(name='Cyan crystal bells',program=8,volume=42,pan=84,notes=[])]
chords=[[50,57,62,66],[47,54,59,62],[55,62,66,69],[50,57,62,66]]
for bar,chord in enumerate(chords):
 at=bar*4
 for pitch in chord:tracks[1]['notes'].append([at,pitch,4.05,44])
 for j,pitch in enumerate(chord+[chord[2]+12,chord[1]+12,chord[2],chord[1]]):tracks[2]['notes'].append([at+j*.5,pitch+12,1.2,46 if j%2==0 else 38])
 for j,pitch in enumerate([chord[2]+24,chord[3]+24]):tracks[3]['notes'].append([at+.5+j*2,pitch,1.6,42])
for at,pitch,length in [(0,62,2.5),(3,66,.8),(4,69,2.5),(7,66,.8),(8,71,2.5),(11,69,.8),(12,66,1.7),(14,64,.8),(15,62,1.1)]:tracks[0]['notes'].append([at,pitch,length,52])
score=dict(title='星冠静候',bpm=bpm,loop_beats=beats,tracks=tracks)
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
out=root/'artifacts/musiclab-top-container-wait-preview.wav';sf.write(out,y,sr,subtype='PCM_16')
report=dict(engine=str(ENGINE),soundfont=str(SOUNDFONT),loop_beats=beats,**metrics(y,sr),seam_delta=float(np.max(np.abs(y[0]-y[-1]))))
(source/'verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2));print(out.resolve())
