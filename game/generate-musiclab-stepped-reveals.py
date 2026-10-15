"""Original acoustic rare-reveal scores, rendered with MusicLab/FluidSynth."""
from pathlib import Path
import sys, json
import numpy as np
import soundfile as sf
sys.path.insert(0, 'C:/MusicLab/scripts')
from musiclab import make_midi, native_render, metrics, ENGINE, SOUNDFONT
from pedalboard import Pedalboard, Reverb, Compressor, HighpassFilter

root = Path(__file__).parent
sources = root / 'audio-sources/musiclab-stepped-reveals'
out = root / 'dist/assets/audio/reveals'
sources.mkdir(parents=True, exist_ok=True)
report = []
for kind, count in [('grade7', 3), ('ex', 4)]:
    for stage in range(1, count + 1):
        # At 60 BPM, one beat equals one second. All notes release by 1s.
        chords = [[pitch + 3*i for pitch in [48, 55, 60, 64]] for i in range(3)]
        if kind == 'ex':
            # Preserve chord quality and voicing: exactly three semitones per step.
            chords = [[pitch + 3*i for pitch in [43, 50, 55, 59]] for i in range(4)]
        chord = chords[stage-1]
        tracks = []
        def track(name, program, volume, pan, notes):
            tracks.append(dict(name=name, program=program, volume=volume, pan=pan,
                               controls=[[0, 91, 20], [0, 93, 0]], notes=notes))
        # Every stage starts with a simultaneous acoustic attack, never a swell.
        track('Grand piano impact octaves', 0, 100, 58,
              [[0, pitch, .30, min(120, 99+stage*5)] for pitch in chord + [chord[0]-12, chord[2]+12]])
        track('Timpani downbeat', 47, 102, 64,
              [[0, max(36,chord[0]-12), .48, min(123,102+stage*5)]])
        track('Brass section fanfare', 62, 76+stage*3, 64,
              [[0, pitch, .44, 94+stage*5] for pitch in chord + [chord[0]-12, chord[2]+12]])
        tracks.append(dict(name='Acoustic bass drum and cymbal', program=0,
                           drums=True, volume=85, pan=64,
                           notes=[[0,36,.16,100+stage*5]] +
                                 ([[0,49,.22,58+stage*7]] if stage>=2 else [])))
        track('Tubular bell strike', 14, 57+stage*5, 43,
              [[0, chord[2]+12, .95, 86+stage*6]])
        if stage>=3:
            track('Trumpet accent',56,60+stage*3,88,
                  [[0,pitch+12,.19,91+stage*4] for pitch in chord[1:]])
        if kind=='ex':
            # Harmony enters after the transient, leaving room for the impact.
            track('Choir Aahs harmony',52,43+stage*5,68,
                  [[.18,pitch+12,.82,51+stage*5] for pitch in chord[1:]])
            track('Piano upper harmony',0,65,83,
                  [[.24,pitch+12,.40,69+stage*5] for pitch in chord[2:]])
        if kind == 'ex':
            # Wider orchestral voicing and low brass give every EX stage more scale.
            for t in tracks:
                if t['name'] == 'Brass section fanfare':
                    t['volume'] = min(110, t['volume']+10)
                    t['notes'] = [[at,pitch,.62,min(125,velocity+5)] for at,pitch,_,velocity in t['notes']]
                elif t['name'] == 'Choir Aahs harmony':
                    t['volume'] = 66+stage*5
                    t['notes'] += [[.18,chord[2]+24,.82,61+stage*4]]
                elif t['name'] == 'Timpani downbeat':
                    t['volume'] = 112
            track('Low tuba foundation',58,75+stage*4,58,
                  [[0,chord[0]-12,.62,91+stage*5],[0,chord[1]-12,.62,83+stage*5]])
            track('Wide horn harmony',60,67+stage*4,30,
                  [[0,pitch,.68,82+stage*5] for pitch in chord[1:]])
            track('High trumpet crown',56,59+stage*5,98,
                  [[0,pitch+12,.50,86+stage*5] for pitch in chord[1:]])
            if stage>=2:
                track('Upper tubular bell',14,52+stage*4,90,
                      [[0,chord[2]+24,.95,78+stage*5]])
        if kind == 'ex':
            if stage == 1:
                # Keep orchestral contrast without changing the uniform pitch progression.
                tracks = [t for t in tracks if t['name'] != 'High trumpet crown']
                for t in tracks:
                    if t['name'] == 'Wide horn harmony':
                        t['notes'] = [[at,pitch,.42,velocity] for at,pitch,_,velocity in t['notes']]
                    if t['name'] == 'Choir Aahs harmony':
                        t['notes'] = [[at,pitch,duration,velocity] for at,pitch,duration,velocity in t['notes']]
                        t['volume'] = 61
            elif stage == 2:
                # Immediate high brass octave and a bright major choral voicing.
                for t in tracks:
                    if t['name'] == 'High trumpet crown':
                        t['volume'] = 88
                        t['notes'] = [[0,pitch+12,.50,112] for pitch in chord[1:]]
                    elif t['name'] == 'Choir Aahs harmony':
                        t['volume'] = 84
                    elif t['name'] == 'Brass section fanfare':
                        t['notes'] = [[at,pitch,.72,velocity] for at,pitch,_,velocity in t['notes']]
        if kind == 'ex':
            tracks = [t for t in tracks if t['program'] != 14]
        main_seconds = 2 if kind == 'ex' and stage == 4 else 1
        if main_seconds == 2:
            # One onset only: sustain the final chord, without repeated strikes.
            for t in tracks:
                if t['name'] in ('Brass section fanfare', 'Choir Aahs harmony', 'Piano upper harmony', 'Tubular bell strike', 'Low tuba foundation', 'Wide horn harmony', 'Upper tubular bell'):
                    t['notes'] = [[at,pitch,main_seconds-at,velocity] for at,pitch,_,velocity in t['notes']]
        score = dict(title=f'MusicLab acoustic impact {kind} stage {stage}', bpm=60, tracks=tracks)
        name = f'musiclab-{kind}-step-{stage}-brass-v14'
        (sources / f'{name}.json').write_text(json.dumps(score, indent=2), encoding='utf-8')
        make_midi(score, sources / f'{name}.mid')
        y, sr = native_render(sources / f'{name}.mid', sources / f'{name}-raw.wav')
        duration = main_seconds + 1.5 + .2 * stage
        frames = round(duration*sr)
        y = np.pad(y, ((0,max(0,frames-len(y))),(0,0)))[:frames]
        # A modest hall, no pitch shifting, oscillators, distortion or chorus layers.
        board = Pedalboard([HighpassFilter(cutoff_frequency_hz=35),
                            Reverb(room_size=.74 if kind=='ex' else .62, damping=.5, wet_level=.18 if kind=='ex' else .12,
                                   dry_level=.96, width=1 if kind=='ex' else .9),
                            Compressor(threshold_db=-14, ratio=1.7, attack_ms=32, release_ms=130)])
        y = board(y.T, sr).T.copy()
        target = (.075 + .017*stage) if kind=='ex' else (.055 + .014*stage)
        y *= target/max(float(np.sqrt(np.mean(y.astype('float64')**2))), 1e-6)
        if np.max(np.abs(y)) > .92:
            y *= .92/np.max(np.abs(y))
        fade=round(.32*sr)
        y[-fade:] *= np.linspace(1,0,fade)[:,None]
        assert np.isfinite(y).all() and np.max(np.abs(y)) <= .921
        assert np.sqrt(np.mean(y[sr:2*sr]**2)) > .0001, 'Missing extended tail'
        sf.write(out/f'{name}.wav', y, sr, subtype='PCM_24')
        report.append(dict(file=f'{name}.wav', programs=[t['program'] for t in tracks],
                           main_seconds=main_seconds, attack_rms=float(np.sqrt(np.mean(y[:round(.12*sr)]**2))), **metrics(y,sr)))
        print(name, metrics(y,sr), flush=True)
(sources/'verification.json').write_text(json.dumps(dict(engine=str(ENGINE),soundfont=str(SOUNDFONT),renders=report),indent=2))
