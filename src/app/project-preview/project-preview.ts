import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Concept } from '../../data/projects';

/**
 * Превью концепта сайта внутри карточки работ.
 *
 * Это главный элемент карточки: маленькая, но собранная «страница» со своей
 * палитрой, типографикой и композицией — у каждого проекта свой концепт.
 * Рисуется декоративно: для скринридеров карточка целиком описывается
 * заголовком и описанием, поэтому у превью одна метка-описание.
 */
@Component({
  selector: 'app-project-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-preview.html',
  styleUrl: './project-preview.css',
})
export class ProjectPreview {
  /** Какой концепт рисуем. */
  readonly concept = input.required<Concept>();
  /** Название проекта — попадает в описание для скринридера. */
  readonly title = input.required<string>();
}
