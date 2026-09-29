import { Component } from '@angular/core';

interface Section {
  title: string;
  text: string;
}

/**
 * Концепт «ВНЕ РАМКИ» — арт-выставка: бумажный фон, плотный чёрный гротеск
 * в две строки, синий акцент и геометрия, которая вылезает за рамку кадра.
 */
@Component({
  selector: 'app-concept-exhibit',
  styleUrl: './exhibit.css',
  templateUrl: './exhibit.html',
})
export class Exhibit {
  protected readonly sections: Section[] = [
    {
      title: 'Инсталляция',
      text: 'Двенадцать залов, где материал важнее сюжета.',
    },
    {
      title: 'Живопись',
      text: 'Сорок холстов новой волны — от абстракции до фотореализма.',
    },
    {
      title: 'Видео и звук',
      text: 'Три инсталляции в полный рост и ночной кинопоказ.',
    },
  ];
}
