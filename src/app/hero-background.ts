/** Decorative layers are kept outside Angular change detection. */
export function initHeroBackground(
  host: HTMLElement,
  variant: 'wave' | 'paper' | 'lime' | 'hybrid' = 'hybrid',
): () => void {
  const hero = host.querySelector<HTMLElement>('.hero');
  if (!hero) return () => {};

  const background = document.createElement('div');
  background.className = `hero-background hero-background--${variant}`;
  background.setAttribute('aria-hidden', 'true');
  const glow = document.createElement('div');
  glow.className = 'hero-background__glow';
  const light = document.createElement('div');
  light.className = 'hero-background__light';
  background.append(glow, light);
  hero.prepend(background);
  hero.classList.add(`hero--${variant}`);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  let visible = false;
  let frame = 0;
  let x = 0;
  let y = 0;
  let targetX = 0;
  let targetY = 0;

  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
  const followPointer = () => {
    frame = 0;
    if (!visible || document.hidden || reduced.matches) return;
    x += (targetX - x) * 0.075;
    y += (targetY - y) * 0.075;
    glow.style.transform = `translate3d(${x * Math.min(220, hero.clientWidth * 0.23)}px, ${y * Math.min(115, hero.clientHeight * 0.18)}px, 0)`;
    if (Math.abs(targetX - x) > 0.002 || Math.abs(targetY - y) > 0.002) {
      frame = requestAnimationFrame(followPointer);
    }
  };
  const start = () => {
    if (!frame && visible && !document.hidden && !reduced.matches) {
      frame = requestAnimationFrame(followPointer);
    }
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!hover.matches || reduced.matches) return;
    const rect = hero.getBoundingClientRect();
    targetX = (event.clientX - rect.left) / rect.width * 2 - 1;
    targetY = (event.clientY - rect.top) / rect.height * 2 - 1;
    start();
  };
  const onPointerLeave = () => {
    targetX = 0;
    targetY = 0;
    start();
  };
  const sync = () => {
    background.classList.toggle('is-visible', visible && !document.hidden);
    if (reduced.matches) {
      stop();
      glow.style.transform = '';
    } else if (visible && !document.hidden) start();
    else stop();
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  observer.observe(hero);
  hero.addEventListener('pointermove', onPointerMove, { passive: true });
  hero.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  sync();

  return () => {
    stop();
    observer.disconnect();
    hero.removeEventListener('pointermove', onPointerMove);
    hero.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('visibilitychange', sync);
    reduced.removeEventListener('change', sync);
    background.remove();
    hero.classList.remove(`hero--${variant}`);
  };
}
