import { Component } from '@angular/core';

interface Release {
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
    { title: 'Ночной трамвай', meta: 'EP · 6 треков' },
    { title: 'Кислотный хор', meta: 'Сингл · ротация' },
    { title: 'Контур', meta: 'LP · винил 12″' },
  ];
}
