"""Derive staged rare reveals from the ordinary reveal timbre; no new attacks after 1s."""
from pathlib import Path
import json
import numpy as np
import soundfile as sf

root = Path(__file__).parent
out = root / 'dist/assets/audio/reveals'
source, sr = sf.read(out / 'musiclab-arcade-grade-6.wav', always_2d=True)
source = source / max(np.max(np.abs(source)), .001)
report = []
for kind, count in [('grade7', 3), ('ex', 4)]:
    for stage in range(1, count + 1):
        duration = 2.2 + stage * .2
        n = int(duration * sr)
        dry = np.zeros((n, 2))
        # Ascending sampled voices keep the ordinary reveal's spectral character.
        intervals = [0, 7, 12][:stage]
        if kind == 'ex':
            intervals += [4, 11, 16][:stage]
        for voice, semitone in enumerate(intervals):
            rate = 2 ** ((semitone + (stage - 1) * 2) / 12)
            onset = voice * .065
            length = min(int((1 - onset) * sr), n)
            positions = np.arange(length) * rate
            sampled = np.column_stack([np.interp(positions, np.arange(len(source)), source[:, min(ch, source.shape[1]-1)], right=0) for ch in range(2)])
            t = np.arange(length) / sr
            sampled *= (np.minimum(t / .006, 1) * np.minimum((length / sr - t) / .18, 1))[:, None]
            pan = .18 * (-1 if voice % 2 else 1)
            sampled *= np.array([1-pan, 1+pan])[None, :] / (1 + voice * .32)
            offset = int(onset * sr)
            dry[offset:offset+length] += sampled
        # Low fundamentals and longer stereo reflections increase the sense of scale.
        t = np.arange(sr) / sr
        body = np.sin(2*np.pi*(98 * 2**((stage-1)*2/12))*t) * np.sin(np.pi*t)**2 * np.exp(-t*3)
        dry[:sr] += body[:, None] * (.12 + stage*.055)
        y = dry.copy()
        for echo in range(1, 19):
            delay = int(sr * (.071 * echo + .009 * (echo % 3)))
            y[delay:] += dry[:n-delay, ::-1 if echo % 2 else 1] * (.73 ** echo) * (.48 + stage*.07)
        y[-int(sr*.15):] *= np.linspace(1, 0, int(sr*.15))[:, None]
        target_rms = .065 + .012 * stage
        y *= target_rms / max(np.sqrt(np.mean(y*y)), .001)
        if np.max(np.abs(y)) > .95:
            y *= .95 / np.max(np.abs(y))
        assert np.isfinite(y).all() and np.max(np.abs(y)) < 1
        path = out / f'{kind}-step-{stage}.wav'
        sf.write(path, y, sr, subtype='PCM_16')
        report.append(dict(file=path.name, seconds=duration, peak=float(np.max(np.abs(y))), rms=float(np.sqrt(np.mean(y*y)))))
(root / 'audio-sources/stepped-reveals').mkdir(parents=True, exist_ok=True)
(root / 'audio-sources/stepped-reveals/verification.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
