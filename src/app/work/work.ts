import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PROJECTS, type CaseStudy } from './work.data';

/**
 * Секция «Кейсы».
 *
 * Список пуст, пока нет публичных клиентских проектов, — тогда показывается
 * честная короткая строка вместо пустых карточек. Стоит добавить запись в
 * `PROJECTS`, и секция наполнится сама.
 */
@Component({
  selector: 'app-work',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './work.css',
  templateUrl: './work.html',
})
export class Work {
  protected readonly projects: readonly CaseStudy[] = PROJECTS;
}
