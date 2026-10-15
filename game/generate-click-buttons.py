"""Short click candidates from local MusicLab key-click and castanet presets."""
import sys
import json
from pathlib import Path
import numpy as np
import soundfile as sf
sys.path.insert(0, 'C:/MusicLab/scripts')
from musiclab import make_midi, native_render, metrics

root = Path(__file__).parent
source = root / 'audio-sources/musiclab-clicks'
out = root / 'dist/assets/audio/buttons'
source.mkdir(parents=True, exist_ok=True)
report = []
for name, program, bank, pitch, length, double in [
    ('13-ml-light-click', 121, 1, 84, .09, False),
    ('14-ml-solid-click', 115, 8, 67, .12, False),
    ('15-ml-double-click', 115, 8, 79, .08, True),
]:
    score = dict(bpm=120, tracks=[dict(name=name, program=program, bank=bank,
        volume=100, notes=[[0, pitch, .06, 85]])])
    (source / (name+'.json')).write_text(json.dumps(score, indent=2), encoding='utf-8')
    midi = source / (name+'.mid')
    make_midi(score, midi)
    y, sr = native_render(midi, source / (name+'-raw.wav'))
    audible = np.flatnonzero(np.max(np.abs(y), axis=1) > .0001)
    assert len(audible), name
    start = max(0, int(audible[0])-int(.001*sr))
    y = y[start:start+int(length*sr)].copy()
    y *= np.exp(-np.arange(len(y))/sr/.035)[:, None]
    fade = min(len(y), int(.012*sr))
    y[-fade:] *= np.linspace(1, 0, fade)[:, None]
    if double:
        delay = int(.065*sr)
        pair = np.zeros((len(y)+delay, 2), dtype='float32')
        pair[:len(y)] += y
        pair[delay:] += y*.7
        y = pair
    y *= .335/np.max(np.abs(y))
    assert np.isfinite(y).all() and np.max(np.abs(y)) <= .336
    sf.write(out / (name+'.wav'), y, sr, subtype='PCM_16')
    report.append(dict(name=name, program=program, bank=bank, **metrics(y,sr)))
(source/'verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
