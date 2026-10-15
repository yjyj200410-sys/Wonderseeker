"""Render button candidates with the installed MusicLab SoundFont engine."""
import sys
import json
from pathlib import Path
import numpy as np
import soundfile as sf

sys.path.insert(0, 'C:/MusicLab/scripts')
from musiclab import make_midi, native_render, metrics

root = Path(__file__).parent
sources = root / 'audio-sources/musiclab-buttons'
out = root / 'dist/assets/audio/buttons'
sources.mkdir(parents=True, exist_ok=True)
presets = [
    ('07-ml-marimba', 12, [[0, 79, .12, 76]], .24),
    ('08-ml-musicbox', 10, [[0, 84, .12, 64]], .38),
    ('09-ml-nylon', 24, [[0, 76, .12, 82]], .23),
    ('10-ml-celeste', 8, [[0, 84, .1, 68], [.1, 91, .1, 52]], .36),
    ('11-ml-woodblock', 115, [[0, 76, .08, 76]], .16),
    ('12-ml-vibes', 11, [[0, 88, .12, 78]], .32),
]
report = []
for name, program, notes, duration in presets:
    score = dict(bpm=120, tracks=[dict(name=name, program=program, notes=notes, volume=95)])
    (sources / (name+'.json')).write_text(json.dumps(score, indent=2), encoding='utf-8')
    midi = sources / (name+'.mid')
    make_midi(score, midi)
    y, sr = native_render(midi, sources / (name+'-raw.wav'))
    audible = np.flatnonzero(np.max(np.abs(y), axis=1) > .0001)
    assert len(audible), name
    start = max(0, int(audible[0])-int(.002*sr))
    y = y[start:start+int(duration*sr)].copy()
    fade = min(len(y), int(.055*sr))
    y[-fade:] *= np.linspace(1, 0, fade)[:, None]
    y *= .335 / np.max(np.abs(y))
    assert np.isfinite(y).all() and np.max(np.abs(y)) <= .336
    sf.write(out / (name+'.wav'), y, sr, subtype='PCM_16')
    report.append(dict(name=name, program=program, **metrics(y, sr)))
(sources / 'verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
