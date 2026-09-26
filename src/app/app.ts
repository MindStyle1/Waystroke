import { AfterViewInit, Component, DestroyRef, ElementRef, OnDestroy, inject, signal } from '@angular/core';
import { initServiceScenes, initStepsSequence, initTeamScene, type Dispose } from './motion';
import { initConversions } from './tracking';
import { DesignDemo } from './design-demo/design-demo';
import { Work } from './work/work';

/** Прокрутка без анимации, когда пользователь просит уменьшить движение. */
const prefersReduced = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Одностраничная витрина Waystroke.
 *
 * Появление блоков, мобильное меню, секционные анимации, подстраховка
 * для календаря записи и учёт кликов по контактам живут здесь — всё
 * уничтожается вместе с компонентом.
 */
@Component({
  selector: 'app-root',
  imports: [DesignDemo, Work],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements AfterViewInit, OnDestroy {
  protected readonly menuOpen = signal(false);
  protected readonly instantMenu = signal(false);
  protected readonly scrolled = signal(false);
  protected readonly calendarLoaded = signal(false);
  protected readonly calendarFailed = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private observer: IntersectionObserver | null = null;
  private bookingTimer: number | null = null;
  private bookingObserver: IntersectionObserver | null = null;
  private readonly motionDisposers: Dispose[] = [];
  private sweepScheduled = false;
  private cleanedUp = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.cleanup());
  }

  ngAfterViewInit(): void {
    const host = this.host.nativeElement as HTMLElement;

    // Первый кадр отрисован — загрузчику можно уходить. Событие нужно всегда:
    // без загрузчика его никто не слушает, но и лишним оно не будет.
    window.dispatchEvent(new CustomEvent('waystroke:app-ready'));

    // Пока брендовый кадр на экране, страница не показывается: появление
    // блоков стартует в момент, когда загрузчик освобождает экран.
    this.onBootDone(() => {
      this.initReveal();
      this.initBooking();
    });

    this.updateHeader();
    this.motionDisposers.push(
      initServiceScenes(host),
      initTeamScene(host),
      initStepsSequence(host),
      initConversions(host),
    );

    window.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('keydown', this.handleKeydown);
    host.addEventListener('click', this.handleNavClick);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    this.syncMenu();
    // Фокус остаётся на кнопке (паттерн disclosure): Tab ведёт в пункты меню,
    // потому что они идут следом в разметке и видимы только когда меню открыто.
  }

  protected closeMenu(): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    this.syncMenu();
  }

  protected onCalendarLoad(): void {
    this.calendarLoaded.set(true);
  }

  private readonly handleScroll = (): void => {
    this.updateHeader();
    this.scheduleSweep();
  };

  /**
   * IntersectionObserver не отдаёт событие, когда экран «перепрыгивают»
   * целиком (якорь, перетаскивание скроллбара). Догоняем такие блоки
   * отдельной проверкой — один раз за кадр, без лишней работы.
   */
  private scheduleSweep(): void {
    if (this.sweepScheduled) return;
    this.sweepScheduled = true;

    window.requestAnimationFrame(() => {
      this.sweepScheduled = false;
      if (this.cleanedUp) return;
      const limit = window.innerHeight * 0.92;

      document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)').forEach((element) => {
        if (element.getBoundingClientRect().top >= limit) return;
        element.classList.add('is-visible');
        this.observer?.unobserve(element);
      });
    });
  }

  private readonly handleResize = (): void => {
    if (window.innerWidth > 900) this.closeMenu();
  };

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.menuOpen()) return;
    this.closeMenu();
    // Фокус возвращается на кнопку меню — закрытие не оставляет его в воздухе.
    this.host.nativeElement.querySelector<HTMLElement>('.menu-toggle')?.focus();
  };

  /**
   * Навигация по странице — один делегированный обработчик на весь хост:
   * логотип, шапка, мобильное меню и кнопки первого экрана ведут себя одинаково.
   */
  private readonly handleNavClick = (event: Event): void => {
    const origin = event.target as Element | null;
    const trigger = origin?.closest<HTMLElement>('[data-scroll-to]');
    if (!trigger || !this.host.nativeElement.contains(trigger)) return;
    this.scrollToKey(trigger.dataset['scrollTo'] ?? '');
  };

  /**
   * Плавная прокрутка без якорей: адрес страницы не меняется, перезагрузки нет,
   * а фокус следует за секцией — с клавиатуры продолжаем именно от неё.
   * Отступ под фиксированной шапкой задан через scroll-padding-top у документа.
   */
  private scrollToKey(key: string): void {
    if (!key) return;

    // Из мобильного меню уходим в два шага: сначала закрываем его без анимации —
    // иначе схлопывание сдвинет страницу уже после того, как мы доехали.
    const menuWasOpen = this.menuOpen();
    if (menuWasOpen) {
      this.instantMenu.set(true);
      this.closeMenu();
    }

    const go = (): void => {
      try {
        const behavior: ScrollBehavior = prefersReduced() ? 'auto' : 'smooth';

        // Логотип возвращает к позиции 0 — обычным скроллом, без перезагрузки.
        if (key === 'top') {
          window.scrollTo({ top: 0, behavior });
          return;
        }

        const section = this.host.nativeElement.querySelector<HTMLElement>(
          `[data-section="${key}"]`,
        );
        if (!section) return;

        section.scrollIntoView({ behavior, block: 'start' });
        section.focus({ preventScroll: true });
      } finally {
        this.instantMenu.set(false);
      }
    };

    // Двойной кадр: Angular успевает убрать меню из потока до прокрутки.
    if (menuWasOpen) {
      window.requestAnimationFrame(() => window.requestAnimationFrame(go));
      return;
    }

    go();
  }

  private updateHeader(): void {
    this.scrolled.set(window.scrollY > 12);
  }

  /**
   * Ждём, пока загрузчик отдаст экран.
   *
   * Источник истины — состояние `data-boot-state` на документе, а не событие
   * `waystroke:boot-done`. На повторном визите загрузчик не показывается и
   * отдаёт экран ещё при разборе документа, то есть заведомо до бутстрапа
   * Angular: слушатель события зарегистрировался бы после него и ждал уже
   * бесполезной страховки — все три с половиной секунды страница стояла бы
   * пустой.
   *
   * Пока состояние `on`, появление блоков играет под брендовым кадром, и к
   * моменту его ухода уже отыграло бы — страница показалась бы готовой, без
   * жеста. Если состояние любое другое, показывать можно сразу.
   */
  private onBootDone(run: () => void): void {
    if (document.documentElement.dataset['bootState'] !== 'on') {
      run();
      return;
    }

    let started = false;
    let timer = 0;

    const start = (): void => {
      if (started) return;
      started = true;
      window.clearTimeout(timer);
      run();
    };

    timer = window.setTimeout(start, 3600);
    window.addEventListener('waystroke:boot-done', start, { once: true });
    this.destroyRef.onDestroy(() => window.clearTimeout(timer));
  }

  private syncMenu(): void {
    document.body.classList.toggle('menu-open', this.menuOpen());
  }

  /** Плавное появление блоков при попадании во вьюпорт. */
  private initReveal(): void {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    if (elements.length === 0) return;

    const reducedMotion = prefersReduced();

    if (reducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          this.observer?.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    elements.forEach((element) => this.observer?.observe(element));

    // Страховка: всё, что уже попало в первый экран, показываем сразу.
    window.requestAnimationFrame(() => {
      elements.forEach((element) => {
        if (element.getBoundingClientRect().top < window.innerHeight) {
          element.classList.add('is-visible');
          this.observer?.unobserve(element);
        }
      });
    });
  }

  /**
   * Календарь записи подключён через iframe и подгружается лениво, поэтому
   * отсчёт начинается, когда блок подъезжает к экрану. Если запись так и не
   * открылась за отведённое время, остаётся обычная ссылка на страницу записи.
   */
  private initBooking(): void {
    const host = this.host.nativeElement as HTMLElement;
    const frame = host.querySelector('[data-booking-frame]');
    if (!frame) return;

    const startTimer = (): void => {
      if (this.calendarLoaded() || this.bookingTimer !== null) return;
      this.bookingTimer = window.setTimeout(() => {
        if (this.calendarLoaded()) return;
        this.calendarFailed.set(true);
      }, 8000);
    };

    const body = frame.parentElement;
    if (!body || !('IntersectionObserver' in window)) {
      startTimer();
      return;
    }

    this.bookingObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        this.bookingObserver?.disconnect();
        this.bookingObserver = null;
        startTimer();
      },
      { rootMargin: '300px 0px' },
    );
    this.bookingObserver.observe(body);
  }

  private cleanup(): void {
    if (this.cleanedUp) return;
    this.cleanedUp = true;

    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('keydown', this.handleKeydown);
    (this.host.nativeElement as HTMLElement).removeEventListener('click', this.handleNavClick);

    this.observer?.disconnect();
    this.observer = null;

    this.bookingObserver?.disconnect();
    this.bookingObserver = null;

    if (this.bookingTimer !== null) {
      window.clearTimeout(this.bookingTimer);
      this.bookingTimer = null;
    }

    while (this.motionDisposers.length > 0) {
      this.motionDisposers.pop()?.();
    }
  }
}
