"""EX one-shot: grade-7 arrangement +3 semitones, with sampled choir harmonies."""
from pathlib import Path
import sys,json
import numpy as np
import soundfile as sf
sys.path.insert(0,'C:/MusicLab/scripts')
from musiclab import make_midi,native_render,metrics
from pedalboard import Pedalboard,HighpassFilter,Reverb,Compressor
root=Path(__file__).parent
sources=root/'audio-sources/musiclab-stepped-reveals'
out=root/'dist/assets/audio/reveals'
reference,sr=sf.read(out/'musiclab-grade7-step-3-brass-v14.wav',always_2d=True,dtype='float32')
score_path=sources/'musiclab-grade7-step-3-brass-v14.json'
if not score_path.exists():score_path=root/'tests/fixtures/reveal-audio/musiclab-grade7-step-3-brass-v14.json'
sources.mkdir(parents=True,exist_ok=True)
score=json.loads(score_path.read_text(encoding='utf-8'))
score['title']='EX single reveal: raised grade7 with choir'
for track in score['tracks']:
 if not track.get('drums'):
  track['notes']=[[at,pitch+3,duration,velocity] for at,pitch,duration,velocity in track['notes']]
# One shared attack and sustained major harmony, without a second musical phrase.
for name,program,pan,volume,pitches,at,duration in [
 ('Choir Aahs upper harmony',52,38,83,[69,73,76,81],.035,1.05),
 ('Voice Oohs warm inner harmony',53,88,65,[57,64,69,73],.065,.95),
 ('Soft strings support',48,65,43,[69,73,76],.04,.82),
]:
 score['tracks'].append(dict(name=name,program=program,pan=pan,volume=volume,controls=[[0,91,32],[0,93,12]],notes=[[at,pitch,duration,75] for pitch in pitches]))
name='musiclab-ex-single-choir-v15'
(sources/f'{name}.json').write_text(json.dumps(score,indent=2),encoding='utf-8')
make_midi(score,sources/f'{name}.mid')
y,render_sr=native_render(sources/f'{name}.mid',sources/f'{name}-raw.wav')
assert render_sr==sr
frames=len(reference)
y=np.pad(y,((0,max(0,frames-len(y))),(0,0)))[:frames]
y=Pedalboard([HighpassFilter(cutoff_frequency_hz=40),Reverb(room_size=.68,damping=.55,wet_level=.16,dry_level=.94,width=1),Compressor(threshold_db=-14,ratio=1.7,attack_ms=32,release_ms=130)])(y.T,sr).T.copy()
y*=float(np.sqrt(np.mean(reference.astype('float64')**2)))/max(float(np.sqrt(np.mean(y.astype('float64')**2))),1e-8)
y*=min(1.,.92/max(float(np.max(np.abs(y))),1e-8))
fade=round(.38*sr)
y[-fade:]*=np.linspace(1,0,fade)[:,None]
y[:round(.003*sr)]*=np.linspace(0,1,round(.003*sr))[:,None]
assert len(y)==frames and np.isfinite(y).all() and np.max(np.abs(y))<=.921
sf.write(out/f'{name}.wav',y,sr,subtype='PCM_24')
report=dict(reference='musiclab-grade7-step-3-brass-v14.wav',transpose_semitones=3,programs=[t['program'] for t in score['tracks']],reference_frames=frames,output_frames=len(y),**metrics(y,sr))
(sources/f'{name}-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
