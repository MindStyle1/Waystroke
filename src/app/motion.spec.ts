import { initHeroPresence, initTeamScene } from './motion';

describe('ambient motion lifecycle', () => {
  it('pauses outside the viewport, in a hidden tab and for reduced motion, then cleans up', () => {
    const callbacks: IntersectionObserverCallback[] = [];
    const disconnect = vi.fn();
    class Observer {
      constructor(callback: IntersectionObserverCallback) {
        callbacks.push(callback);
      }
      observe = vi.fn();
      disconnect = disconnect;
    }
    const media = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal('IntersectionObserver', Observer);
    vi.stubGlobal('matchMedia', () => media);
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const host = document.createElement('div');
    host.innerHTML =
      '<section class="hero"></section><div data-tandem><div class="tandem__people"></div></div>';
    const tandem = host.querySelector('[data-tandem]')!;
    const hero = host.querySelector('.hero')!;
    const disposeTeam = initTeamScene(host);
    const disposeHero = initHeroPresence(host);
    const emit = (visible: boolean): void => {
      callbacks.forEach((callback) =>
        callback(
          [{ isIntersecting: visible } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        ),
      );
    };
    try {
      emit(true);
      expect(tandem.classList.contains('is-alive')).toBe(true);
      expect(hero.classList.contains('is-active')).toBe(true);
      emit(false);
      expect(tandem.classList.contains('is-alive')).toBe(false);
      emit(true);
      hidden.mockReturnValue(true);
      document.dispatchEvent(new Event('visibilitychange'));
      expect(tandem.classList.contains('is-alive')).toBe(false);
      hidden.mockReturnValue(false);
      document.dispatchEvent(new Event('visibilitychange'));
      expect(tandem.classList.contains('is-alive')).toBe(true);
      media.matches = true;
      media.dispatchEvent(new Event('change'));
      expect(tandem.classList.contains('is-alive')).toBe(false);
      media.matches = false;
      media.dispatchEvent(new Event('change'));
      expect(tandem.classList.contains('is-alive')).toBe(true);
      disposeTeam();
      disposeHero();
      expect(disconnect).toHaveBeenCalledTimes(2);
      document.dispatchEvent(new Event('visibilitychange'));
      media.dispatchEvent(new Event('change'));
      expect(tandem.classList.contains('is-alive')).toBe(false);
      expect(hero.classList.contains('is-active')).toBe(false);
    } finally {
      disposeTeam();
      disposeHero();
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });
});
