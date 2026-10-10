import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DesignDemo } from './design-demo';
describe('Concept gallery', () => {
  let fixture: ComponentFixture<DesignDemo>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DesignDemo] }).compileComponents();
    fixture = TestBed.createComponent(DesignDemo);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    });
  });
  afterEach(() => {
    fixture.destroy();
    document.body.classList.remove('work-open');
  });
  it('offers six independently named concepts without a comparison slider', () => {
    expect(fixture.nativeElement.querySelectorAll('button.work')).toHaveLength(6);
    expect(fixture.nativeElement.querySelector('[role=slider]')).toBeNull();
    expect(fixture.nativeElement.querySelector('button.work').getAttribute('aria-label')).toContain(
      'СДВИГ',
    );
  });
  it('opens the selected concept in a native modal and restores focus on close', () => {
    const button = fixture.nativeElement.querySelectorAll('button.work')[1] as HTMLButtonElement;
    const focus = vi.spyOn(button, 'focus');
    button.click();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.showModal).toHaveBeenCalled();
    expect(dialog.querySelector('#work-title')?.textContent).toBe('miora');
    expect(document.body.classList.contains('work-open')).toBe(true);
    (dialog.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(document.body.classList.contains('work-open')).toBe(false);
    expect(focus).toHaveBeenCalled();
  });
  it('native Escape close releases the page scroll lock', () => {
    (fixture.nativeElement.querySelector('button.work') as HTMLButtonElement).click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('dialog').dispatchEvent(new Event('close'));
    expect(document.body.classList.contains('work-open')).toBe(false);
  });
});
