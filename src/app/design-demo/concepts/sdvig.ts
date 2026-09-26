import { Component } from '@angular/core';

interface Release {
  num: string;
  title: string;
  meta: string;
}

/**
 * Концепт «СДВИГ» — независимый музыкальный лейбл.
 * Чёрный фон, кислотно-лаймовая типографика, хром и винил: вся графика
 * сделана на CSS/SVG, внешних картинок у концепта нет.
 */
@Component({
  selector: 'app-concept-sdvig',
  styleUrl: './sdvig.css',
  templateUrl: './sdvig.html',
})
export class Sdvig {
  protected readonly releases: Release[] = [
    { num: '01', title: 'Ночной трамвай', meta: 'EP · 6 треков' },
    { num: '02', title: 'Кислотный хор', meta: 'Сингл · ротация' },
    { num: '03', title: 'Контур', meta: 'LP · винил 12″' },
  ];
}
