import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { initConversions } from './tracking';

/**
 * Проверяем главное: событие уходит только по контактным ссылкам и кнопкам
 * CTA, навигация при этом остаётся нетронутой, а разрушение компонента
 * действительно отписывает обработчик.
 */
describe('initConversions', () => {
  let sent: { event: string; source: string }[];
  let request: Mock<typeof fetch>;
  let host: HTMLElement;

  beforeEach(() => {
    sent = [];
    request = vi.fn(async (_url, init) => {
      sent.push(JSON.parse(init?.body as string) as { event: string; source: string });
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', request);

    host = document.createElement('div');
    host.innerHTML = `
      <header><a id="tg" href="https://t.me/waystroke" target="_blank" rel="noopener noreferrer">Telegram</a></header>
      <main>
        <section data-section="hero">
          <button id="hero-cta" data-track="cta_click">Обсудить проект</button>
        </section>
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
    vi.unstubAllGlobals();
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
    expect(request).toHaveBeenCalledExactlyOnceWith('https://track.waystroke.online/api/track', {
      method: 'POST', mode: 'cors', credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'telegram_click', source: 'header' }), keepalive: true,
    });
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

  // Главная кнопка первого экрана — самая частая конверсия, и раньше её
  // источник приходил в D1 как «unknown»: секция шла без data-section.
  it('узнаёт источник главной кнопки по секции первого экрана', async () => {
    initConversions(host);
    click('hero-cta');
    await Promise.resolve();
    expect(sent).toEqual([{ event: 'cta_click', source: 'hero' }]);
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
    expect(request).not.toHaveBeenCalled();
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
    expect(request).not.toHaveBeenCalled();
  });
  it('не повторяет запрос при сетевой ошибке или HTTP 500', async () => {
    initConversions(host);
    request.mockRejectedValueOnce(new TypeError('Network error'));
    click('hero-cta');
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(1);
    request.mockResolvedValueOnce(new Response(null, { status: 500 }));
    click('cal');
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(2);
  });

});
