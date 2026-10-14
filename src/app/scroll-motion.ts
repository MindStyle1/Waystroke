import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

/** Each study has one owner and keeps its readable composition throughout. */
function initServiceStudies(host: HTMLElement): () => void {
  const active = new Set<gsap.core.Timeline>();
  host.querySelectorAll<HTMLElement>('.service__visual').forEach((visual) => {
    visual.dataset['motionState'] = 'ready';
    ScrollTrigger.create({
      trigger: visual,
      start: 'center 72%',
      once: true,
      onEnter: () => {
        visual.dataset['motionState'] = 'playing';
        const timeline = gsap.timeline({
          defaults: { duration: 1, ease: 'power2.inOut' },
          onComplete: () => {
            visual.dataset['motionState'] = 'done';
            active.delete(timeline);
          },
        });
        active.add(timeline);
        const select = (selector: string) => visual.querySelector(selector)!;
        const elements = visual.querySelectorAll<HTMLElement>(
          '.study-page, .study-page__nav, .study-page__title, .study-page__bottom, .study-screen, .study-screen__tiles i, .study-after, .study-after__title, .study-after__blocks i, .study-after__button',
        );
        gsap.set(elements, { force3D: true });
        if (visual.classList.contains('service__visual--site')) {
          const page = select('.study-page');
          const nav = select('.study-page__nav');
          const title = select('.study-page__title');
          const bottom = select('.study-page__bottom');
          const xGuide = select('.study-guide--x');
          const yGuide = select('.study-guide--y');
          gsap.set(page, { y: 20, scale: 0.94, rotation: -2, opacity: 0.85 });
          gsap.set(nav, { y: -8, opacity: 0.65 });
          gsap.set(title, { y: 12 });
          gsap.set(bottom, { y: 10, opacity: 0.65 });
          gsap.set(xGuide, { scaleX: 0.15, transformOrigin: 'left' });
          gsap.set(yGuide, { scaleY: 0.15, transformOrigin: 'top' });
          timeline
            .to(
              [xGuide, yGuide],
              { scaleX: 1, scaleY: 1, duration: 0.8, ease: 'power2.out', clearProps: 'transform' },
              0,
            )
            .to(
              page,
              {
                y: 0,
                scale: 1,
                rotation: 0,
                opacity: 1,
                duration: 1.1,
                ease: 'power3.out',
                clearProps: 'opacity,transform',
              },
              0,
            )
            .to(
              nav,
              {
                y: 0,
                opacity: 1,
                duration: 0.65,
                ease: 'power2.out',
                clearProps: 'opacity,transform',
              },
              0.15,
            )
            .to(
              title,
              {
                y: 0,
                duration: 0.75,
                ease: 'power3.out',
                clearProps: 'transform',
              },
              0,
            )
            .to(
              bottom,
              {
                y: 0,
                opacity: 1,
                duration: 0.8,
                ease: 'power2.out',
                clearProps: 'opacity,transform',
              },
              0.3,
            );
        } else if (visual.classList.contains('service__visual--responsive')) {
          const desktop = select('.study-screen--desktop');
          const phone = select('.study-screen--phone');
          const phoneTiles = visual.querySelectorAll('.study-screen--phone .study-screen__tiles i');
          // Compose two fixed-layout views; no animated width or text reflow.
          gsap.set(desktop, { x: 42, scale: 1.06, transformOrigin: 'left center' });
          gsap.set(phone, { y: 95, x: -20, rotation: -7, opacity: 0 });
          gsap.set(phoneTiles, { x: 32, opacity: 0 });
          timeline
            .to(
              desktop,
              { x: 0, scale: 1, duration: 1.4, ease: 'power2.out', clearProps: 'transform' },
              0,
            )
            .to(
              phone,
              {
                y: 0,
                x: 0,
                rotation: 0,
                opacity: 1,
                duration: 1.35,
                ease: 'power3.out',
                clearProps: 'opacity,transform',
              },
              0.5,
            )
            .to(
              phoneTiles,
              {
                x: 0,
                opacity: 1,
                duration: 0.7,
                stagger: 0.16,
                ease: 'power2.out',
                clearProps: 'opacity,transform',
              },
              1.25,
            );
        } else {
          const after = select('.study-after');
          const title = select('.study-after__title');
          const blocks = visual.querySelectorAll('.study-after__blocks i');
          const button = select('.study-after__button');
          gsap.set(after, { x: 28, rotation: 3, opacity: 0.5 });
          gsap.set(title, { x: -16, y: 12, opacity: 0.4 });
          gsap.set(blocks, {
            x: (i: number) => (i % 2 ? 24 : -14),
            y: (i: number) => (i % 2 ? -16 : 14),
            rotation: (i: number) => (i % 2 ? -8 : 6),
          });
          gsap.set(button, { y: 22, scale: 0.85, opacity: 0.3 });
          timeline
            .to(
              after,
              {
                x: 0,
                rotation: 0,
                opacity: 1,
                duration: 1,
                ease: 'power3.out',
                clearProps: 'opacity,transform',
              },
              0,
            )
            .to(
              title,
              {
                x: 0,
                y: 0,
                opacity: 1,
                duration: 0.85,
                ease: 'power2.out',
                clearProps: 'opacity,transform',
              },
              0.35,
            )
            .to(
              blocks,
              {
                x: 0,
                y: 0,
                rotation: 0,
                duration: 0.9,
                stagger: 0.14,
                ease: 'power3.out',
                clearProps: 'transform',
              },
              0.7,
            )
            .to(
              button,
              {
                y: 0,
                scale: 1,
                opacity: 1,
                duration: 0.85,
                ease: 'power3.out',
                clearProps: 'opacity,transform',
              },
              1.65,
            );
        }
      },
    });
  });
  return () => {
    active.forEach((timeline) => {
      timeline.progress(1);
      timeline.kill();
    });
    active.clear();
  };
}

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
        // App owns anchor navigation, including the fixed header logo.
        anchors: false,
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
        if (
          block.closest('.hero') ||
          block.matches('.contact__panel') ||
          block.getBoundingClientRect().top < window.innerHeight * 0.72
        )
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
      const contact = host.querySelector('.contact__panel');
      if (contact) {
        gsap
          .timeline({ scrollTrigger: { trigger: contact, start: 'top 82%', once: true } })
          .fromTo(
            contact,
            { y: 24 },
            { y: 0, duration: 1.1, ease: 'power3.out', clearProps: 'transform' },
            0,
          )
          .fromTo(
            contact.querySelectorAll('.contact__title-line'),
            { y: 20, opacity: 0.55 },
            {
              y: 0,
              opacity: 1,
              stagger: 0.16,
              duration: 1,
              ease: 'power3.out',
              clearProps: 'opacity,transform',
            },
            0.15,
          )
          .fromTo(
            contact.querySelector('.contact__rule'),
            { scaleX: 0.08, transformOrigin: 'left' },
            { scaleX: 1, duration: 1.2, ease: 'power2.out', clearProps: 'transform' },
            0.35,
          )
          .fromTo(
            contact.querySelector('.contact__row'),
            { y: 12, opacity: 0.6 },
            {
              y: 0,
              opacity: 1,
              duration: 0.9,
              ease: 'power2.out',
              clearProps: 'opacity,transform',
            },
            0.5,
          );
      }
      const disposeStudies = initServiceStudies(host);
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
        disposeStudies();
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
      // Native focus/scrollIntoView can move the browser before its scroll event
      // reaches Lenis. Sync actual scroll before resolving an element target.
      lenis.resize();
      // Lenis already reads the document's scroll-padding-top.
      lenis.scrollTo(target, { offset: 0, duration: 1.1 });
      return true;
    },
    dispose: () => media.revert(),
  };
}
