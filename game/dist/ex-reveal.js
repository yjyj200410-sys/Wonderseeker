export function createEXReveal(player, { schedule = setTimeout, unschedule = clearTimeout, impactSeconds = 7 } = {}) {
  player.preload = 'auto';
  player.volume = .8;
  let generation = 0, timer;
  function cancel() {
    generation++; unschedule(timer); player.pause(); player.currentTime = 0;
  }
  function start({ sound, reduced, reveal }) {
    cancel();
    const token = generation;
    let done = false;
    const finish = () => { if (token !== generation || done) return; done = true; unschedule(timer); reveal(); };
    const arm = delay => { unschedule(timer); timer = schedule(finish, delay); };
    if (reduced) {
      if (sound) { player.currentTime = impactSeconds; player.play().catch(() => {}); }
      finish(); return;
    }
    arm((impactSeconds + (sound ? 3 : 0)) * 1000); // Audio failure or a stalled load must not trap the reveal.
    if (sound) player.play().then(() => {
      if (token === generation && !done) arm(Math.max(0, impactSeconds - player.currentTime) * 1000);
    }).catch(() => { if (token === generation && !done) arm(impactSeconds * 1000); });
  }
  return { start, cancel };
}
