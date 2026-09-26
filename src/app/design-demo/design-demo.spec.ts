import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DesignDemo } from './design-demo';

/**
 * Жесты ползунка сравнения.
 *
 * Проверяем ровно то, что однажды стоило скроллу: касание обязано остаться
 * браузеру, пока движение не признано горизонтальным. Замер на телефоне
 * показал, что отмена pointerdown отбирала у браузера начало жеста —
 * свайп на 150 px прокручивал страницу на 0 px, и содержимое дёргалось, пока
 * палец шёл по блоку сравнения.
 *
 * События идут прямо в разметку компонента, а не в его методы: так проверка
 * заодно ловит ошибки привязки в шаблоне.
 */
describe('DesignDemo — управление границей сравнения', () => {
  /** Рамка 300 px шириной: 100 % приходится ровно на 3 px. */
  const FRAME_WIDTH = 300;

  let fixture: ComponentFixture<DesignDemo>;
  let frame: HTMLElement;
  let captured: Set<number>;
  let setPointerCapture: ReturnType<typeof vi.fn>;

  /** Положение границы в том виде, в каком его видит assistive technology. */
  const split = (): number =>
    Number(
      (fixture.nativeElement as HTMLElement)
        .querySelector('.cmp__handle')
        ?.getAttribute('aria-valuenow'),
    );

  const pointer = (
    type: string,
    x: number,
    y: number,
    options: { id?: number; pointerType?: string; button?: number } = {},
  ): PointerEvent => {
    const event = new PointerEvent(type, {
      pointerId: options.id ?? 1,
      pointerType: options.pointerType ?? 'touch',
      clientX: x,
      clientY: y,
      button: options.button ?? 0,
      bubbles: true,
      cancelable: true,
      isPrimary: true,
    });
    frame.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DesignDemo] }).compileComponents();

    fixture = TestBed.createComponent(DesignDemo);
    await fixture.whenStable();
    fixture.detectChanges();

    frame = (fixture.nativeElement as HTMLElement).querySelector('.cmp__frame') as HTMLElement;

    // jsdom не реализует геометрию и захват указателя — задаём и то и другое.
    frame.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: FRAME_WIDTH, height: 1000 }) as DOMRect;

    captured = new Set();
    setPointerCapture = vi.fn((id: number) => {
      captured.add(id);
    });
    Object.assign(frame, {
      setPointerCapture,
      releasePointerCapture: vi.fn((id: number) => {
        captured.delete(id);
      }),
      hasPointerCapture: (id: number) => captured.has(id),
    });
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('касание', () => {
    it('вертикальное движение не двигает границу и не отменяет жест', () => {
      const down = pointer('pointerdown', 150, 400);

      pointer('pointermove', 150, 300); // dy = −100, dx = 0
      pointer('pointermove', 150, 200);
      pointer('pointerup', 150, 200);

      // Жест остаётся браузеру: ни отмены, ни захвата.
      expect(down.defaultPrevented).toBe(false);
      expect(setPointerCapture).not.toHaveBeenCalled();
      expect(split()).toBe(50);
    });

    it('отменяет событие только на pointerdown, а не позже', () => {
      const down = pointer('pointerdown', 150, 400);
      const move = pointer('pointermove', 150, 300);
      const up = pointer('pointerup', 150, 300);

      expect(down.defaultPrevented).toBe(false);
      expect(move.defaultPrevented).toBe(false);
      expect(up.defaultPrevented).toBe(false);
    });

    it('горизонтальное движение перехватывает жест и двигает границу', () => {
      pointer('pointerdown', 150, 400);
      const move = pointer('pointermove', 210, 400); // dx = +60, dy = 0

      // Ползунок получил управление — и только теперь.
      expect(setPointerCapture).toHaveBeenCalledWith(1);
      expect(move.defaultPrevented).toBe(false);
      expect(split()).toBe(70);

      pointer('pointermove', 240, 400);
      expect(split()).toBe(80);
    });

    it('диагональ, где вертикаль преобладает, остаётся прокруткой', () => {
      pointer('pointerdown', 150, 400);
      pointer('pointermove', 170, 320); // dx = +20, dy = −80

      expect(setPointerCapture).not.toHaveBeenCalled();
      expect(split()).toBe(50);
    });

    it('горизонтальное движение важнее вертикального при явном перевесе', () => {
      pointer('pointerdown', 150, 400);
      pointer('pointermove', 170, 390); // dx = +20, dy = −10

      expect(setPointerCapture).toHaveBeenCalledWith(1);
      expect(split()).toBe(57); // 170 / 300
    });

    it('дрожание пальца ниже порога не считается перетаскиванием', () => {
      pointer('pointerdown', 150, 400);
      pointer('pointermove', 156, 400); // dx = +6, порог 8

      expect(setPointerCapture).not.toHaveBeenCalled();
      expect(split()).toBe(50);
    });

    it('чистое касание без перемещения ставит границу под пальцем', () => {
      pointer('pointerdown', 240, 400);
      expect(split()).toBe(50);

      pointer('pointerup', 240, 400);
      expect(split()).toBe(80);
    });

    it('отмена браузера возвращает границу на место', () => {
      pointer('pointerdown', 150, 400);
      pointer('pointermove', 210, 400);
      expect(split()).toBe(70);

      pointer('pointercancel', 210, 400);
      expect(split()).toBe(50);
    });

    it('смена владельца захвата не считается отменой', () => {
      pointer('pointerdown', 150, 400);
      pointer('pointermove', 210, 400);
      expect(split()).toBe(70);

      // Захват может перейти к другому элементу прямо во время жеста. Это
      // не отмена: раньше здесь граница возвращалась на 50 и ползунок
      // переставал двигаться совсем.
      frame.dispatchEvent(
        new PointerEvent('lostpointercapture', { pointerId: 1, bubbles: false }),
      );
      fixture.detectChanges();

      expect(split()).toBe(70);
      pointer('pointermove', 240, 400);
      expect(split()).toBe(80);
    });
  });

  describe('мышь', () => {
    it('двигает границу сразу, без порога и ожидания', () => {
      const down = pointer('pointerdown', 150, 400, { pointerType: 'mouse' });

      // Никакого порога: граница встала под курсором уже на нажатии.
      expect(setPointerCapture).toHaveBeenCalledWith(1);
      expect(down.defaultPrevented).toBe(false);
      expect(split()).toBe(50);

      pointer('pointermove', 90, 400, { pointerType: 'mouse' });
      expect(split()).toBe(30);
    });

    it('ставит границу по клику без перемещения', () => {
      pointer('pointerdown', 210, 400, { pointerType: 'mouse' });

      expect(split()).toBe(70);
    });

    it('не реагирует на правую кнопку мыши', () => {
      pointer('pointerdown', 210, 400, { pointerType: 'mouse', button: 2 });

      expect(setPointerCapture).not.toHaveBeenCalled();
      expect(split()).toBe(50);
    });
  });
});
