import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

export function initScrollMotion(host: HTMLElement) {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  let lenis: Lenis | null = null;
  media.add(
    '(prefers-reduced-motion: no-preference)',
    () => {
      lenis = new Lenis({
        lerp: 0.11,
        smoothWheel: true,
        syncTouch: false,
        anchors: true,
        // Comparison has no nested vertical scroll: keep the page on one
        // Lenis stream. Bypassing it mid-inertia lets native wheel events
        // compete with the unfinished Lenis target and stalls the page.
        prevent: (node) =>
          node.closest('.cal, .menu, .work-dialog') !== null ||
          document.body.classList.contains('menu-open'),
      });
      const current = lenis;
      const tick = (seconds: number) => current.raf(seconds * 1000);
      const galleryToggle = (event: Event) =>
        (event as CustomEvent<boolean>).detail ? current.stop() : current.start();
      window.addEventListener('waystroke:gallery-toggle', galleryToggle);
      current.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(tick);
      document.documentElement.classList.add('scroll-motion');

      host.querySelectorAll<HTMLElement>('.reveal').forEach((block) => {
        if (block.closest('.hero') || block.getBoundingClientRect().top < window.innerHeight * 0.72)
          return;
        const panel = block.matches('.cmp, .contact__panel, .tandem__person');
        gsap.fromTo(
          block,
          {
            y: panel ? 64 : 32,
            opacity: panel ? 1 : 0.55,
          },
          {
            y: 0,
            opacity: 1,
            duration: 0.85,
            ease: panel ? 'none' : 'power2.out',
            scrollTrigger: {
              trigger: block,
              start: 'top 98%',
              end: 'top 72%',
              scrub: panel ? 0.45 : false,
              toggleActions: 'play none none none',
              invalidateOnRefresh: true,
              once: true,
            },
          },
        );
      });
      host.querySelectorAll<HTMLElement>('.work').forEach((card) => {
        gsap.fromTo(
          card,
          { clipPath: 'inset(12% 0 0 0)', y: 28 },
          {
            clipPath: 'inset(0% 0 0 0)',
            y: 0,
            duration: 1.15,
            ease: 'power3.out',
            // The one-shot reveal must not retain a clipping/compositing layer.
            clearProps: 'clipPath,transform',
            scrollTrigger: { trigger: card, start: 'top 94%', once: true },
          },
        );
      });
      // Refresh after fonts, embeds and disclosure height changes, without per-frame layout reads.
      let frame: number | null = null;
      const observer = new ResizeObserver(() => {
        if (frame !== null) window.clearTimeout(frame);
        frame = window.setTimeout(() => {
          frame = null;
          ScrollTrigger.refresh();
        }, 120);
      });
      observer.observe(host);
      return () => {
        observer.disconnect();
        if (frame !== null) window.clearTimeout(frame);
        gsap.ticker.remove(tick);
        window.removeEventListener('waystroke:gallery-toggle', galleryToggle);
        current.destroy();
        lenis = null;
        document.documentElement.classList.remove('scroll-motion');
      };
    },
    host,
  );

  return {
    scrollTo(target: HTMLElement | number) {
      if (!lenis) return false;
      lenis.scrollTo(target, { offset: typeof target === 'number' ? 0 : -88, duration: 1.1 });
      return true;
    },
    dispose: () => media.revert(),
  };
}
