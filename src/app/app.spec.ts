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
    expect(compiled.querySelector('h1')?.textContent).toContain('Создаю сайты');
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

  it('should hold the reveal back while the loader holds the screen', async () => {
    // Состояние `on` — загрузчик на экране и держит страницу: появление
    // блоков не должно отыграть под ним.
    document.documentElement.dataset['bootState'] = 'on';

    try {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(compiled.querySelector('.reveal.is-visible')).toBeNull();

      window.dispatchEvent(new CustomEvent('waystroke:boot-done'));
      await fixture.whenStable();

      expect(compiled.querySelector('.reveal.is-visible')).not.toBeNull();
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
});
