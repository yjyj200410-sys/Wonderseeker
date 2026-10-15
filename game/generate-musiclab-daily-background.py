"""A quiet everyday arrangement of the star-crown waiting harmony."""
import sys
import json
from pathlib import Path
import numpy as np
import soundfile as sf

sys.path.insert(0, 'C:/MusicLab/scripts')
from musiclab import make_midi, native_render, metrics

root = Path(__file__).parent
source = root / 'audio-sources/musiclab-daily-background'
source.mkdir(parents=True, exist_ok=True)
bpm, beats = 60, 256
tracks = [
    dict(name='Soft nylon guitar', program=24, volume=54, pan=58, notes=[]),
    dict(name='Quiet warm strings', program=48, volume=28, pan=68, notes=[]),
    dict(name='Sparse mellow harp', program=46, volume=34, pan=74, notes=[]),
    dict(name='Gentle piano theme', program=0, volume=45, pan=62, notes=[]),
    dict(name='Soft acoustic bass', program=32, volume=34, pan=64, notes=[]),
]
# Six sections, with a quiet reprise joining the opening on each loop.
sections = [
    dict(name='平静开场', start_bar=0, end_bar=8),
    dict(name='主题浮现', start_bar=8, end_bar=24),
    dict(name='舒展推进', start_bar=24, end_bar=40),
    dict(name='温和高潮', start_bar=40, end_bar=48),
    dict(name='回落与回忆', start_bar=48, end_bar=56),
    dict(name='安静归来', start_bar=56, end_bar=64),
]
chords = [[50, 57, 62, 66], [47, 54, 59, 62], [55, 59, 62, 66], [57, 61, 64, 69],
          [50, 57, 62, 66], [54, 57, 61, 66], [55, 59, 62, 69], [57, 62, 64, 69]]
melodies = [
    [(0, 74, 1.5), (2, 73, 1), (3, 69, 1)],
    [(0, 71, 2), (2.5, 69, 1.5)],
    [(0, 67, 1), (1.5, 69, 1), (3, 71, 1)],
    [(0, 73, 1.5), (2, 76, 1), (3, 73, 1)],
    [(0, 74, 2.5), (3, 69, 1)],
    [(0, 66, 1.5), (2, 69, 2)],
    [(0, 71, 1.5), (2, 74, 1.5)],
    [(0, 73, 1.5), (2, 69, 2)],
]
for bar in range(64):
    at = bar * 4
    chord = chords[bar % 8]
    if bar >= 60:
        chord = [50, 57, 62, 66]
    intensity = (0.55 if bar < 8 else 0.72 if bar < 24 else
                 0.88 if bar < 40 else 1.0 if bar < 48 else
                 0.76 if bar < 56 else max(0.5, 0.68 - (bar - 56) * .025))
    for pitch in chord[:3]:
        tracks[1]['notes'].append([at, pitch, 4.15, round(38 * intensity)])
    pattern = [chord[0], chord[2], chord[1], chord[3]]
    if 32 <= bar < 48:
        pattern = [chord[0], chord[1], chord[2], chord[3], chord[2], chord[1]]
    for j, pitch in enumerate(pattern):
        tracks[0]['notes'].append([at + j * 4 / len(pattern), pitch + 12, 1.8,
                                  round((44 if j == 0 else 38) * intensity)])
    if bar % 2 == 0 and 8 <= bar < 56:
        tracks[2]['notes'].append([at + 1.5, chord[2] + 12, 2.2, round(34 * intensity)])
    if 24 <= bar < 56:
        tracks[4]['notes'].append([at, chord[0] - 12, 3.8, round(40 * intensity)])
    if 8 <= bar < 60:
        phrase = melodies[bar % 8]
        # Leave breathing room in the initial theme and final reprise.
        if bar < 24 and bar % 4 == 3:
            phrase = phrase[:1]
        if bar >= 56:
            phrase = phrase[:1]
        for offset, pitch, duration in phrase:
            if 40 <= bar < 48:
                pitch += 12
            tracks[3]['notes'].append([at + offset, pitch, duration, round(48 * intensity)])
        if 40 <= bar < 48:
            tracks[3]['notes'].append([at, chord[2] + 12, 2.5, 32])
score = dict(title='星光小憩 · 日常长篇', bpm=bpm, loop_beats=beats, sections=sections, tracks=tracks)
(source / 'score.json').write_text(json.dumps(score, ensure_ascii=False, indent=2), encoding='utf-8')
make_midi(score, source / 'score.mid')
repeated = dict(bpm=bpm, tracks=[dict(t, notes=[[at + n * beats, p, d, v]
    for n in range(3) for at, p, d, v in t['notes']]) for t in tracks])
make_midi(repeated, source / 'three-loops.mid')
y, sr = native_render(source / 'three-loops.mid', source / 'render-raw.wav')
length = round(beats * 60 / bpm * sr)
y = y[length:2 * length].copy()
y *= .48 / np.max(np.abs(y))
fade = round(.002 * sr)
y[-fade:] += np.linspace(0, 1, fade)[:, None] * (y[0] - y[-1])
assert len(y) == length and np.isfinite(y).all()
out = root / 'dist/assets/audio/musiclab-daily-starlight.wav'
sf.write(out, y, sr, subtype='PCM_16')
report = dict(bpm=bpm, loop_beats=beats, sections=sections, **metrics(y, sr),
              seam_delta=float(np.max(np.abs(y[0] - y[-1]))))
(source / 'verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
