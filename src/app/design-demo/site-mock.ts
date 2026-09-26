import { Component, computed, input } from '@angular/core';

/**
 * Четыре подачи одного и того же демонстрационного сайта архитектурного бюро.
 *
 * Разметка, тексты и структура общие для всех вариантов — меняются только
 * типографика, композиция, масштаб, место навигации и работа с фотографией.
 * Поэтому компонент принимает лишь `variant`, а весь контраст создёт CSS.
 */
export type DesignStyle = 'base' | 'editorial' | 'brutal' | 'dark';

/** Фотографии — отдельные оптимизированные ресурсы (WebP, CC0). */
const PHOTOS: Record<DesignStyle, { src: string; alt: string; width: number; height: number }> = {
  base: {
    src: 'images/studio-house.webp',
    alt: 'Современный белый дом с террасой и бассейном',
    width: 1280,
    height: 960,
  },
  editorial: {
    src: 'images/studio-house.webp',
    alt: 'Современный белый дом с террасой и бассейном',
    width: 1280,
    height: 960,
  },
  brutal: {
    src: 'images/studio-concrete.webp',
    alt: 'Бетонная плоскость с контрастной тенью',
    width: 1280,
    height: 640,
  },
  dark: {
    src: 'images/studio-concrete.webp',
    alt: 'Бетонная плоскость с контрастной тенью',
    width: 1280,
    height: 640,
  },
};

interface Service {
  num: string;
  title: string;
  text: string;
}

const SERVICES: Service[] = [
  { num: '01', title: 'Архитектура', text: 'Индивидуальные архитектурные решения для жизни.' },
  { num: '02', title: 'Интерьер', text: 'Продуманные интерьеры с вниманием к деталям.' },
  { num: '03', title: 'Сопровождение', text: 'Полный цикл — от идеи до реализации проекта.' },
];

@Component({
  selector: 'app-site-mock',
  styleUrl: './site-mock.css',
  templateUrl: './site-mock.html',
})
export class SiteMock {
  /** Какой из четырёх стилей рисуется. */
  readonly variant = input.required<DesignStyle>();

  protected readonly photo = computed(() => PHOTOS[this.variant()]);
  protected readonly services = SERVICES;
}
