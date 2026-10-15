"""Audition the existing settlement motif on nylon guitar."""
import json
import sys
from pathlib import Path
import numpy as np
import soundfile as sf

sys.path.insert(0, 'C:/MusicLab/scripts')
from musiclab import make_midi, native_render, metrics

root = Path(__file__).parent
source = root / 'audio-sources/musiclab-settlement-nylon'
source.mkdir(parents=True, exist_ok=True)
original = json.loads((root / 'audio-sources/musiclab-settlement-coin/score.json').read_text(encoding='utf-8'))
# Preserve the two-note rising motif without the metallic doubling.
track = dict(original['tracks'][0], name='Nylon guitar settlement', program=24, volume=85)
score = dict(bpm=original['bpm'], tracks=[track])
(source / 'score.json').write_text(json.dumps(score, indent=2), encoding='utf-8')
make_midi(score, source / 'score.mid')
y, sr = native_render(source / 'score.mid', source / 'render-raw.wav')
y = y[:round(.8 * sr)].copy()
y *= .62 / np.max(np.abs(y))
fade = round(.12 * sr)
y[-fade:] *= np.linspace(1, 0, fade)[:, None]
assert np.isfinite(y).all()
out = root / 'artifacts/musiclab-settlement-nylon-preview.wav'
sf.write(out, y, sr, subtype='PCM_16')
report = dict(file=str(out), **metrics(y, sr))
(source / 'verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
