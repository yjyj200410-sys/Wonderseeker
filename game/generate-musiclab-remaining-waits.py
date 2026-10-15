"""Five original container loops rendered with the installed MusicLab SoundFont engine."""
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, 'C:/MusicLab/scripts')
from musiclab import make_midi, native_render, metrics, ENGINE, SOUNDFONT

ROOT = Path(__file__).parent
BEATS = 16


def track(name, program, volume, notes, pan=64):
    return dict(name=name, program=program, volume=volume, pan=pan, notes=notes)


def notes_for(chords, offsets, order, duration, velocity, octave=0):
    return [[bar * 4 + offset, chord[order[n % len(order)]] + octave,
             duration, velocity - (n % 2) * 5]
            for bar, chord in enumerate(chords) for n, offset in enumerate(offsets)]


def foundation(chords, duration=4.15, velocity=34, octave=0):
    return [[bar * 4, pitch + octave, duration, velocity]
            for bar, chord in enumerate(chords) for pitch in chord]


scores = []

# Green sewer hatch: sparse water-like resonances over a quiet underground hum.
c = [[40, 47, 52, 55], [36, 43, 48, 52], [33, 40, 45, 48], [40, 47, 52, 55]]
scores.append(dict(tier=0, name='sewer', title='幽井微光', bpm=64,
    tracks=[track('Underground warm pad', 89, 34, foundation(c, velocity=30)),
            track('Water-like vibraphone drops', 11, 42,
                  notes_for(c, [.5, 2.25, 3.5], [2, 3, 1], 1.4, 41, 12), 80),
            track('Quiet low pizzicato', 45, 36,
                  notes_for(c, [0, 2.5], [0, 1], .65, 36), 48)]))

# Arched wooden travel chest: light, friendly nylon strings and wooden marimba.
c = [[48, 55, 60, 64], [45, 52, 57, 60], [53, 60, 64, 67], [48, 55, 60, 64]]
scores.append(dict(tier=1, name='wood', title='街角小旅', bpm=80,
    tracks=[track('Warm nylon guitar', 24, 55,
                  notes_for(c, [0, 1, 2, 3], [0, 2, 1, 3], 1.4, 48, 12), 48),
            track('Wooden marimba melody', 12, 49,
                  [[0, 72, 1, 48], [1.5, 76, .7, 42], [3, 74, .8, 42],
                   [4, 72, 1.2, 47], [6, 69, 1, 43], [7.5, 72, .7, 42],
                   [8, 77, 1.4, 46], [10, 76, 1, 42], [11.5, 74, .7, 42],
                   [12, 72, 1.2, 46], [14, 67, .8, 40], [15, 72, 1.15, 43]], 78),
            track('Small travel steps', 45, 34,
                  notes_for(c, [0, 2], [0, 1], .5, 34))]))

# Riveted iron safe: measured metal resonance and a restrained low brass motif.
c = [[50, 57, 62, 65], [46, 53, 58, 62], [45, 52, 57, 60], [50, 57, 62, 65]]
scores.append(dict(tier=2, name='iron', title='旧城锁语', bpm=72,
    tracks=[track('Measured metal vibraphone', 11, 51,
                  notes_for(c, [0, 1.5, 2.5, 3.5], [2, 1, 3, 2], 1.25, 45, 12), 78),
            track('Muted bronze trumpet', 59, 35,
                  [[0, 62, 2.3, 38], [3, 65, .7, 33], [4, 62, 2.3, 37],
                   [7, 58, .7, 33], [8, 60, 2.3, 37], [11, 64, .7, 33],
                   [12, 65, 1.5, 37], [14, 64, .7, 32], [15, 62, 1.15, 36]], 54),
            track('Soft mechanical pulse', 45, 38,
                  notes_for(c, [0, 1, 2, 3], [0, 1], .55, 37))]))

# Cyan rune coffer: weightless pad, a gently breathing flute, crystalline notes.
c = [[52, 59, 64, 67], [48, 55, 60, 64], [50, 57, 62, 66], [52, 59, 64, 67]]
scores.append(dict(tier=3, name='rune', title='蓝符低吟', bpm=74,
    tracks=[track('Floating rune pad', 89, 35, foundation(c, velocity=32)),
            track('Cyan celesta figures', 8, 45,
                  notes_for(c, [.5, 1.25, 2.5, 3.25], [2, 3, 1, 2], 1.3, 42, 12), 83),
            track('Air through the rune seam', 73, 40,
                  [[0, 76, 2.4, 43], [3, 79, .8, 37], [4, 76, 2.4, 42],
                   [7, 72, .8, 36], [8, 74, 2.4, 42], [11, 78, .8, 37],
                   [12, 79, 1.5, 42], [14, 78, .8, 36], [15, 76, 1.15, 39]], 52)]))

# Amethyst reliquary: wider harp motion, glassy highlights and velvet/choir bed.
c = [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [45, 52, 57, 60]]
scores.append(dict(tier=4, name='amethyst', title='紫晶梦匣', bpm=68,
    tracks=[track('Velvet amethyst strings', 48, 44, foundation(c, velocity=36)),
            track('Distant crystal choir', 52, 26,
                  [[bar * 4, chord[2] + 12, 4.2, 30] for bar, chord in enumerate(c)], 70),
            track('Silver harp lattice', 46, 49,
                  notes_for(c, [0, .5, 1.5, 2, 2.5, 3.5], [1, 2, 3, 2, 1, 2], 1.5, 44, 12), 46),
            track('Amethyst glass highlights', 8, 42,
                  notes_for(c, [.75, 2.75], [3, 2], 1.8, 39, 24), 86)]))

reports = []
for score in scores:
    source = ROOT / f"audio-sources/musiclab-{score['name']}-wait"
    source.mkdir(parents=True, exist_ok=True)
    score['loop_beats'] = BEATS
    (source / 'score.json').write_text(json.dumps(score, ensure_ascii=False, indent=2), encoding='utf-8')
    make_midi(score, source / 'score.mid')
    repeated = dict(bpm=score['bpm'], tracks=[dict(t, notes=[
        [at + n * BEATS, pitch, duration, velocity]
        for n in range(3) for at, pitch, duration, velocity in t['notes']
    ]) for t in score['tracks']])
    make_midi(repeated, source / 'three-loops.mid')
    rendered, sr = native_render(source / 'three-loops.mid', source / 'render-raw.wav')
    # Match the MIDI's actual integer-microsecond tempo, and take the steady middle loop.
    length = round(BEATS * round(60000000 / score['bpm']) / 1000000 * sr)
    y = rendered[length:2 * length].copy()
    rms = np.sqrt(np.mean(y.astype('float64') ** 2))
    y *= .115 / rms
    # A gentle soft limiter keeps percussive wooden/metal hits from dictating
    # a much quieter average level than the sustained magical containers.
    for _ in range(6):
        y = .65 * np.tanh(y / .65)
        y *= .115 / np.sqrt(np.mean(y.astype('float64') ** 2))
    # Retain all sustained/reverb tails across the musical wrap; never fade to silence.
    seam_samples = round(.002 * sr)
    y[-seam_samples:] += np.linspace(0, 1, seam_samples)[:, None] * (y[0] - y[-1])
    assert len(y) == length and np.isfinite(y).all() and np.max(np.abs(y)) < .99
    filename = f"musiclab-{score['name']}-wait.wav"
    output = ROOT / 'dist/assets/audio/waiting' / filename
    sf.write(output, y, sr, subtype='PCM_16')
    sf.write(ROOT / 'artifacts' / filename.replace('.wav', '-two-loops.wav'),
             np.concatenate([y, y]), sr, subtype='PCM_16')
    encoded, _ = sf.read(output, always_2d=True)
    assert np.max(np.abs(encoded[0] - encoded[-1])) <= 1 / 32768
    report = dict(title=score['title'], tier=score['tier'], file=filename,
                  engine=str(ENGINE), soundfont=str(SOUNDFONT), loop_beats=BEATS,
                  seam_delta=float(np.max(np.abs(encoded[0] - encoded[-1]))), **metrics(encoded, sr))
    (source / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    reports.append(report)
    print(json.dumps(report, ensure_ascii=False), flush=True)

(ROOT / 'audio-sources/musiclab-remaining-waits-verification.json').write_text(
    json.dumps(reports, ensure_ascii=False, indent=2), encoding='utf-8')
