import { initDisclosureMotion } from './disclosure-motion';

describe('FAQ disclosure motion', () => {
  it('keeps the panel open during collapse and reverses a rapid click', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const host = document.createElement('div');
    host.innerHTML =
      '<details class="faq__item"><summary>Вопрос</summary><div>Ответ</div></details>';
    const panel = host.querySelector('details')!;
    const summary = host.querySelector('summary')!;
    const animations: Array<{ cancel: ReturnType<typeof vi.fn>; onfinish: (() => void) | null }> =
      [];
    panel.animate = vi.fn(() => {
      const animation = { cancel: vi.fn(), onfinish: null as (() => void) | null };
      animations.push(animation);
      return animation as unknown as Animation;
    });
    const dispose = initDisclosureMotion(host);
    summary.click();
    expect(panel.open).toBe(true);
    animations[0].onfinish!();
    summary.click();
    expect(panel.open).toBe(true);
    expect(summary.getAttribute('aria-expanded')).toBe('false');
    summary.click();
    expect(animations[1].cancel).toHaveBeenCalled();
    animations[2].onfinish!();
    expect(panel.open).toBe(true);
    expect(summary.getAttribute('aria-expanded')).toBe('true');
    summary.click();
    animations[3].onfinish!();
    expect(panel.open).toBe(false);
    expect(panel.style.height).toBe('');
    dispose();
    expect(summary.hasAttribute('aria-expanded')).toBe(false);
    vi.unstubAllGlobals();
  });
});
