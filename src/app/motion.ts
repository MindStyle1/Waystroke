/**
 * Секционные анимации Waystroke.
 *
 * Покой — законченное состояние: разметка уже показывает собранный результат.
 * Сцена услуги играет ровно один раз — при первом наведении (и один раз при
 * появлении на устройствах без hover) — и дальше не запускается снова.
 * Этапы работы и медленная карусель проектов стартуют сами, при прокрутке.
 * Каждая функция возвращает диспозер — он снимает слушатели и наблюдатели
 * и останавливает анимации вместе с компонентом.
 */
import { createTimeline, stagger, utils, type Timeline } from 'animejs';

export type Dispose = () => void;

interface Scene {
  tl: Timeline;
}

type SceneBuilder = (card: HTMLElement) => Scene;

const noop: Dispose = () => {};

/**
 * Безопасный matchMedia: в тестах и старых окружениях его может не быть —
 * тогда считаем, что особых настроек анимации нет.
 */
const mediaQuery = (query: string): MediaQueryList | null =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query)
    : null;

const prefersReduced = (): boolean =>
  mediaQuery('(prefers-reduced-motion: reduce)')?.matches ?? false;

const el = <T extends Element>(root: ParentNode, selector: string): T =>
  root.querySelector<T>(selector) as T;

const all = <T extends Element>(root: ParentNode, selector: string): T[] =>
  Array.from(root.querySelectorAll<T>(selector));

/* --- Сцена 01: собирается миниатюрный сайт -------------------------------- */

const buildSiteScene: SceneBuilder = (card) => {
  const frame = el<SVGPathElement>(card, '.a-frame');
  const bar = el<SVGPathElement>(card, '.a-bar');
  const dots = all<SVGCircleElement>(card, '.a-dot');
  const title = el<SVGRectElement>(card, '.a-title');
  const sub = el<SVGRectElement>(card, '.a-sub');
  const image = el<SVGRectElement>(card, '.a-image');
  const badge = el<SVGRectElement>(card, '.a-badge');
  const cells = all<SVGRectElement>(card, '.a-cell');

  utils.set(frame, { fillOpacity: 0, strokeDashoffset: 1 });
  utils.set(bar, { strokeDashoffset: 1 });
  utils.set(dots, { scale: 0, opacity: 0 });
  utils.set(title, { translateX: -14, opacity: 0 });
  utils.set(sub, { translateX: -10, opacity: 0 });
  utils.set(image, { scale: 0.86, opacity: 0 });
  utils.set(badge, { opacity: 0 });
  utils.set(cells, { translateY: 10, scale: 0.9, opacity: 0 });

  const tl = createTimeline({ autoplay: false });

  tl.add(frame, { fillOpacity: 1, duration: 320, ease: 'outQuad' }, 0)
    .add(frame, { strokeDashoffset: 0, duration: 520, ease: 'inOutQuad' }, 0)
    .add(bar, { strokeDashoffset: 0, duration: 300, ease: 'inOutQuad' }, 360)
    .add(dots, { scale: 1, opacity: 1, duration: 260, ease: 'outQuad', delay: stagger(70) }, 520)
    .add(title, { translateX: 0, opacity: 1, duration: 320, ease: 'outQuad' }, 700)
    .add(sub, { translateX: 0, opacity: 1, duration: 300, ease: 'outQuad' }, 820)
    .add(image, { scale: 1, opacity: 1, duration: 340, ease: 'outQuad' }, 960)
    .add(badge, { opacity: 1, duration: 240, ease: 'outQuad' }, 1150)
    .add(
      cells,
      { translateY: 0, scale: 1, opacity: 1, duration: 300, ease: 'outQuad', delay: stagger(70) },
      1160,
    );

  return { tl };
};

/* --- Сцена 02: широкий экран → планшет → телефон -------------------------- */

const buildResponsiveScene: SceneBuilder = (card) => {
  const frame = el<SVGPathElement>(card, '.b-frame');
  const navMain = el<SVGRectElement>(card, '.b-nav-main');
  const navRest = all<SVGRectElement>(card, '.b-nav-item');
  const [col1, col2, col3] = all<SVGRectElement>(card, '.b-col');
  const badge = el<SVGRectElement>(card, '.b-badge');

  const tablet = {
    frame: { scaleX: 0.62 },
    navMain: { translateX: 32 },
    navRest: { translateX: 12, opacity: 0 },
    cols: [
      { translateX: 31, translateY: 0, width: 50, height: 26 },
      { translateX: 27, translateY: 0, width: 50, height: 26 },
      { translateX: -89, translateY: 32, width: 50, height: 24 },
    ],
    badge: { translateX: 31, translateY: -30, width: 26 },
  };

  const phone = {
    frame: { scaleX: 0.4 },
    navMain: { translateX: 67 },
    navRest: { translateX: 30, opacity: 0 },
    cols: [
      { translateX: 54, translateY: 0, width: 60, height: 16 },
      { translateX: -6, translateY: 21, width: 60, height: 16 },
      { translateX: -66, translateY: 42, width: 60, height: 16 },
    ],
    badge: { translateX: 54, translateY: -40, width: 20 },
  };

  const tl = createTimeline({ autoplay: false });

  tl.add(frame, { scaleX: tablet.frame.scaleX, duration: 700, ease: 'inOutQuad' }, 0)
    .add(navRest, { translateX: 12, opacity: 0, duration: 300, ease: 'outQuad' }, 60)
    .add(navMain, { translateX: 32, duration: 640, ease: 'inOutQuad' }, 80)
    .add(col1, { ...tablet.cols[0], duration: 700, ease: 'inOutQuad' }, 60)
    .add(col2, { ...tablet.cols[1], duration: 700, ease: 'inOutQuad' }, 60)
    .add(col3, { ...tablet.cols[2], duration: 700, ease: 'inOutQuad' }, 60)
    .add(badge, { ...tablet.badge, duration: 700, ease: 'inOutQuad' }, 60)
    .add(frame, { scaleX: phone.frame.scaleX, duration: 700, ease: 'inOutQuad' }, 940)
    .add(navMain, { translateX: 67, duration: 640, ease: 'inOutQuad' }, 980)
    .add(col1, { ...phone.cols[0], duration: 700, ease: 'inOutQuad' }, 960)
    .add(col2, { ...phone.cols[1], duration: 700, ease: 'inOutQuad' }, 960)
    .add(col3, { ...phone.cols[2], duration: 700, ease: 'inOutQuad' }, 960)
    .add(badge, { ...phone.badge, duration: 700, ease: 'inOutQuad' }, 960);

  return { tl };
};

/* --- Сцена 03: отступы выравниваются, появляется новый элемент ----------- */

const buildRefineScene: SceneBuilder = (card) => {
  const head = el<SVGRectElement>(card, '.c-head');
  const blockA = el<SVGRectElement>(card, '.c-a');
  const blockB = el<SVGRectElement>(card, '.c-b');
  const blockC = el<SVGRectElement>(card, '.c-c');
  const added = el<SVGRectElement>(card, '.c-new');
  const accent = el<SVGPathElement>(card, '.c-accent');

  utils.set(head, { translateX: -10 });
  utils.set(blockA, { translateX: 12, translateY: 5 });
  utils.set(blockB, { translateX: 9, translateY: -4 });
  utils.set(blockC, { translateX: 11, translateY: 5, width: 126 });
  utils.set(added, { opacity: 0, scale: 0.5 });
  utils.set(accent, { strokeDashoffset: 1 });

  const tl = createTimeline({ autoplay: false });

  tl.add(head, { translateX: 0, duration: 320, ease: 'outQuad' }, 0)
    .add(blockA, { translateX: 0, translateY: 0, duration: 420, ease: 'outQuad' }, 120)
    .add(blockB, { translateX: 0, translateY: 0, duration: 420, ease: 'outQuad' }, 250)
    .add(blockC, { translateX: 0, translateY: 0, width: 144, duration: 520, ease: 'inOutQuad' }, 400)
    .add(added, { opacity: 1, scale: 1, duration: 340, ease: 'outQuad' }, 960)
    .add(accent, { strokeDashoffset: 0, duration: 460, ease: 'inOutQuad' }, 1240);

  return { tl };
};

/* --- Управление сценами услуг -------------------------------------------- */

export function initServiceScenes(host: HTMLElement): Dispose {
  const cards = all<HTMLElement>(host, '.service[data-scene]');
  if (cards.length === 0 || prefersReduced()) return noop;

  const builders: Record<string, SceneBuilder> = {
    site: buildSiteScene,
    responsive: buildResponsiveScene,
    refine: buildRefineScene,
  };

  const states = new Map<HTMLElement, Scene>();
  const cleanups: Dispose[] = [];

  const drop = (card: HTMLElement): void => {
    const state = states.get(card);
    if (!state) return;
    state.tl.revert();
    states.delete(card);
  };

  const play = (card: HTMLElement): void => {
    // Сцена играет один раз: доиграв, она остаётся в покое навсегда.
    if (states.has(card)) return;

    const builder = builders[card.dataset['scene'] ?? ''];
    if (!builder) return;

    const scene = builder(card);
    states.set(card, scene);
    scene.tl.play();
  };

  const hoverable =
    mediaQuery('(hover: hover) and (pointer: fine)')?.matches ?? false;

  cards.forEach((card) => {
    if (hoverable) {
      const onEnter = (): void => play(card);
      card.addEventListener('mouseenter', onEnter);
      cleanups.push(() => card.removeEventListener('mouseenter', onEnter));
      return;
    }

    // Без hover: однократный запуск, когда карточка появляется на экране.
    if (!('IntersectionObserver' in window)) {
      play(card);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        play(card);
      },
      { threshold: 0.4 },
    );
    observer.observe(card);
    cleanups.push(() => observer.disconnect());
  });

  return () => {
    cleanups.forEach((dispose) => dispose());
    Array.from(states.keys()).forEach(drop);
  };
}

/* --- Иллюстрации этапов работы ------------------------------------------- */

const setArtHidden = (art: SVGSVGElement, index: number): void => {
  if (index === 0) {
    utils.set(all<SVGGElement>(art, '.art-bubble'), { opacity: 0, translateY: -7 });
    utils.set(all<SVGCircleElement>(art, '.art-dot'), { scale: 0 });
  } else if (index === 1) {
    utils.set(all<SVGRectElement>(art, '.art-bullet'), { opacity: 0, translateX: -7 });
    utils.set(all<SVGPathElement>(art, '.art-line'), { strokeDashoffset: 1 });
  } else if (index === 2) {
    utils.set(el<SVGRectElement>(art, '.art-page'), { strokeDashoffset: 1 });
    utils.set(all<SVGRectElement>(art, '.art-block'), { opacity: 0, scale: 0.85 });
  } else {
    utils.set(el<SVGPathElement>(art, '.art-check'), { strokeDashoffset: 1 });
    utils.set(el<SVGPathElement>(art, '.art-done'), { strokeDashoffset: 1 });
  }
};

const addArt = (tl: Timeline, art: SVGSVGElement, at: number, index: number): void => {
  if (index === 0) {
    tl.add(all<SVGGElement>(art, '.art-bubble'), {
      opacity: 1,
      translateY: 0,
      duration: 340,
      ease: 'outQuad',
      delay: stagger(300),
    }, at).add(all<SVGCircleElement>(art, '.art-dot'), {
      scale: 1,
      duration: 240,
      ease: 'outQuad',
      delay: stagger(90),
    }, at + 420);
  } else if (index === 1) {
    tl.add(all<SVGRectElement>(art, '.art-bullet'), {
      opacity: 1,
      translateX: 0,
      duration: 260,
      ease: 'outQuad',
      delay: stagger(170),
    }, at).add(all<SVGPathElement>(art, '.art-line'), {
      strokeDashoffset: 0,
      duration: 420,
      ease: 'inOutQuad',
      delay: stagger(170),
    }, at + 60);
  } else if (index === 2) {
    tl.add(el<SVGRectElement>(art, '.art-page'), {
      strokeDashoffset: 0,
      duration: 420,
      ease: 'inOutQuad',
    }, at).add(all<SVGRectElement>(art, '.art-block'), {
      opacity: 1,
      scale: 1,
      duration: 300,
      ease: 'outQuad',
      delay: stagger(150),
    }, at + 260);
  } else {
    tl.add(el<SVGPathElement>(art, '.art-check'), {
      strokeDashoffset: 0,
      duration: 560,
      ease: 'inOutQuad',
    }, at).add(el<SVGPathElement>(art, '.art-done'), {
      strokeDashoffset: 0,
      duration: 300,
      ease: 'outQuad',
    }, at + 560);
  }
};

/**
 * Связная последовательность из четырёх этапов: лаймовый участок линии
 * доходит до каждого маркера, маркер мягко выделяется, рядом проигрывается
 * своя иллюстрация. Один раз, около трёх секунд, дальше — законченное состояние.
 */
export function initStepsSequence(host: HTMLElement): Dispose {
  const root = host.querySelector<HTMLElement>('[data-steps]');
  if (!root) return noop;

  const steps = all<HTMLElement>(root, '.step');
  const rails = all<HTMLElement>(root, '.step__rail-fill');
  if (steps.length === 0 || rails.length === 0) return noop;

  const markDone = (): void => {
    root.classList.add('is-done');
  };

  if (prefersReduced()) {
    markDone();
    return noop;
  }

  const isVertical = (): boolean =>
    mediaQuery('(max-width: 760px)')?.matches ?? false;

  let tl: Timeline | null = null;
  let vertical = false;
  let started = false;
  let finished = false;
  let observer: IntersectionObserver | null = null;

  /** Прерывание на середине: показываем статичное завершённое состояние. */
  const finishNow = (): void => {
    if (finished) return;
    finished = true;
    if (tl) {
      tl.pause();
      // Доводим все тви до финальных значений — покой собирается мгновенно.
      tl.seek(tl.duration);
      tl = null;
    }
    markDone();
  };

  const start = (): void => {
    if (started) return;
    started = true;
    vertical = isVertical();
    tl = buildStepsTimeline(root, steps, rails, vertical, () => {
      finished = true;
      root.classList.add('is-done');
    });
    tl.play();
  };

  const onResize = (): void => {
    if (!started || finished || vertical === isVertical()) return;
    finishNow();
  };

  const dispose: Dispose = () => {
    observer?.disconnect();
    observer = null;
    window.removeEventListener('resize', onResize);
    tl?.pause();
    root.classList.remove('is-done');
  };

  if (!('IntersectionObserver' in window)) {
    start();
    return dispose;
  }

  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer?.disconnect();
      observer = null;
      start();
    },
    { threshold: 0.2, rootMargin: '0px 0px -6% 0px' },
  );
  observer.observe(root);
  window.addEventListener('resize', onResize);

  return dispose;
}

function buildStepsTimeline(
  root: HTMLElement,
  steps: HTMLElement[],
  rails: HTMLElement[],
  vertical: boolean,
  onDone: () => void,
): Timeline {
  const cores = steps.map((step) => el<HTMLElement>(step, '.step__dot-core'));
  const arts = steps.map((step) => el<SVGSVGElement>(step, '.art'));
  const axis = vertical ? 'scaleY' : 'scaleX';

  // Отмотка в начало: разметка показывает покой, сценарий стартует с нуля.
  utils.set(cores, { scale: 0 });
  utils.set(rails, { [axis]: 0 });
  arts.forEach((art, index) => setArtHidden(art, index));

  const tl = createTimeline({ autoplay: false, onComplete: onDone });

  const markAt = [0, 900, 1740, 2580];
  const artAt = [80, 940, 1780, 2620];
  const railAt = [380, 1240, 2080];

  steps.forEach((_, index) => {
    tl.add(cores[index], {
      scale: 1,
      duration: 260,
      ease: 'outQuad',
    }, markAt[index]);
    addArt(tl, arts[index], artAt[index], index);
  });

  rails.slice(0, railAt.length).forEach((rail, index) => {
    tl.add(rail, { [axis]: 1, duration: 550, ease: 'inOutQuad' }, railAt[index]);
  });

  return tl;
}

/* --- Медленная карусель проектов ------------------------------------------ */

/**
 * Лента работ едет сама — около 22 px/с — и замирает, пока её читают:
 * при наведении, фокусе, перетаскивании или собственной прокрутке,
 * а через пару секунд покоя продолжается с того же места. В разметке лежат
 * копии карточек, поэтому петля не видна; при prefers-reduced-motion
 * остаётся обычная ручная прокрутка.
 */
export function initWorksCarousel(host: HTMLElement): Dispose {
  const scroll = host.querySelector<HTMLElement>('[data-carousel-scroll]');
  const track = host.querySelector<HTMLElement>('[data-carousel-track]');
  if (!scroll || !track || prefersReduced()) return noop;

  const reduce = mediaQuery('(prefers-reduced-motion: reduce)');
  const speed = 22; // пикселей в секунду

  let loop = 0;
  let position = 0;
  let applied = 0;
  let hovered = false;
  let focused = false;
  let dragging = false;
  let idleUntil = 0;
  let visible = false;
  let last = 0;
  let raf = 0;
  let observer: IntersectionObserver | null = null;

  /** Ширина первой «тройки» карточек — по ней отматывается петля. */
  const measure = (): void => {
    const cards = track.children;
    const first = cards[0] as HTMLElement | undefined;
    const middle = cards[Math.floor(cards.length / 2)] as HTMLElement | undefined;
    loop = first && middle ? middle.offsetLeft - first.offsetLeft : 0;
  };

  const pauseFor = (ms: number): void => {
    idleUntil = performance.now() + ms;
  };

  /** Собственная запись scrollLeft не должна читаться как жест пользователя. */
  const onScroll = (): void => {
    if (Math.abs(scroll.scrollLeft - applied) < 0.5) return;
    pauseFor(3200);
  };

  const onEnter = (): void => {
    hovered = true;
  };
  const onLeave = (): void => {
    hovered = false;
  };
  const onFocusIn = (): void => {
    focused = true;
  };
  const onFocusOut = (): void => {
    focused = scroll.contains(document.activeElement);
  };
  const onPointerDown = (): void => {
    dragging = true;
    pauseFor(3000);
  };
  const onPointerUp = (): void => {
    dragging = false;
    pauseFor(2600);
  };

  const tick = (now: number): void => {
    raf = window.requestAnimationFrame(tick);
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;

    const running =
      visible &&
      !reduce?.matches &&
      !document.hidden &&
      !hovered &&
      !focused &&
      !dragging &&
      now >= idleUntil &&
      loop > 0;

    if (!running) {
      // Пока пауза — держимся за реальное положение прокрутки.
      position = scroll.scrollLeft;
      return;
    }

    // Дробный накопитель: scrollLeft живёт в целых пикселях и не растёт сам.
    position += speed * dt;
    // Контент в ленте повторяется, поэтому отмотка петли визуально бесшовна.
    if (position >= loop) position -= loop;
    scroll.scrollLeft = position;
    applied = scroll.scrollLeft;
  };

  measure();

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible) last = 0;
      },
      { rootMargin: '80px 0px' },
    );
    observer.observe(scroll);
  } else {
    visible = true;
  }

  scroll.addEventListener('scroll', onScroll, { passive: true });
  scroll.addEventListener('mouseenter', onEnter);
  scroll.addEventListener('mouseleave', onLeave);
  scroll.addEventListener('focusin', onFocusIn);
  scroll.addEventListener('focusout', onFocusOut);
  scroll.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('resize', measure);
  raf = window.requestAnimationFrame(tick);

  return () => {
    window.cancelAnimationFrame(raf);
    observer?.disconnect();
    observer = null;
    window.removeEventListener('resize', measure);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    scroll.removeEventListener('scroll', onScroll);
    scroll.removeEventListener('mouseenter', onEnter);
    scroll.removeEventListener('mouseleave', onLeave);
    scroll.removeEventListener('focusin', onFocusIn);
    scroll.removeEventListener('focusout', onFocusOut);
    scroll.removeEventListener('pointerdown', onPointerDown);
  };
}
