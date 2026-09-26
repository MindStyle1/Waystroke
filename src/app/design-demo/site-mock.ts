import { Component, input } from '@angular/core';
import { Sdvig } from './concepts/sdvig';
import { Miora } from './concepts/miora';
import { Moto } from './concepts/moto';
import { Kroshka } from './concepts/kroshka';
import { Saldo } from './concepts/saldo';
import { Exhibit } from './concepts/exhibit';

/**
 * Диспетчер демо-сайтов: выбирает концепт для одного из двух слоёв сравнения.
 *
 * Шесть концептов — шесть независимых брендов, ниш и визуальных характеров.
 * Каждый живёт в своём файле (разметка + стили), общий тут только контракт:
 * корень заполняет слой целиком, а размеры считает от контейнера `cqw`.
 */
export type Concept = 'sdvig' | 'miora' | 'moto' | 'kroshka' | 'saldo' | 'exhibit';

@Component({
  selector: 'app-site-mock',
  imports: [Sdvig, Miora, Moto, Kroshka, Saldo, Exhibit],
  styleUrl: './site-mock.css',
  templateUrl: './site-mock.html',
})
export class SiteMock {
  /** Какой из шести концептов рисуется. */
  readonly concept = input.required<Concept>();
}
