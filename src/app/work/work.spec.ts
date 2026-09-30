import { TestBed } from '@angular/core/testing';
import { Work } from './work';
import { PROJECTS } from './work.data';

describe('Секция «Кейсы»', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Work],
    }).compileComponents();
  });

  const render = async (): Promise<HTMLElement> => {
    const fixture = TestBed.createComponent(Work);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('показывает заголовок секции', async () => {
    const host = await render();
    expect(host.querySelector('h2')?.textContent).toContain('Работы');
  });

  it('не рисует карточек, пока список кейсов пуст', async () => {
    const host = await render();
    expect(PROJECTS).toHaveLength(0);
    expect(host.querySelectorAll('.work__item')).toHaveLength(0);
    expect(host.querySelector('.work__note')?.textContent).toContain('не клиентские кейсы');
  });
});
