// Small helpers so every public card/row can share one gentle stagger.
export const revealDelay = (index = 0, step = 80, max = 400) => ({
  '--reveal-delay': `${Math.min(Math.max(0, index) * step, max)}ms`,
});

export const revealItem = (index = 0, direction = 'up') => ({
  'data-reveal': direction,
  style: revealDelay(index),
});
