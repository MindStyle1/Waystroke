import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render hero heading', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Сайты, которые удобно');
    expect(compiled.querySelector('.eyebrow__text')?.textContent).toContain('цифровая мастерская');
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
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
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
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
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
