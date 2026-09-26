import {
  Component,
  DestroyRef,
  ElementRef,
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

/**
 * Секция «Разные задачи. Разный характер.»
 *
 * Три переключателя открывают по паре совершенно разных сайтов: слева — один
 * концепт, справа — другой. Оба лежат в одной сетке (ячейка 1/1), поэтому
 * контейнер принимает высоту большего слоя и оба видны целиком: ползунок не
 * сжимает их, а открывает один поверх другого через обрезку (`clip-path`).
 *
 * Управление — Pointer Events на рамке сравнения: нажатие в любом месте
 * области сразу ставит границу в эту точку и продолжает перетаскивание,
 * а захват указателя удерживает drag, даже когда курсор уходит за пределы блока.
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

  /** Идентификатор перетаскиваемого указателя; null — ползунок свободен. */
  private pointerId: number | null = null;
  /** Положение границы на момент pointerdown — его возвращаем при pointercancel. */
  private splitAtDown = 50;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.pointerId = null;
    });
  }

  /** Смена пары: положение границы предсказуемо возвращается в центр. */
  protected selectPair(key: string): void {
    if (this.pairKey() === key) return;
    this.pairKey.set(key);
    this.splitAtDown = 50;
    this.split.set(50);
  }

  protected onFramePointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (this.pointerId !== null) return;

    const frame = this.frameElement();
    if (!frame) return;

    this.pointerId = event.pointerId;
    this.splitAtDown = this.split();

    try {
      frame.setPointerCapture(event.pointerId);
    } catch {
      /* Захват может быть недоступен — события всё равно всплывают до рамки. */
    }

    // Мышь, перо и касание ведут себя одинаково: граница сразу встает под указателем.
    event.preventDefault();

    const target = event.target;
    if (target instanceof Element && target.closest('.cmp__handle')) {
      this.handleElement()?.focus({ preventScroll: true });
    }

    this.moveTo(event.clientX);
  }

  protected onFramePointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;
    this.moveTo(event.clientX);
  }

  protected onFramePointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.pointerId) return;
    this.endDrag(event.pointerId, false);
  }

  /** Указатель отменён браузером (например, начался скролл страницы). */
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

    const frame = this.frameElement();
    if (frame?.hasPointerCapture(pointerId)) {
      try {
        frame.releasePointerCapture(pointerId);
      } catch {
        /* Захват уже мог быть снят браузером. */
      }
    }

    // Граница, поставленная касанием «по дороге» к скроллу, не должна остаться.
    if (restore) this.split.set(this.splitAtDown);
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
