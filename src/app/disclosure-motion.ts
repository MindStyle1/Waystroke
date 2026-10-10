import { EventPhase } from '@angular/core/primitives/event-dispatch';

/** Native details remain functional before hydration and with reduced motion. */
export function initDisclosureMotion(host: HTMLElement): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const disposers: Array<() => void> = [];
  host.querySelectorAll<HTMLDetailsElement>('.faq__item').forEach((panel) => {
    const summary = panel.querySelector<HTMLElement>('summary')!;
    let animation: Animation | null = null;
    let expanded = panel.open;
    const settle = () => {
      panel.open = expanded;
      panel.style.removeProperty('height');
      panel.style.removeProperty('overflow');
      animation = null;
    };
    const click = (event: MouseEvent) => {
      if (!panel.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      // Replayed early clicks have already been handled by the browser.
      if (event.eventPhase === EventPhase.REPLAY) {
        expanded = panel.open;
        return;
      }
      event.preventDefault();
      const from = panel.getBoundingClientRect().height;
      animation?.cancel();
      expanded = !expanded;
      panel.open = true;
      panel.style.removeProperty('height');
      const to = expanded
        ? panel.getBoundingClientRect().height
        : summary.getBoundingClientRect().height;
      panel.style.height = `${from}px`;
      panel.style.overflow = 'clip';
      summary.setAttribute('aria-expanded', String(expanded));
      animation = panel.animate(
        { height: [`${from}px`, `${to}px`] },
        { duration: expanded ? 440 : 360, easing: 'cubic-bezier(.4,0,.2,1)' },
      );
      animation.onfinish = settle;
    };
    const toggle = () => {
      if (!animation) {
        expanded = panel.open;
        summary.setAttribute('aria-expanded', String(expanded));
      }
    };
    summary.addEventListener('click', click);
    panel.addEventListener('toggle', toggle);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => {
      animation?.cancel();
      settle();
    };
    reduced.addEventListener('change', change);
    disposers.push(() => {
      animation?.cancel();
      settle();
      summary.removeEventListener('click', click);
      panel.removeEventListener('toggle', toggle);
      summary.removeAttribute('aria-expanded');
      reduced.removeEventListener('change', change);
    });
  });
  return () => disposers.forEach((dispose) => dispose());
}
