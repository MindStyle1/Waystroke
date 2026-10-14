import { TestBed } from '@angular/core/testing';
import { EventPhase } from '@angular/core/primitives/event-dispatch';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('switches the site copy, prices and document language in both directions', async () => {
    const originalUrl = window.location.href;
    const originalTitle = document.title;
    const originalLanguage = document.documentElement.lang;
    const fixture = TestBed.createComponent(App);
    try {
      await fixture.whenStable();
      const host = fixture.nativeElement as HTMLElement;
      host.querySelector<HTMLButtonElement>('.language-switch button[lang="en"]')!.click();
      await fixture.whenStable();
      expect(document.documentElement.lang).toBe('en');
      expect(host.querySelector('#hero-title')?.textContent).toContain('easy to use');
      expect(host.querySelector('.rate__primary')?.textContent).toContain('$420–775');
      expect(host.querySelector('#faq-title')?.textContent).toBe('The essentials, explained.');
      expect(window.location.search).toContain('lang=en');

      host.querySelector<HTMLButtonElement>('.language-switch button[lang="ru"]')!.click();
      await fixture.whenStable();
      expect(document.documentElement.lang).toBe('ru');
      expect(host.querySelector('#hero-title')?.textContent).toContain('удобно использовать');
      expect(host.querySelector('.rate__primary')?.textContent).toContain('35–65 тыс. ₽');
      expect(window.location.search).not.toContain('lang=en');
    } finally {
      fixture.destroy();
      window.history.replaceState(window.history.state, '', originalUrl);
      document.title = originalTitle;
      document.documentElement.lang = originalLanguage;
    }
  });

  it('automatically opens once on entering the viewport and allows manual closing', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const descriptor = Object.getOwnPropertyDescriptor(window, 'IntersectionObserver');
    let callback: IntersectionObserverCallback | undefined;
    const disconnect = vi.fn();
    window.IntersectionObserver = class {
      constructor(handler: IntersectionObserverCallback) {
        callback = handler;
      }
      observe = vi.fn();
      disconnect = disconnect;
    } as unknown as typeof IntersectionObserver;
    try {
      const host = fixture.nativeElement as HTMLElement;
      const panel = host.querySelector<HTMLDetailsElement>('details.cal')!;
      panel.animate = undefined as unknown as typeof panel.animate;
      fixture.componentInstance['initBookingAutoOpen'](host);
      expect(panel.open).toBe(false);
      callback!(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
      await fixture.whenStable();
      expect(panel.open).toBe(true);
      expect(disconnect).toHaveBeenCalled();
      panel.querySelector<HTMLElement>('summary')!.click();
      await fixture.whenStable();
      expect(panel.open).toBe(false);
      expect(fixture.componentInstance['bookingAutoObserver']).toBeNull();
    } finally {
      fixture.destroy();
      if (descriptor) Object.defineProperty(window, 'IntersectionObserver', descriptor);
      else Reflect.deleteProperty(window, 'IntersectionObserver');
    }
  });

  it('loads the booking embed only after opening the calendar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    document.body.append(host);
    const calendar = host.querySelector<HTMLDetailsElement>('details.cal')!;
    expect(calendar.open).toBe(false);
    expect(host.querySelector('[data-booking-frame]')).toBeNull();

    calendar.open = true;
    calendar.dispatchEvent(new Event('toggle'));
    await fixture.whenStable();
    const frame = host.querySelector<HTMLIFrameElement>('[data-booking-frame]')!;
    expect(frame.getAttribute('src')).toContain('cal.com/mind-style-00/waystroke-call');
    frame.dispatchEvent(new Event('load'));
    await fixture.whenStable();
    expect(calendar.classList.contains('is-loaded')).toBe(false);
    const acknowledge = vi.spyOn(frame.contentWindow!, 'postMessage').mockImplementation(() => {});
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://cal.com',
        source: frame.contentWindow,
        data: { originator: 'CAL', type: '__iframeReady' },
      }),
    );
    await fixture.whenStable();
    expect(acknowledge).toHaveBeenCalledWith(
      { originator: 'CAL', method: 'parentKnowsIframeReady' },
      'https://cal.com',
    );
    expect(calendar.classList.contains('is-loaded')).toBe(false);
    acknowledge.mockRestore();
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://cal.com',
        source: frame.contentWindow,
        data: {
          originator: 'CAL',
          type: 'linkReady',
        },
      }),
    );
    await fixture.whenStable();
    expect(calendar.classList.contains('is-loaded')).toBe(true);
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://cal.com',
        source: frame.contentWindow,
        data: { originator: 'CAL', type: 'linkFailed' },
      }),
    );
    await fixture.whenStable();
    expect(calendar.classList.contains('is-loaded')).toBe(false);
    expect(host.querySelector('.cal__error')).not.toBeNull();
    expect(frame.getAttribute('aria-hidden')).toBe('true');
    expect(frame.hasAttribute('inert')).toBe(true);
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://cal.com',
        source: frame.contentWindow,
        data: { originator: 'CAL', type: 'linkReady' },
      }),
    );
    await fixture.whenStable();
    expect(calendar.classList.contains('is-loaded')).toBe(true);
    expect(host.querySelector('.cal__error')).toBeNull();
    expect(frame.hasAttribute('aria-hidden')).toBe(false);
    expect(frame.hasAttribute('inert')).toBe(false);

    calendar.open = false;
    calendar.dispatchEvent(new Event('toggle'));
    await fixture.whenStable();
    calendar.open = true;
    calendar.dispatchEvent(new Event('toggle'));
    await fixture.whenStable();
    expect(host.querySelector('[data-booking-frame]')).toBe(frame);
    fixture.destroy();
    host.remove();
  });

  it('rejects readiness messages from other origins, windows and booking events', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    document.body.append(host);
    const panel = host.querySelector<HTMLDetailsElement>('details.cal')!;
    panel.open = true;
    panel.dispatchEvent(new Event('toggle'));
    await fixture.whenStable();
    const frame = host.querySelector<HTMLIFrameElement>('iframe')!;
    try {
      for (const invalid of [
        {
          origin: 'https://example.com',
          source: frame.contentWindow,
          data: { originator: 'CAL', type: 'linkReady' },
        },
        {
          origin: 'https://cal.com',
          source: window,
          data: { originator: 'CAL', type: 'linkReady' },
        },
        {
          origin: 'https://cal.com',
          source: frame.contentWindow,
          data: {
            originator: 'CAL',
            type: 'availabilityLoaded',
            data: { eventSlug: 'another-event' },
          },
        },
        {
          origin: 'https://cal.com',
          source: frame.contentWindow,
          data: { originator: 'CAL', type: '__iframeReady' },
        },
      ]) {
        window.dispatchEvent(new MessageEvent<unknown>('message', invalid));
        await fixture.whenStable();
        expect(panel.classList.contains('is-loaded')).toBe(false);
      }
    } finally {
      fixture.destroy();
      host.remove();
    }
  });

  it('keeps the calendar visible until collapse finishes and reverses an interrupted collapse', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const panel = host.querySelector<HTMLDetailsElement>('details.cal')!;
    const summary = panel.querySelector<HTMLElement>('summary')!;
    const animations: Array<{ cancel: ReturnType<typeof vi.fn>; onfinish: (() => void) | null }> =
      [];
    panel.animate = vi.fn(() => {
      const animation = { cancel: vi.fn(), onfinish: null as (() => void) | null };
      animations.push(animation);
      return animation as unknown as Animation;
    });
    summary.click();
    await fixture.whenStable();
    expect(panel.open).toBe(true);
    animations[0].onfinish!();
    summary.click();
    await fixture.whenStable();
    expect(panel.open).toBe(true);
    expect(summary.getAttribute('aria-expanded')).toBe('false');
    summary.click();
    await fixture.whenStable();
    expect(animations[1].cancel).toHaveBeenCalled();
    animations[1].onfinish!();
    expect(panel.open).toBe(true);
    animations[2].onfinish!();
    summary.click();
    await fixture.whenStable();
    animations[3].onfinish!();
    await fixture.whenStable();
    expect(panel.open).toBe(false);
    expect(panel.classList.contains('is-booking-animating')).toBe(false);
    fixture.destroy();
  });

  it('opens and closes immediately when reduced motion is requested', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const panel = (fixture.nativeElement as HTMLElement).querySelector<HTMLDetailsElement>(
      'details.cal',
    )!;
    const summary = panel.querySelector<HTMLElement>('summary')!;
    const original = window.matchMedia;
    window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia;
    panel.animate = vi.fn();
    try {
      summary.click();
      await fixture.whenStable();
      expect(panel.open).toBe(true);
      summary.click();
      await fixture.whenStable();
      expect(panel.open).toBe(false);
      expect(panel.animate).not.toHaveBeenCalled();
    } finally {
      window.matchMedia = original;
      fixture.destroy();
    }
  });

  it('preserves a native opening replayed after hydration', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const panel = host.querySelector<HTMLDetailsElement>('details.cal')!;
    const summary = panel.querySelector<HTMLElement>('summary')!;
    panel.open = true;
    const replay = new MouseEvent('click');
    Object.defineProperty(replay, 'eventPhase', { value: EventPhase.REPLAY });
    Object.defineProperty(replay, 'currentTarget', { value: summary });
    const prevent = vi.spyOn(replay, 'preventDefault').mockImplementation(() => {
      throw new Error('Replay cannot cancel the original browser action');
    });
    fixture.componentInstance['onBookingClick'](replay);
    await fixture.whenStable();
    expect(prevent).not.toHaveBeenCalled();
    expect(panel.open).toBe(true);
    expect(summary.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('[data-booking-frame]')).not.toBeNull();
    fixture.destroy();
  });

  it('should render hero heading', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim()).toContain(
      'Сайты, которые удобно',
    );
    expect(compiled.querySelector('.lead')?.textContent).toContain(
      'Waystroke начинает со структуры',
    );
  });

  it('should expose native navigation links with existing fragment targets', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll<HTMLAnchorElement>('a[data-scroll-to]');

    expect(links.length).toBeGreaterThan(0);
    expect(compiled.querySelector('button[data-scroll-to]')).toBeNull();
    for (const link of links) {
      expect(compiled.querySelector(link.getAttribute('href')!)).not.toBeNull();
    }
  });

  it('should enhance native navigation without changing the fragment', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const target = compiled.querySelector<HTMLElement>('#services')!;
    const scroll = vi.fn();
    target.scrollIntoView = scroll;
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });

    compiled.querySelector('a[href="#services"]')!.dispatchEvent(click);
    await fixture.whenStable();
    expect(click.defaultPrevented).toBe(true);
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it('should preserve native modified clicks on navigation links', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const scroll = vi.fn();
    compiled.querySelector<HTMLElement>('#services')!.scrollIntoView = scroll;
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });

    compiled.querySelector('a[href="#services"]')!.dispatchEvent(click);
    await fixture.whenStable();
    expect(click.defaultPrevented).toBe(false);
    expect(scroll).not.toHaveBeenCalled();
  });

  it('should render the work process without decorative ordinal numbers', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('.step__num')).toHaveLength(0);
    expect(compiled.querySelectorAll('.step__title')).toHaveLength(4);
  });

  it('should tell the loader that the first frame is ready', async () => {
    const ready = vi.fn();
    window.addEventListener('waystroke:app-ready', ready);

    try {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      // Загрузчик слушает окно: событие на документе до него не дошло бы.
      expect(ready).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('waystroke:app-ready', ready);
    }
  });

  it('should reveal content while intro is still playing', async () => {
    document.documentElement.dataset['bootState'] = 'on';
    try {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelector('.reveal.is-visible')).not.toBeNull();
      expect(document.documentElement.dataset['bootState']).toBe('on');
    } finally {
      delete document.documentElement.dataset['bootState'];
    }
  });

  it('should show the page at once when no loader is holding the screen', async () => {
    // Повторный визит в сессии: загрузчик проходит мимо экрана ещё до
    // бутстрапа, и ждать события, которого уже не будет, нельзя.
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.reveal.is-visible')).not.toBeNull();
  });
  it('batches scroll events into one header read and preserves the 12px threshold', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    await new Promise((resolve) =>
      window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)),
    );
    const callbacks: FrameRequestCallback[] = [];
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    const y = vi.spyOn(window, 'scrollY', 'get').mockReturnValue(12);
    const header = fixture.nativeElement.querySelector('.site-header') as HTMLElement;
    try {
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('scroll'));
      expect(y).not.toHaveBeenCalled();
      callbacks.splice(0).forEach((cb) => cb(0));
      await fixture.whenStable();
      expect(y).toHaveBeenCalledTimes(1);
      expect(header.classList.contains('is-scrolled')).toBe(false);
      y.mockReturnValue(13);
      window.dispatchEvent(new Event('scroll'));
      callbacks.splice(0).forEach((cb) => cb(16));
      await fixture.whenStable();
      expect(header.classList.contains('is-scrolled')).toBe(true);
      y.mockReturnValue(0);
      window.dispatchEvent(new Event('scroll'));
      callbacks.splice(0).forEach((cb) => cb(32));
      await fixture.whenStable();
      expect(header.classList.contains('is-scrolled')).toBe(false);
    } finally {
      fixture.destroy();
      raf.mockRestore();
      y.mockRestore();
    }
  });

  it('cancels a queued header update when the component is destroyed', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    await new Promise((resolve) =>
      window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)),
    );
    const callbacks: FrameRequestCallback[] = [];
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    const y = vi.spyOn(window, 'scrollY', 'get');
    try {
      window.dispatchEvent(new Event('scroll'));
      fixture.destroy();
      expect(cancel).toHaveBeenCalledWith(1);
      callbacks.forEach((cb) => cb(0));
      expect(y).not.toHaveBeenCalled();
    } finally {
      raf.mockRestore();
      cancel.mockRestore();
      y.mockRestore();
    }
  });
});
