"""Render sampled bell/clock settlement alternatives for listening, without deploying."""
import json
import sys
from pathlib import Path
import numpy as np
import soundfile as sf

sys.path.insert(0, 'C:/MusicLab/scripts')
from musiclab import make_midi, native_render, metrics

root = Path(__file__).parent
folder = root / 'artifacts' / 'settlement-bells-v1'
folder.mkdir(parents=True, exist_ok=True)
variants = [
    ('01-soft-celesta', '柔和钢片琴铃', 8, 76, 83),
    ('02-clear-glockenspiel', '清脆小钟琴', 9, 72, 79),
    ('03-music-box', '八音盒铃音', 10, 74, 81),
    ('04-warm-vibraphone', '温润颤音琴', 11, 67, 74),
    ('05-low-tubular-bell', '低音管钟', 14, 60, 67),
    ('06-tinkle-bell', '轻巧叮铃', 112, 72, 79),
]
renders = []
for slug, label, program, first, second in variants:
    score = {'bpm': 60, 'tracks': [{'name': slug, 'program': program, 'volume': 85,
        'notes': [[0, first, .065, 88], [.07, second, .15, 79]]}]}
    (folder / (slug + '.json')).write_text(json.dumps(score, ensure_ascii=False, indent=2), encoding='utf-8')
    midi = folder / (slug + '.mid')
    make_midi(score, midi)
    y, sr = native_render(midi, folder / (slug + '-raw.wav'))
    y = y[:round(sr * 1.05)].copy()
    fade = round(sr * .12)
    y[-fade:] *= np.linspace(1, 0, fade)[:, None]
    rms = np.sqrt(np.mean(y.astype('float64') ** 2))
    y *= min(.1 / rms, .62 / np.max(np.abs(y)))
    sf.write(folder / (slug + '-single.wav'), y, sr, subtype='PCM_16')
    step = round(sr * .09)
    preview = np.zeros((len(y) + step * 2, 2), dtype=np.float32)
    for i in range(3):
        preview[i * step:i * step + len(y)] += y * .65
    renders.append((slug, label, preview, sr))

gain = min(1., .95 / max(float(np.max(np.abs(y))) for _, _, y, _ in renders))
report = []
for slug, label, y, sr in renders:
    y *= gain
    out = folder / (slug + '.wav')
    sf.write(out, y, sr, subtype='PCM_16')
    report.append({'name': label, 'file': out.name, 'commonGain': gain, **metrics(y, sr)})
(folder / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
