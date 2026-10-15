"""Original pentatonic background loop rendered by the local MusicLab engine."""
import sys
import json
from pathlib import Path
import numpy as np
import soundfile as sf

sys.path.insert(0, 'C:/MusicLab/scripts')
from musiclab import make_midi, native_render, metrics, ENGINE, SOUNDFONT

root = Path(__file__).parent
source = root / 'audio-sources/musiclab-chinese'
source.mkdir(parents=True, exist_ok=True)
bpm, beats = 60, 64
tracks = [
    dict(name='Flute - pentatonic melody', program=73, volume=66, pan=76, notes=[]),
    dict(name='Soft bowed foundation', program=48, volume=36, pan=64, notes=[]),
    dict(name='Koto - quiet spacious accompaniment', program=107, volume=38, pan=48, notes=[]),
]
# D major pentatonic: D, E, F#, A, B. Four spacious phrases, 16 bars.
roots = [50, 47, 55, 50, 50, 47, 57, 50, 55, 50, 47, 57, 55, 47, 57, 50]
for bar, bass in enumerate(roots):
    base = bar * 4
    for tone in [bass, bass + 12]:
        tracks[1]['notes'].append([base, tone, 3.9, 42])
    tones = {50: [62, 66, 69, 74], 47: [59, 62, 66, 71],
             55: [59, 62, 69, 71], 57: [62, 64, 69, 71]}[bass]
    for i, tone in enumerate(tones):
        tracks[2]['notes'].append([base + i, tone, 1.25, 40 + (i % 2) * 4])
phrases = [
    [(0, 74, 1.5), (2, 76, .75), (3, 78, 2), (6, 81, 1), (8, 78, 2), (11, 76, 1), (13, 74, 2)],
    [(0, 71, 2), (3, 74, 1), (5, 76, 1.5), (8, 78, 1), (10, 76, 1), (12, 74, 3)],
    [(0, 78, 1.5), (2, 81, 1), (4, 83, 2), (7, 81, 1.5), (10, 78, 2), (13, 76, 2)],
    [(0, 74, 2), (3, 71, 1.5), (6, 69, 2), (9, 71, 1), (11, 76, 1), (13, 74, 2.5)],
]
for phrase, notes in enumerate(phrases):
    for at, pitch, duration in notes:
        tracks[0]['notes'].append([phrase * 16 + at, pitch, duration, 60])
score = dict(title='云水寻珍', bpm=bpm, loop_beats=beats, tracks=tracks)
(source / 'score.json').write_text(json.dumps(score, ensure_ascii=False, indent=2), encoding='utf-8')
make_midi(score, source / 'score.mid')
repeated = dict(bpm=bpm, tracks=[dict(t, notes=[[at + n * beats, p, d, v]
    for n in range(3) for at, p, d, v in t['notes']]) for t in tracks])
make_midi(repeated, source / 'render-three-loops.mid')
y, sr = native_render(source / 'render-three-loops.mid', source / 'render-raw.wav')
length = round(beats * 60 / bpm * sr)
y = y[length:2 * length].copy()
y *= .64 / np.max(np.abs(y))
# Smooth the seam over 5 ms while preserving the complete musical period.
fade = round(.005 * sr)
y[:fade] *= np.linspace(0, 1, fade)[:, None]
y[-fade:] *= np.linspace(1, 0, fade)[:, None]
assert len(y) == length and np.isfinite(y).all()
out = root / 'dist/assets/audio/musiclab-chinese-cloud-water.wav'
sf.write(out, y, sr, subtype='PCM_16')
report = dict(engine=str(ENGINE), soundfont=str(SOUNDFONT), **metrics(y, sr),
              loop_beats=beats, seam_delta=float(np.max(np.abs(y[0] - y[-1]))))
(source / 'verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
for filename in ['app.js', 'sw.js']:
    path = root / 'dist' / filename
    text = path.read_text(encoding='utf-8').replace('musiclab-epic-low-horn.wav', out.name)
    for description in ['《万界王座》 · 圆号与大提琴，史诗循环', '《云水寻珍》 · 筝类拨弦与笛声，中国风循环', '《云水寻珍》 · 笛声与柔和弦乐，中国风循环']:
        text = text.replace(description, '《云水寻珍》 · 笛声、轻拨弦与柔和弦乐，舒缓中国风循环')
    text = text.replace('reta-entrance-v2.0.47', 'reta-entrance-v2.0.49')
    text = text.replace('reta-entrance-v2.0.48', 'reta-entrance-v2.0.49')
    text = text.replace('reta-entrance-v2.0.49', 'reta-entrance-v2.0.50')
    path.write_text(text, encoding='utf-8')
print(json.dumps(report, indent=2))
