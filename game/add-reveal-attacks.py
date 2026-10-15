"""Add brief impact layers to grades 1 and 3, preserving original reveal tails."""
from pathlib import Path
import shutil
import numpy as np
import soundfile as sf

root = Path(__file__).parent
assets = root / 'dist/assets/audio/reveals'
sources = root / 'audio-sources/reveal-attacks'
sources.mkdir(parents=True, exist_ok=True)
for grade in (1, 3):
    target = assets / f'musiclab-arcade-grade-{grade}.wav'
    original = sources / f'grade-{grade}-original.wav'
    if not original.exists():
        shutil.copy2(target, original)
    y, sr = sf.read(original, always_2d=True)
    t = np.arange(min(len(y), int(sr * .24))) / sr
    rng = np.random.default_rng(100 + grade)
    noise = rng.normal(0, 1, len(t))
    # A pitched body provides weight; a very short noise transient adds contact.
    base = 145 if grade == 1 else 205
    phase = 2 * np.pi * (base * t + 65 * .018 * (1 - np.exp(-t / .018)))
    body = np.sin(phase) * np.exp(-t / .038)
    contact = noise * np.exp(-t / .006) * .22
    bright = np.sin(2 * np.pi * 1480 * t) * np.exp(-t / .018) * (.08 if grade == 1 else .19)
    attack = (body + contact + bright) * (.22 if grade == 1 else .27)
    attack *= np.minimum(t / .001, 1)
    attack *= np.minimum((t[-1] - t) / .012, 1)
    y[:len(t)] += attack[:, None]
    peak = np.max(np.abs(y))
    if peak > .96:
        raise ValueError(f'Grade {grade} needs more headroom: {peak}')
    assert np.isfinite(y).all()
    sf.write(target, y, sr, subtype='PCM_16')
    print(f'Grade {grade}: {len(y)/sr:.3f}s, peak {peak:.3f}; tail preserved after .24s')
