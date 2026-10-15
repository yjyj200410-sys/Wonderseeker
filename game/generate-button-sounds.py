"""Generate deterministic, original button sound candidates (PCM WAV)."""
import math
import random
import struct
import wave
from pathlib import Path

OUT = Path(__file__).parent / 'dist/assets/audio/buttons'
OUT.mkdir(parents=True, exist_ok=True)
RATE = 44100
presets = [
    ('01-soft-pop', .13, [(480, 0, .12, 1)], .09),
    ('02-wood-tap', .11, [(310, 0, .09, 1), (830, 0, .045, .35)], .35),
    ('03-crystal', .26, [(1250, 0, .23, 1), (1875, .012, .20, .35)], .015),
    ('04-page-flick', .15, [(600, 0, .07, .25)], .85),
    ('05-magic-drop', .27, [(650, 0, .15, 1), (975, .065, .18, .65)], .025),
    ('06-gold-click', .18, [(880, 0, .15, 1), (1760, 0, .095, .45), (2420, 0, .045, .2)], .12),
]
for name, duration, notes, noise in presets:
    rng = random.Random(41)
    samples = []
    last_noise = 0
    for i in range(round(RATE * duration)):
        t = i / RATE
        value = 0
        for freq, start, length, strength in notes:
            u = t - start
            if 0 <= u < length:
                env = min(1, u / .003) * math.exp(-6 * u / length) * min(1, (length-u)/.008)
                phase = 2 * math.pi * freq * (u - .7*u*u if name.startswith('01') else u)
                value += strength * env * math.sin(phase)
        last_noise = .45 * last_noise + .55 * rng.uniform(-1, 1)
        value += noise * last_noise * min(1, t/.002) * math.exp(-t/.022)
        samples.append(value)
    peak = max(abs(v) for v in samples)
    with wave.open(str(OUT / (name + '.wav')), 'wb') as f:
        f.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        f.writeframes(b''.join(struct.pack('<h', round(v / peak * 11000)) for v in samples))
print('Generated 6 button candidates:', OUT)
