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

  it('should hold the reveal back until the loader gives the screen away', async () => {
    // Страница нарисована, но брендовый кадр ещё на экране: появление блоков
    // не должно отыграть под ним.
    const loader = document.createElement('div');
    loader.setAttribute('data-boot', '');
    document.body.appendChild(loader);

    try {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(compiled.querySelector('.reveal.is-visible')).toBeNull();

      window.dispatchEvent(new CustomEvent('waystroke:boot-done'));
      await fixture.whenStable();

      expect(compiled.querySelector('.reveal.is-visible')).not.toBeNull();
    } finally {
      loader.remove();
    }
  });
});
