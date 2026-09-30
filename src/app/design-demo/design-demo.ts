import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { SiteMock, type Concept } from './site-mock';

/** Пара независимых концептов, которую раскрывает ползунок. */
export interface Pair {
  key: string;
  label: string;
  left: Concept;
  right: Concept;
  leftName: string;
  rightName: string;
}

const PAIRS: Pair[] = [
  {
    key: 'music',
    label: 'Музыка / Beauty',
    left: 'sdvig',
    right: 'miora',
    leftName: 'СДВИГ',
    rightName: 'miora',
  },
  {
    key: 'auto',
    label: 'Авто / Кофе',
    left: 'moto',
    right: 'kroshka',
    leftName: 'ТОЧКА МОТОР',
    rightName: 'крошка',
  },
  {
    key: 'fintech',
    label: 'Fintech / Art',
    left: 'saldo',
    right: 'exhibit',
    leftName: 'saldo',
    rightName: 'ВНЕ РАМКИ',
  },
];

// Only the faces used by the selected mockups are requested. The Cyrillic and
// Latin samples cover the separate Fontsource unicode-range files.
const PAIR_FONTS: Record<string, readonly [string, string][]> = {
  music: [
    ['700 16px Inter', 'СДВИГ studio'],
    ['400 16px "Playfair Display"', 'красота miora'],
    ['500 16px "Playfair Display"', 'красота miora'],
  ],
  auto: [
    ['700 16px Inter', 'ТОЧКА МОТОР'],
    ['italic 500 16px "Playfair Display"', 'крошка coffee'],
  ],
  fintech: [
    ['700 16px Inter', 'saldo ВНЕ РАМКИ ₽'],
    ['500 16px "Playfair Display"', 'ВНЕ РАМКИ art'],
  ],
};

/**
 * Сколько пикселей нужно пройти по горизонтали, прежде чем жест признан
 * перетаскиванием границы. Ниже — просто дрожание пальца в начале свайпа.
 */
const DRAG_THRESHOLD = 8;

/**
 * Допуск на «чистое касание»: пока указатель не ушёл дальше, нажатие считается
 * касанием без перемещения, и граница встаёт под ним.
 */
const TAP_SLOP = 4;

/**
 * Секция «Разные задачи. Разный характер.»
 *
 * Три переключателя открывают по паре совершенно разных сайтов: слева — один
 * концепт, справа — другой. Оба лежат в одной сетке (ячейка 1/1), поэтому
 * контейнер принимает высоту большего слоя и оба видны целиком: ползунок не
 * сжимает их, а открывает один поверх другого через обрезку (`clip-path`).
 *
 * Управление — Pointer Events на рамке сравнения. Мышь и перо двигают границу
 * сразу, как и раньше. Касание сначала остаётся браузеру: жест переходит к
 * ползунку только когда движение оказалось преимущественно горизонтальным,
 * поэтому вертикальный свайп по рамке прокручивает страницу как обычно.
 */
@Component({
  selector: 'app-design-demo',
  imports: [SiteMock],
  styleUrl: './design-demo.css',
  templateUrl: './design-demo.html',
})
export class DesignDemo {
  protected readonly pairs = PAIRS;
  protected readonly pairKey = signal(PAIRS[0].key);
  protected readonly split = signal(50);

  protected readonly pair = computed(
    () => PAIRS.find((item) => item.key === this.pairKey()) ?? PAIRS[0],
  );

  /** Обрезка левого (верхнего) слоя: видна его часть слева от границы. */
  protected readonly clipPath = computed(() => `inset(0 ${100 - this.split()}% 0 0)`);

  /** Текстовое описание значения ползунка для скринридера. */
  protected readonly valueText = computed(
    () =>
      `слева ${this.pair().leftName} — ${this.split()} процентов, ` +
      `справа ${this.pair().rightName}`,
  );

  private readonly frame = viewChild<ElementRef<HTMLElement>>('frame');
  private readonly handle = viewChild<ElementRef<HTMLElement>>('handle');
  private readonly destroyRef = inject(DestroyRef);
  private readonly readyPairs = new Set<string>();
  private fontRequest = 0;

  /** Идентификатор перетаскиваемого указателя; null — ползунок свободен. */
  private pointerId: number | null = null;
  /** Положение границы на момент pointerdown — его возвращаем при pointercancel. */
  private splitAtDown = 50;
  /** Точка, где палец (или мышь) коснулся рамки. */
  private downX = 0;
  private downY = 0;
  /**
   * Жест признан горизонтальным и передан ползунку. Для мыши и пера — сразу,
   * для касания — только после того, как движение оказалось преимущественно
   * горизонтальным: до этого момента жест остаётся за браузером.
   */
  private engaged = false;
  /** Указатель заметно сместился — значит это не чистое касание. */
  private moved = false;

  constructor() {
    afterNextRender(() => {
      const onActivated = () => void this.preparePair(this.pairKey());
      document.addEventListener('concept-fonts-activated', onActivated);
      this.destroyRef.onDestroy(() =>
        document.removeEventListener('concept-fonts-activated', onActivated),
      );
      if (document.getElementById('concept-fonts')?.getAttribute('media') === 'all') {
        onActivated();
      }
    });
    this.destroyRef.onDestroy(() => {
      this.pointerId = null;
      this.fontRequest++;
    });
  }

  /** Смена пары: положение границы предсказуемо возвращается в центр. */
  protected selectPair(key: string): void {
    if (this.pairKey() === key) return;
    if (this.readyPairs.has(key) || !document.getElementById('concept-fonts')) {
      this.showPair(key);
      return;
    }
    void this.preparePair(key);
  }

  private showPair(key: string): void {
    this.pairKey.set(key);
    this.splitAtDown = 50;
    this.split.set(50);
  }

  private async preparePair(key: string): Promise<void> {
    const request = ++this.fontRequest;
    const sheet = document.getElementById('concept-fonts') as HTMLLinkElement | null;
    if (!sheet) return;
    if (sheet.media !== 'all') sheet.media = 'all';

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const loaded = await Promise.race([
      (async () => {
        if (!sheet.sheet) {
          await new Promise<void>((resolve) => sheet.addEventListener('load', () => resolve(), { once: true }));
        }
        if (!document.fonts?.load) return false;
        await Promise.all(PAIR_FONTS[key].map(([face, text]) => document.fonts.load(face, text)));
        return true;
      })().catch(() => false),
      new Promise<false>((resolve) => { timeout = setTimeout(() => resolve(false), 4000); }),
    ]);
    clearTimeout(timeout);
    if (request !== this.fontRequest) return;

    // A failed/slow font never swaps under a visible mockup later in the visit.
    document.documentElement.classList.toggle('concept-fonts-fallback', !loaded);
    document.documentElement.classList.remove('concept-fonts-pending');
    if (loaded) this.readyPairs.add(key);
    if (this.pairKey() !== key) this.showPair(key);
  }

  /**
   * Касание: НЕ отменяем событие и НЕ берём жест себе. Раньше здесь стоял
   * `preventDefault()`, и вертикальный свайп по рамке вообще не прокручивал
   * страницу: отмена на pointerdown отбирает у браузера начало жеста
   * прокрутки. Замерено — свайп на 150 px давал 0 px прокрутки, тогда как по
   * нейтральному месту те же 150 px давали 256 px. Сейчас жест остаётся
   * браузеру, а ползунок подхватывает его позже и только по горизонтали.
   */
  protected onFramePointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (this.pointerId !== null) return;

    const frame = this.frameElement();
    if (!frame) return;

    this.pointerId = event.pointerId;
    this.splitAtDown = this.split();
    this.downX = event.clientX;
    this.downY = event.clientY;
    this.moved = false;

    if (event.pointerType === 'touch') {
      // Ждём подтверждения намерения — см. onFramePointerMove.
      this.engaged = false;
    } else {
      // Мышь и перо двигают границу сразу: горизонтальной прокрутки тут нет,
      // а ждать движения незачем.
      this.engaged = true;
      this.capture(event.pointerId);
      this.moveTo(event.clientX);
    }

    const target = event.target;
    if (target instanceof Element && target.closest('.cmp__handle')) {
      this.handleElement()?.focus({ preventScroll: true });
    }
  }

  protected onFramePointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;

    const dx = event.clientX - this.downX;
    const dy = event.clientY - this.downY;
    if (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) this.moved = true;

    if (!this.engaged) {
      // Пока не признано, что это горизонтальный drag: не вмешиваемся ни во
      // что. Диагональ и вертикаль — прокрутка страницы.
      if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
      this.engaged = true;
      this.capture(event.pointerId);
    }

    this.moveTo(event.clientX);
  }

  protected onFramePointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;
    // Касание без заметного смещения — граница встаёт под пальцем. Этот жест
    // не начал ничего скроллить, поэтому отдавать его некому.
    if (!this.engaged && !this.moved) this.moveTo(event.clientX);
    this.endDrag(event.pointerId, false);
  }

  /**
   * Указатель отменён браузером — он забрал жест себе (например, пошла
   * прокрутка страницы). Только это и означает отмену.
   *
   * Сюда же раньше был привязан lostpointercapture, и это ломало перетаскивание:
   * событие приходит при ЛЮБОЙ смене владельца захвата, в том числе когда
   * захват переходит к рамке по ходу жеста и когда мы снимаем его сами. Каждая
   * такая смена трактовалась как отмена, граница возвращалась на место, а
   * указатель переставал отслеживаться — ползунок не двигался вообще.
   */
  protected onFramePointerCancel(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;
    this.endDrag(event.pointerId, true);
  }

  /** Внутренние картинки и арты не должны уноситься нативным drag-and-drop. */
  protected onDragStart(event: DragEvent): void {
    event.preventDefault();
  }

  /** Клавиатура: стрелки ±2 %, Shift+стрелки ±10 %, PageUp/PageDown ±10 %, Home/End. */
  protected onHandleKeydown(event: KeyboardEvent): void {
    const step = event.shiftKey ? 10 : 2;
    let next: number | null = null;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next = this.split() - step;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        next = this.split() + step;
        break;
      case 'PageDown':
        next = this.split() - 10;
        break;
      case 'PageUp':
        next = this.split() + 10;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = 100;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.setSplit(next);
  }

  private endDrag(pointerId: number, restore: boolean): void {
    this.pointerId = null;
    this.engaged = false;
    this.moved = false;

    const frame = this.frameElement();
    if (frame?.hasPointerCapture(pointerId)) {
      try {
        frame.releasePointerCapture(pointerId);
      } catch {
        /* Захват уже мог быть снят браузером. */
      }
    }

    // Граница, поставленная касанием «по дороге» к прокрутке, не должна
    // остаться — но при отмене мы её и не сдвигали, так что это страховка.
    if (restore) this.split.set(this.splitAtDown);
  }

  /**
   * Захват указателя — только когда жест уже наш. Раньше он брался сразу на
   * pointerdown, и палец, начавший прокрутку, оставался «нашим» до конца.
   */
  private capture(pointerId: number): void {
    const frame = this.frameElement();
    if (!frame) return;
    try {
      frame.setPointerCapture(pointerId);
    } catch {
      /* Захват может быть недоступен — события всё равно всплывают до рамки. */
    }
  }

  private moveTo(clientX: number): void {
    const frame = this.frameElement();
    if (!frame) return;

    const rect = frame.getBoundingClientRect();
    if (rect.width <= 0) return;

    this.setSplit(((clientX - rect.left) / rect.width) * 100);
  }

  private setSplit(value: number): void {
    const clamped = Math.min(100, Math.max(0, Math.round(value)));
    if (clamped === this.split()) return;
    this.split.set(clamped);
  }

  private frameElement(): HTMLElement | null {
    return this.frame()?.nativeElement ?? null;
  }

  private handleElement(): HTMLElement | null {
    return this.handle()?.nativeElement ?? null;
  }
}
