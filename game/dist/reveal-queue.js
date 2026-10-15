export function nextSpecialReveal(drops, items, currentIndex, includeCurrent = false) {
  const start = Math.max(0, currentIndex + (includeCurrent ? 0 : 1));
  for (let i = start; i < drops.length; i++) {
    if (items[drops[i].id]?.grade >= 7) return i;
  }
  return drops.length;
}
