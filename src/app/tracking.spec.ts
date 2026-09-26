import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { initConversions } from './tracking';

/**
 * Проверяем главное: событие уходит только по контактным ссылкам и кнопкам
 * CTA, навигация при этом остаётся нетронутой, а разрушение компонента
 * действительно отписывает обработчик.
 */
describe('initConversions', () => {
  let sent: { event: string; source: string }[];
  let beacon: Mock<(url: string | URL, data?: BodyInit | null) => boolean>;
  let host: HTMLElement;

  beforeEach(() => {
    sent = [];
    beacon = vi.fn((_url: string | URL, data?: BodyInit | null) => {
      void (data as Blob).text().then((text) => {
        sent.push(JSON.parse(text) as { event: string; source: string });
      });
      return true;
    });
    // jsdom не реализует sendBeacon, поэтому объявляем его сами.
    Object.defineProperty(navigator, 'sendBeacon', {
      value: beacon,
      configurable: true,
      writable: true,
    });

    host = document.createElement('div');
    host.innerHTML = `
      <header><a id="tg" href="https://t.me/waystroke" target="_blank" rel="noopener noreferrer">Telegram</a></header>
      <main>
        <section data-section="contact">
          <a id="cal" href="https://cal.com/mind-style-00/waystroke-call">Записаться</a>
          <a id="calwww" href="https://www.cal.com/mind-style-00/waystroke-call">Записаться</a>
          <a id="anchor" href="#services">Услуги</a>
          <button id="cta" data-track="cta_click">Обсудить</button>
          <button id="nav" data-scroll-to="contact">Контакты</button>
          <a id="http" href="http://cal.com/insecure">Неsecure</a>
        </section>
      </main>
      <footer><a id="tgf" href="https://t.me/waystroke">Telegram</a></footer>
    `;
    document.body.append(host);
  });

  afterEach(() => {
    host?.remove();
    Reflect.deleteProperty(navigator, 'sendBeacon');
  });

  /**
   * Кликаем по элементу настоящим `click()`, но на время синхронного вызова
   * гасим переход: jsdom всё равно не умеет уходить на внешний документ,
   * а счётчик мы проверяем отдельно от поведения ссылки.
   */
  const click = (id: string): void => {
    const element = host.querySelector<HTMLElement>(`#${id}`);
    if (!element) return;
    element.addEventListener('click', (event) => event.preventDefault());
    element.click();
  };

  it('отправляет telegram_click по ссылке в шапке', async () => {
    initConversions(host);
    click('tg');
    await Promise.resolve();
    expect(beacon).toHaveBeenCalledWith('/api/track', expect.any(Blob));
    expect(sent).toEqual([{ event: 'telegram_click', source: 'header' }]);
  });

  it('отправляет telegram_click из подвала с источником footer', async () => {
    initConversions(host);
    click('tgf');
    await Promise.resolve();
    expect(sent).toEqual([{ event: 'telegram_click', source: 'footer' }]);
  });

  it('отправляет calcom_click и берёт секцию из разметки', async () => {
    initConversions(host);
    click('cal');
    await Promise.resolve();
    expect(sent).toEqual([{ event: 'calcom_click', source: 'contact' }]);
  });

  it('узнаёт cal.com и с www', async () => {
    initConversions(host);
    click('calwww');
    await Promise.resolve();
    expect(sent[0].event).toBe('calcom_click');
  });

  it('считает кнопку CTA', async () => {
    initConversions(host);
    click('cta');
    await Promise.resolve();
    expect(sent).toEqual([{ event: 'cta_click', source: 'contact' }]);
  });

  it('не считает навигацию, якорь, http-ссылку и подделанный атрибут', async () => {
    initConversions(host);
    click('nav');
    click('anchor');
    click('http');
    host.querySelector<HTMLElement>('a#anchor')?.setAttribute('data-track', 'hack');
    click('anchor');
    await Promise.resolve();
    expect(sent).toEqual([]);
    expect(beacon).not.toHaveBeenCalled();
  });

  it('не мешает переходу: обработчик не отменяет событие по умолчанию', () => {
    initConversions(host);
    const link = host.querySelector<HTMLAnchorElement>('#tg');
    expect(link?.getAttribute('target')).toBe('_blank');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('перестаёт считать после разрушения', async () => {
    const dispose = initConversions(host);
    dispose();
    click('tg');
    await Promise.resolve();
    expect(beacon).not.toHaveBeenCalled();
  });
});
