import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
  signal,
} from '@angular/core';
import { SiteMock, type Concept } from './site-mock';
import { galleryCopy, type SiteLanguage } from '../translations';

interface Work {
  key: Concept;
  name: string;
  niche: string;
  nicheEn: string;
  direction: string;
  directionEn: string;
}
@Component({
  selector: 'app-design-demo',
  imports: [SiteMock],
  templateUrl: './design-demo.html',
  styleUrl: './design-demo.css',
})
export class DesignDemo {
  readonly language = input<SiteLanguage>('ru');
  protected readonly copy = computed(() => galleryCopy[this.language()]);
  protected readonly works: Work[] = [
    {
      key: 'sdvig',
      name: 'СДВИГ',
      niche: 'Музыкальный лейбл',
      nicheEn: 'Music label',
      direction: 'Типографика как звук. Контраст, ритм и винил.',
      directionEn: 'Typography as sound: contrast, rhythm and vinyl.',
    },
    {
      key: 'miora',
      name: 'miora',
      niche: 'Уход за кожей',
      nicheEn: 'Skincare',
      direction: 'Предметная композиция. Спокойный цвет и внимание к упаковке.',
      directionEn: 'Product-focused composition, calm colours and thoughtful packaging.',
    },
    {
      key: 'moto',
      name: 'ТОЧКА МОТОР',
      niche: 'Автомастерская',
      nicheEn: 'Auto repair shop',
      direction: 'Техническая иллюстрация, инженерная сетка и спокойная типографика.',
      directionEn: 'Technical illustration, an engineered grid and restrained typography.',
    },
    {
      key: 'kroshka',
      name: 'крошка',
      niche: 'Кофейня',
      nicheEn: 'Coffee shop',
      direction: 'Меню на первом плане. Тёплая бумага, красный и живая антиква.',
      directionEn: 'A menu-led design with warm paper, red accents and expressive serif type.',
    },
    {
      key: 'exhibit',
      name: 'ВНЕ РАМКИ',
      niche: 'Выставка искусства',
      nicheEn: 'Art exhibition',
      direction: 'Сайт как афиша. Большая типографика и кураторская сетка.',
      directionEn: 'A website conceived as a poster, with bold type and a curatorial grid.',
    },
    {
      key: 'saldo',
      name: 'saldo',
      niche: 'Личные финансы',
      nicheEn: 'Personal finance',
      direction: 'Финансовое пространство: баланс, движение средств и личные планы.',
      directionEn: 'A space for balances, transactions and personal plans.',
    },
  ];
  protected readonly selected = signal<Work | null>(null);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroy = inject(DestroyRef);
  private observer: ResizeObserver | null = null;
  private opener: HTMLElement | null = null;
  private closing: Animation | null = null;
  constructor() {
    afterNextRender(() => {
      this.observer = new ResizeObserver((entries) =>
        entries.forEach((entry) => {
          const canvas = entry.target.querySelector<HTMLElement>('.work__canvas');
          if (canvas) canvas.style.transform = `scale(${entry.contentRect.width / 1000})`;
        }),
      );
      this.host.nativeElement
        .querySelectorAll('.work__scene')
        .forEach((el) => this.observer?.observe(el));
    });
    this.destroy.onDestroy(() => {
      this.observer?.disconnect();
      this.closing?.cancel();
      this.unlock();
    });
  }
  protected open(work: Work, dialog: HTMLDialogElement, event: Event) {
    this.opener = event.currentTarget as HTMLElement;
    this.selected.set(work);
    dialog.showModal();
    afterNextRender(() => dialog.querySelector<HTMLButtonElement>('button')?.focus(), {
      injector: this.injector,
    });
    document.body.classList.add('work-open');
    window.dispatchEvent(new CustomEvent('waystroke:gallery-toggle', { detail: true }));
  }
  protected close(dialog: HTMLDialogElement) {
    if (this.closing) return;
    if (
      typeof dialog.animate !== 'function' ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      dialog.close();
      return;
    }
    this.closing = dialog.animate(
      [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(16px)' },
      ],
      { duration: 240, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' },
    );
    void this.closing.finished.then(() => dialog.close()).catch(() => {});
  }
  protected onCancel(event: Event, dialog: HTMLDialogElement) {
    event.preventDefault();
    this.close(dialog);
  }
  protected onClose() {
    this.closing?.cancel();
    this.closing = null;
    this.unlock();
    this.opener?.focus({ preventScroll: true });
    this.selected.set(null);
  }
  protected backdrop(event: MouseEvent, dialog: HTMLDialogElement) {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      this.close(dialog);
  }
  private unlock() {
    if (typeof document === 'undefined') return;
    document.body.classList.remove('work-open');
    window.dispatchEvent(new CustomEvent('waystroke:gallery-toggle', { detail: false }));
  }
}
