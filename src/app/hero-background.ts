import { animate } from 'animejs';

/** Ordinary DOM layers avoid transparent WebGL canvas compositing in Safari. */
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

  const animations = [
    animate(glow, {
      x: ['-3%', '5%'], y: ['-2%', '4%'], scale: [1, 1.08],
      duration: 16000, ease: 'inOutSine', alternate: true, loop: true, autoplay: false,
    }),
    animate(light, {
      x: ['-12%', '12%'], opacity: [0.3, 0.6],
      duration: 12000, ease: 'inOutSine', alternate: true, loop: true, autoplay: false,
    }),
  ];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  const sync = () => {
    for (const animation of animations) {
      if (reduced.matches) {
        animation.pause();
        animation.seek(0);
      } else if (visible && !document.hidden) animation.resume();
      else animation.pause();
    }
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  observer.observe(hero);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  sync();

  return () => {
    observer.disconnect();
    document.removeEventListener('visibilitychange', sync);
    reduced.removeEventListener('change', sync);
    animations.forEach((animation) => animation.revert());
    background.remove();
    hero.classList.remove(`hero--${variant}`);
  };
}
