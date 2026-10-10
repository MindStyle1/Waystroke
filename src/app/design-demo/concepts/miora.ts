import { Component } from '@angular/core';

interface Product {
  name: string;
  note: string;
  price: string;
}

/**
 * Концепт «miora» — косметика: пыльная роза, предметная фотография,
 * янтарная упаковка и спокойная сетка продуктов.
 */
@Component({
  selector: 'app-concept-miora',
  styleUrl: './miora.css',
  templateUrl: './miora.html',
})
export class Miora {
  protected readonly products: Product[] = [
    { name: 'Сыворотка «Тишина»', note: '30 мл · витамин C', price: '2 400 ₽' },
    { name: 'Крем «Утро»', note: '50 мл · SPF 15', price: '1 900 ₽' },
    { name: 'Масло «Вечер»', note: '20 мл · ночной уход', price: '2 100 ₽' },
  ];
}
