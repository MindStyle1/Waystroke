/**
 * Брендовый загрузчик живёт в разметке документа, а не в Angular, поэтому
 * проверяем его по исходным файлам: устройство кадра, исходное состояние и
 * то, как сцена договаривается с приложением.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (name: string): string => readFileSync(join(process.cwd(), 'src', name), 'utf8');

/** Исходная разметка документа: загрузчик живёт именно в ней. */
const indexHtml = (): string => source('index.html');

/**
 * Правила загрузчика из таблицы стилей — отрезок между двумя заголовками
 * секций. Исходное состояние кадра проверяем по ним, а не по разметке:
 * браузер тоже берёт его оттуда, до того как выполнит хоть один скрипт.
 */
const loaderCss = (): string => {
  const css = source('styles.css');
  const from = css.indexOf('/* --- Брендовый загрузчик');
  const to = css.indexOf('/* --- Шапка');
  if (from < 0 || to < 0) throw new Error('в styles.css нет секции загрузчика');
  return css.slice(from, to);
};

/** Разобранный документ: сцена берётся оттуда, скрипты не исполняются. */
const parsed = (): Document => new DOMParser().parseFromString(indexHtml(), 'text/html');

const bootScene = (doc: Document): SVGSVGElement => {
  const scene = doc.querySelector('[data-boot] .boot__svg');
  if (!scene) throw new Error('в index.html нет сцены загрузчика');
  return scene as SVGSVGElement;
};

/**
 * Исходник решения из `<head>`: оно принимается до первой отрисовки и решает,
 * показывать ли загрузчик вообще.
 */
const headScript = (): string => {
  const scripts = Array.from(parsed().querySelectorAll('script'));
  const head = scripts.find((script) => script.textContent?.includes('boot-skip'));
  if (!head?.textContent) throw new Error('в index.html нет решения о загрузчике');
  return head.textContent;
};

/** Исходник сцены из конца документа — тот, что запускает и убирает её. */
const lifecycleSource = (): string => {
  const scripts = Array.from(parsed().querySelectorAll('script'));
  const scene = scripts.find((script) => script.textContent?.includes('waystroke:boot-done'));
  if (!scene?.textContent) throw new Error('в index.html нет сценария загрузчика');
  return scene.textContent;
};

describe('Загрузчик: устройство кадра', () => {
  it('рисует штрих и проявляющую его маску по одной и той же линии', () => {
    const scene = bootScene(parsed());
    const line = scene.querySelector('.boot__line');
    const sweep = scene.querySelector('.boot__sweep');

    // Пока маска идёт по другой линии, слово проявится не там, где прошёл
    // штрих, — и весь смысл кадра «разрезано по штриху» пропадёт.
    expect(line?.getAttribute('d')).toBe(sweep?.getAttribute('d'));
    expect(line?.getAttribute('pathLength')).toBe('1');
    expect(sweep?.getAttribute('pathLength')).toBe('1');
  });

  it('держит лаймовую точку началом штриха, а не частью линии', () => {
    const scene = bootScene(parsed());
    const line = scene.querySelector('.boot__line');
    const dot = scene.querySelector('.boot__dot');

    expect(dot?.getAttribute('fill')).toBeNull(); // цвет задают стили
    expect(dot?.getAttribute('cx')).toBe(line?.getAttribute('d')?.match(/M([\d.]+)/)?.[1]);
    expect(dot?.getAttribute('cy')).toBe(line?.getAttribute('d')?.match(/M[\d.]+ ([\d.]+)/)?.[1]);
  });

  it('проявляет слово точкой прохождения штриха, а лаймовая точка его не закрывает', () => {
    const scene = bootScene(parsed());
    const masked = scene.querySelector('g[mask]');
    const dot = scene.querySelector('.boot__dot');

    if (!masked || !dot) throw new Error('в кадре нет маскированной группы или точки');

    expect(masked.querySelector('.boot__word')?.textContent?.trim()).toBe('WAYSTROKE');
    expect(masked.querySelector('.boot__line')).not.toBeNull();
    // Точка нарисована после маскированной группы и закрывает её начало.
    expect(masked.compareDocumentPosition(dot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('не рисует кадр разметкой и не прячет его скриптом', () => {
    // Скрывающие значения (dashoffset, прозрачность, масштаб) задаёт только
    // таблица стилей: браузер применяет её до первой отрисовки, иначе на
    // холодной загрузке успевает показаться кадр «как в разметке».
    expect(indexHtml()).not.toMatch(/stroke-dashoffset/);
    expect(indexHtml()).not.toMatch(/style="[^"]*(opacity|transform)/);
  });
});

describe('Загрузчик: исходное состояние', () => {
  beforeEach(() => {
    const style = document.createElement('style');
    style.textContent = loaderCss();
    document.head.appendChild(style);
    document.body.innerHTML = '';
    document.body.appendChild(parsed().querySelector('[data-boot]') as HTMLElement);
  });

  afterEach(() => {
    document.querySelectorAll('style').forEach((style) => style.remove());
    document.body.innerHTML = '';
  });

  it('не показывает WAYSTROKE до запуска анимации', () => {
    const word = document.querySelector('.boot__word') as SVGElement;
    const before = word.getAttribute('opacity');
    word.removeAttribute('opacity');

    // Класс `is-playing` ещё не на загрузчике — сцена не началась.
    expect(document.querySelector('[data-boot]')?.classList.contains('is-playing')).toBe(false);
    expect(before).toBeNull();
    expect(getComputedStyle(word).opacity).toBe('0');
  });

  it('не прорисовывает штрих и не открывает маску до запуска анимации', () => {
    // Смещение 1 — это «ничего не нарисовано»: узор штрихов сдвинут назад за
    // начало пути, и на линии остаётся только шапка под точкой.
    const line = getComputedStyle(document.querySelector('.boot__line') as Element);
    const sweep = getComputedStyle(document.querySelector('.boot__sweep') as Element);

    expect(line.strokeDashoffset).toBe('1');
    expect(sweep.strokeDashoffset).toBe('1');
  });

  it('оставляет видимой одну точку — начало жеста', () => {
    const dot = getComputedStyle(document.querySelector('.boot__dot') as Element);

    expect(dot.opacity).toBe('1');
    // Маленькое зерно, из которого штрих вырастет: точка не мигает, а растёт.
    expect(dot.transform).toBe('scale(0.6)');
  });
});

describe('Загрузчик: сцена', () => {
  let boot: HTMLElement;

  beforeEach(() => {
    document.documentElement.className = 'js';
    delete document.documentElement.dataset['bootState'];
    document.body.innerHTML = '';
    boot = parsed().querySelector('[data-boot]') as HTMLElement;
    document.body.appendChild(boot);
  });

  afterEach(() => {
    // Сценарий слушает окно на весь документ, а тесты делят один и тот же:
    // сбрасываем слушателя, иначе он отзовётся в следующем тесте.
    window.dispatchEvent(new CustomEvent('waystroke:app-ready'));
    document.body.innerHTML = '';
    document.documentElement.className = 'js';
    delete document.documentElement.dataset['bootState'];
  });

  /** Исполняет сценарий загрузчика в текущем документе. */
  const run = async (): Promise<void> => {
    new Function(lifecycleSource())();
    // Сцена стартует на следующем кадре, чтобы не мигнуть готовым кадром.
    await new Promise((resolve) => setTimeout(resolve, 40));
  };

  it('ждёт готовности приложения без блокировки управления', () => {
    const appRoot = document.createElement('app-root');
    document.body.appendChild(appRoot);
    vi.useFakeTimers();
    try {
      new Function(lifecycleSource())();
      vi.advanceTimersByTime(40);
      expect(boot.classList.contains('is-playing')).toBe(false);
      expect(appRoot.hasAttribute('inert')).toBe(false);
      expect(document.documentElement.classList.contains('boot-on')).toBe(false);

      window.dispatchEvent(new CustomEvent('waystroke:app-ready'));
      vi.advanceTimersByTime(40);
      expect(boot.classList.contains('is-playing')).toBe(true);
      expect(appRoot.hasAttribute('inert')).toBe(false);
      vi.advanceTimersByTime(1500);
      expect(boot.classList.contains('is-out')).toBe(false);
      vi.advanceTimersByTime(100);
      expect(boot.classList.contains('is-out')).toBe(true);
      vi.advanceTimersByTime(640);
      expect(boot.hidden).toBe(true);
      expect(sessionStorage.getItem('waystroke:booted')).toBe('1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('убирает сцену страховкой при ошибке bootstrap', () => {
    vi.useFakeTimers();
    try {
      new Function(lifecycleSource())();
      vi.advanceTimersByTime(5300);
      expect(boot.hidden).toBe(true);
      window.dispatchEvent(new CustomEvent('waystroke:app-ready'));
      vi.advanceTimersByTime(40);
      expect(boot.classList.contains('is-playing')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('не запускает сцену, если первый кадр уже показан', () => {
    document.documentElement.classList.add('boot-skip');
    const released = vi.fn();
    window.addEventListener('waystroke:boot-done', released);

    new Function(lifecycleSource())();

    expect(released).toHaveBeenCalledTimes(1);
    expect(document.documentElement.classList.contains('boot-on')).toBe(false);
    expect(boot.classList.contains('is-playing')).toBe(false);
    // Показывать и тут же убирать через скрипт нельзя — это кадр без
    // анимации. Раз его не показывали, из документа он просто уходит.
    expect(document.body.contains(boot)).toBe(false);

    window.removeEventListener('waystroke:boot-done', released);
  });

  it('помечает документ состоянием, по которому приложение решает, ждать ли экран', () => {
    expect(document.documentElement.dataset['bootState']).toBeUndefined();
    // Часы ставим до запуска: сцена отсчитывает от первого кадра, который
    // приходит через requestAnimationFrame.
    vi.useFakeTimers();

    try {
      new Function(lifecycleSource())();
      vi.advanceTimersByTime(40);
      expect(document.documentElement.dataset['bootState']).toBe('on');

      window.dispatchEvent(new CustomEvent('waystroke:app-ready'));
      vi.advanceTimersByTime(2000);
      expect(document.documentElement.dataset['bootState']).toBe('off');
    } finally {
      vi.useRealTimers();
    }
  });

  it('на пропуске оставляет состояние «экран свободен», а документ целым', () => {
    // Так решает и решение в `<head>`: повторный визит и уменьшенное движение.
    document.documentElement.classList.add('boot-skip');
    document.documentElement.dataset['bootState'] = 'off';

    new Function(lifecycleSource())();

    expect(document.documentElement.dataset['bootState']).toBe('off');
    // Состояние живёт на <html>, загрузчик помечен тем же именем признака.
    // Смешать эти два имени нельзя: поиск по одному признаку начнёт отдавать
    // корень документа, и сцена перестанет запускаться.
    expect(document.documentElement.matches('.boot[data-boot]')).toBe(false);
    expect(document.documentElement.isConnected).toBe(true);
  });

  it('на повторном визите находит сцену, хотя решение лежит на документе', () => {
    // Путь reload целиком: решение в `<head>` ставит состояние на <html>, и
    // сцена из конца документа ищет себя по признаку в разметке. Имена не должны
    // пересекаться — иначе поиск отдаст корень документа, сцена не запустится,
    // и посетитель увидит пустой кадр до таймера.
    sessionStorage.setItem('waystroke:booted', '1');
    new Function(headScript())();

    expect(document.documentElement.dataset['bootState']).toBe('off');
    expect(document.querySelector('.boot[data-boot]')).not.toBeNull();

    new Function(lifecycleSource())();

    expect(document.querySelector('.boot[data-boot]')).toBeNull();
    expect(document.documentElement.isConnected).toBe(true);
    expect(document.documentElement.dataset['bootState']).toBe('off');
    sessionStorage.clear();
  });

  it('прячет кнопку повтора, пока сцена не вызвана на просмотр', async () => {
    const replay = boot.querySelector<HTMLButtonElement>('[data-boot-replay]');

    expect(replay?.hidden).toBe(true);

    await run();
    expect(replay?.hidden).toBe(true);
  });
});
