export function advanceSpecialStep(grade, step, now, readyAt) {
  if (now < readyAt || ![7, 8].includes(grade)) return step;
  return Math.min(step + 1, grade === 8 ? 4 : 3);
}

export function specialPhaseMarkup(step, grade = 7) {
  if (step === 1) return '';
  if (step === 2 || (step === 3 && grade === 8)) {
    const count=step===2?3:6;
    return `<div class="ex-focus multi-energy-rings" aria-hidden="true">${Array.from({length:count},(_,i)=>`<div class="ex-energy-ring" style="--energy-color:#ffffff;animation-delay:${i*(count===3?.08:.03)}s"></div>`).join('')}<div class="energy-point ${step===3?'growing-point':''}"></div></div>`;
  }
  return '';
}

export function specialFinalWaves(grade) {
  const count=2;
  return Array.from({length:count},(_,i)=>`<div class="reveal-final-wave" style="animation-duration:.3s;animation-delay:${i*.08}s" aria-hidden="true"></div>`).join('');
}

// Single-shot rare reveals enter their final visual state directly.
export function singleRevealStep(grade){return grade===8?4:grade===7?3:0;}
