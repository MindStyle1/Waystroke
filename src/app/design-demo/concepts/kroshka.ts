import { Component } from '@angular/core';

interface MenuItem {
  name: string;
  note: string;
  price: string;
}

/**
 * Концепт «крошка» — кофейня: тёплые сливочные тона, антиква в заголовке,
 * фото слева и подача справа, внизу — горизонтальное меню дня с ценами.
 */
@Component({
  selector: 'app-concept-kroshka',
  styleUrl: './kroshka.css',
  templateUrl: './kroshka.html',
})
export class Kroshka {
  protected readonly menu: MenuItem[] = [
    { name: 'Капучино', note: '300 мл · фермерское молоко', price: '220 ₽' },
    { name: 'Раф на фундуке', note: '350 мл · сироп дома', price: '280 ₽' },
    { name: 'Фильтр дня', note: '250 мл · эфиопия Иргачеффе', price: '180 ₽' },
  ];
}
