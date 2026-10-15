export function createMusic(player, {
  fadeInMs = 0,
  now = () => performance.now(),
  schedule = callback => requestAnimationFrame(callback),
  unschedule = handle => cancelAnimationFrame(handle),
  playlist = [],
} = {}) {
  player.loop = playlist.length < 2;
  player.volume = .24;
  player.preload = 'none';
  let unlocked = false, pending = false, enabled = true, visible = true;
  let targetVolume = .24, fadeHandle, fadeGeneration = 0;
  let mode = 'rotate', sourceGeneration = 0;
  function cancelFade() { fadeGeneration++; if (fadeHandle !== undefined) unschedule(fadeHandle); fadeHandle = undefined; }
  function setVolume(volume, fade = false) {
    cancelFade();
    if (!fade || fadeInMs <= 0 || volume === 0) { player.volume = volume; return; }
    const token = fadeGeneration, started = now(), from = player.volume;
    const step = () => {
      if (token !== fadeGeneration || !enabled || !visible || player.paused) return;
      const progress = Math.min(1, Math.max(0, (now() - started) / fadeInMs));
      player.volume = from + (volume - from) * progress;
      if (progress < 1) fadeHandle = schedule(step);
      else fadeHandle = undefined;
    };
    fadeHandle = schedule(step);
  }
  function sync() {
    if (!enabled || !visible) { cancelFade(); player.pause(); return; }
    if (!unlocked || pending || !player.paused) return;
    pending = true;
    const generation = sourceGeneration;
    Promise.resolve().then(() => {
      if (enabled && visible) {
        setVolume(fadeInMs > 0 ? 0 : targetVolume);
        return player.play().then(() => {
          if (generation === sourceGeneration && enabled && visible) setVolume(targetVolume, true);
        });
      }
    }).catch(() => { /* Retry on the next gesture if playback was blocked. */ })
      .finally(() => { pending = false; if (!enabled || !visible) player.pause(); else if (generation !== sourceGeneration) sync(); });
  }
  let trackIndex = 0;
  if (playlist.length > 1) {
    player.src = playlist[0];
    player.addEventListener('ended', () => {
      if (mode !== 'rotate') return;
      trackIndex = (trackIndex + 1) % playlist.length;
      sourceGeneration++;
      player.src = playlist[trackIndex];
      player.currentTime = 0;
      sync();
    });
  }
  return {
    unlock() { unlocked = true; },
    update(on, shown = true, volume = .24, selection = 'rotate') {
      enabled = on; visible = shown;
      const nextMode = ['rotate', 'starlight', 'sunshine'].includes(selection) ? selection : 'rotate';
      if (nextMode !== mode && playlist.length > 1) {
        mode = nextMode;
        player.loop = mode !== 'rotate';
        const nextIndex = mode === 'sunshine' ? 1 : mode === 'starlight' ? 0 : trackIndex;
        if (nextIndex !== trackIndex) {
          cancelFade(); player.pause();
          trackIndex = nextIndex; sourceGeneration++;
          player.src = playlist[trackIndex]; player.currentTime = 0;
        }
      }
      const nextVolume = Math.min(1, Math.max(0, volume));
      if (nextVolume !== targetVolume) {
        targetVolume = nextVolume;
        if (!player.paused && enabled && visible) setVolume(targetVolume, targetVolume > player.volume);
      }
      sync();
    },
  };
}
