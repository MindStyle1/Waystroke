import { Component } from '@angular/core';

interface Operation {
  initial: string;
  name: string;
  category: string;
  amount: string;
  income: boolean;
}

interface Goal {
  name: string;
  value: string;
  percent: number;
}

interface Slice {
  name: string;
  share: number;
  color: string;
}

/** Собирает доли категорий в фон кольцевой диаграммы. */
function buildDonut(slices: Slice[]): string {
  let from = 0;
  const stops = slices.map((item) => {
    const start = from;
    from += item.share;
    return `${item.color} ${start}% ${from}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

/**
 * Концепт «saldo» — финансовое приложение: светлый дашборд с левой панелью,
 * карточками баланса, банковской картой, кольцевой диаграммой расходов,
 * операциями и целями. Все магазины и суммы вымышлены.
 */
@Component({
  selector: 'app-concept-saldo',
  styleUrl: './saldo.css',
  templateUrl: './saldo.html',
})
export class Saldo {
  protected readonly operations: Operation[] = [
    { initial: 'В', name: 'ВкусЛавка', category: 'Продукты', amount: '−1 240 ₽', income: false },
    { initial: 'К', name: 'Кофейня «Пена»', category: 'Кафе', amount: '−320 ₽', income: false },
    { initial: 'Г', name: 'ГорТранс', category: 'Транспорт', amount: '−590 ₽', income: false },
    { initial: 'М', name: 'Маркет и Ко', category: 'Покупки', amount: '−3 190 ₽', income: false },
    { initial: 'Ф', name: 'Фриланс-проект', category: 'Доход', amount: '+18 000 ₽', income: true },
  ];

  protected readonly goals: Goal[] = [
    { name: 'Отпуск в горах', value: '72 000 ₽ из 120 000 ₽', percent: 60 },
    { name: 'Новый ноутбук', value: '31 500 ₽ из 90 000 ₽', percent: 35 },
    { name: 'Подушка безопасности', value: '195 000 ₽ из 250 000 ₽', percent: 78 },
  ];

  protected readonly legend: Slice[] = [
    { name: 'Продукты', share: 34, color: '#2b59ff' },
    { name: 'Кафе и рестораны', share: 22, color: '#6b8bff' },
    { name: 'Покупки', share: 18, color: '#2fb7a5' },
    { name: 'Транспорт', share: 16, color: '#a9bcff' },
    { name: 'Прочее', share: 10, color: '#ccd6ea' },
  ];

  protected readonly donutGradient: string = buildDonut(this.legend);
}
