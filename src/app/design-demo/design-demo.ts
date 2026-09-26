import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { SiteMock, type DesignStyle } from './site-mock';

/** Авторские варианты: сравниваются всегда с базовым корпоративным. */
export type AuthorStyle = Exclude<DesignStyle, 'base'>;

interface StyleOption {
  key: AuthorStyle;
  label: string;
}

const OPTIONS: StyleOption[] = [
  { key: 'editorial', label: 'Редакционный' },
  { key: 'brutal', label: 'Брутализм' },
  { key: 'dark', label: 'Минимализм' },
];

/**
 * Секция «Одна идея. Два впечатления».
 *
 * Два слоя лежат в одной сетке (обе ячейки — 1/1), поэтому контейнер
 * принимает высоту большего слоя и оба варианта видны целиком: ползунок
 * не сжимает их в половинки, а открывает один поверх другого через обрезку.
 */
@Component({
  selector: 'app-design-demo',
  imports: [SiteMock],
  styleUrl: './design-demo.css',
  templateUrl: './design-demo.html',
})
export class DesignDemo {
  protected readonly options = OPTIONS;
  protected readonly selected = signal<AuthorStyle>('editorial');
  protected readonly split = signal(50);

  /** Обрезка базового слоя: видна его левая часть. */
  protected readonly clipPath = computed(() => `inset(0 ${100 - this.split()}% 0 0)`);

  protected readonly selectedLabel = computed(
    () => OPTIONS.find((option) => option.key === this.selected())?.label ?? '',
  );

  /** Текстовое описание значения ползунка для скринридера. */
  protected readonly valueText = computed(
    () => `слева ${this.split()} процентов базового варианта, справа — ${this.selectedLabel()}`,
  );

  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly handle = viewChild<ElementRef<HTMLElement>>('handle');
  private readonly destroyRef = inject(DestroyRef);

  /** Идентификатор перетаскиваемого указателя; null — ползунок свободен. */
  private pointerId: number | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.pointerId = null;
    });
  }

  protected select(key: AuthorStyle): void {
    this.selected.set(key);
  }

  /**
   * Начало перетаскивания. Мышь и перо ведут ползунок от любого места сцены,
   * касание — только от ручки: остальная площадь обязана пропускать вертикальный
   * скролл страницы.
   */
  protected onStagePointerDown(event: PointerEvent): void {
    const target = event.target as Element | null;
    const onHandle = !!target?.closest?.('.cmp__handle');
    const isTouch = event.pointerType === 'touch';

    if (isTouch && !onHandle) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (this.pointerId !== null) return;

    const stage = this.stage()?.nativeElement;
    if (!stage) return;

    this.pointerId = event.pointerId;
    try {
      stage.setPointerCapture(event.pointerId);
    } catch {
      /* Захват может быть недоступен — движение всё равно обработается. */
    }

    // Отмена стандартного поведения (выделение текста), но фокус ставим сами.
    event.preventDefault();
    if (onHandle) this.handle()?.nativeElement.focus();

    this.moveSplit(event.clientX);
  }

  protected onStagePointerMove(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;
    this.moveSplit(event.clientX);
  }

  protected onStagePointerUp(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;
    this.pointerId = null;

    const stage = this.stage()?.nativeElement;
    if (stage?.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }
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

  private moveSplit(clientX: number): void {
    const stage = this.stage()?.nativeElement;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0) return;

    this.setSplit(((clientX - rect.left) / rect.width) * 100);
  }

  private setSplit(value: number): void {
    const clamped = Math.min(100, Math.max(0, Math.round(value)));
    if (clamped === this.split()) return;
    this.split.set(clamped);
  }
}
