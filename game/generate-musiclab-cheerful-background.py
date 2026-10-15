"""A brighter companion to the daily starlight theme, using the same D-major harmony."""
import json
import sys
from pathlib import Path
import numpy as np
import soundfile as sf
sys.path.insert(0, 'C:/MusicLab/scripts')
from musiclab import make_midi, native_render, metrics

root = Path(__file__).parent
source = root / 'audio-sources/musiclab-daily-sunshine'
source.mkdir(parents=True, exist_ok=True)
original = json.loads((root / 'audio-sources/musiclab-daily-background/score.json').read_text(encoding='utf-8'))
tracks = [dict(name=name, program=program, volume=volume, pan=pan, notes=[]) for name, program, volume, pan in [
    ('Bouncy nylon guitar', 24, 58, 52), ('Warm pizzicato', 45, 40, 76),
    ('Sparkling marimba', 12, 40, 68), ('Sunny piano theme', 0, 35, 60),
    ('Acoustic bass', 32, 45, 64), ('Airy flute melody', 73, 66, 55),
    ('Playful clarinet answers', 71, 59, 75)]]
chords = [[50,57,62,66], [47,54,59,62], [55,59,62,66], [57,61,64,69],
          [50,57,62,66], [54,57,61,66], [55,59,62,69], [57,62,64,69]]
for bar in range(64):
    at = bar * 4
    chord = chords[bar % 8]
    energy = .8 if bar < 8 or bar >= 56 else 1
    for j in range(8):
        pitch = chord[[0,2,1,3,0,2,3,2][j]] + 12
        tracks[0]['notes'].append([at+j*.5, pitch, .38, round((54 if j%2==0 else 43)*energy)])
    for offset in [.5, 1.5, 2.5, 3.5]:
        for pitch in chord[1:]:
            tracks[1]['notes'].append([at+offset, pitch, .3, round(42*energy)])
    for offset,pitch in [(0,chord[0]-12),(2,chord[1]-12)]:
        tracks[4]['notes'].append([at+offset,pitch,.85,round(53*energy)])
    if 8 <= bar < 56:
        for offset,pitch in [(1.5,chord[2]+12),(3.5,chord[3]+12)]:
            tracks[2]['notes'].append([at+offset,pitch,.4,round(40*energy)])
# Preserve the recognisable theme; shorten its articulation and add upbeat answers.
for at,pitch,duration,velocity in original['tracks'][3]['notes']:
    # Flute leads from the first theme; piano only supports phrase beginnings.
    # Keep the climax in the flute's warm register rather than its shrill top octave.
    flute_pitch = pitch - 12 if pitch > 84 else pitch
    tracks[5]['notes'].append([at,flute_pitch,min(duration,1.3),min(76,velocity+20)])
    if at % 4 == 0:
        tracks[3]['notes'].append([at,pitch,min(duration,.65),min(53,velocity+5)])
# A short woodwind introduction makes the new colour audible before the main theme.
for bar in [1,3,5,7]:
    chord = chords[bar % 8]
    for offset,pitch in [(0,chord[2]+12),(1,chord[3]+12),(2.5,chord[1]+12)]:
        tracks[6]['notes'].append([bar*4+offset,pitch,.65,52])
for bar in range(8,56):
    chord=chords[bar%8]
    if bar%2==1:
        for offset,pitch in [(2.5,chord[1]+12),(3,chord[2]+12),(3.5,chord[3]+12)]:
            tracks[6]['notes'].append([bar*4+offset,pitch,.38,59])
score=dict(title='晴光漫游 · 欢快日常',bpm=96,loop_beats=256,tracks=tracks)
(source/'score.json').write_text(json.dumps(score,ensure_ascii=False,indent=2),encoding='utf-8')
make_midi(score,source/'score.mid')
y,sr=native_render(source/'score.mid',source/'render-raw.wav')
# Retain the natural instrument release, with gentle entrance and tail.
y *= .48 / np.max(np.abs(y))
fade=round(.08*sr)
y[:fade] *= np.linspace(0,1,fade)[:,None]
tail=round(1.5*sr)
y[-tail:] *= np.linspace(1,0,tail)[:,None]
sf.write(source/'master.wav',y,sr,subtype='PCM_16')
sf.write(root/'dist/assets/audio/musiclab-daily-sunshine.mp3',y,sr,format='MP3')
report=dict(bpm=96,**metrics(y,sr))
(source/'verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
