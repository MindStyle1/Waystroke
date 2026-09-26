/**
 * Конверсионные события Waystroke.
 *
 * Cloudflare Web Analytics умеет только свои метрики посещений: отправить в
 * него своё событие нельзя (официальный FAQ — «Not yet»). Поэтому клики по
 * контактам считает отдельный Worker на `/api/track`, а отсюда уходит одно
 * короткое сообщение без cookie и без идентификаторов посетителя.
 *
 * Ссылка остаётся нетронутой: обработчик только слушает и ничего не
 * отменяет, поэтому переход по контакту не замедляется. Отправка не
 * задерживает уход со страницы — `sendBeacon` доводит запрос сам, а если он
 * недоступен, `fetch` с `keepalive`. Ошибки проглатываются: счётчик не
 * записался — это не повод показывать посетителю ошибку.
 */
import type { Dispose } from './motion';

type ConversionEvent = 'telegram_click' | 'calcom_click' | 'cta_click';

/** Событие по домену: куда ведёт ссылка. Сравнение идёт по суффиксу домена. */
const OUTBOUND: ReadonlyArray<readonly [string, ConversionEvent]> = [
  ['t.me', 'telegram_click'],
  ['cal.com', 'calcom_click'],
];

/** Значения, которые принимает Worker: всё остальное он отбрасывает. */
const ALLOWED: ReadonlyArray<string> = ['telegram_click', 'calcom_click', 'cta_click'];

const ENDPOINT = '/api/track';

const MAX_SOURCE = 48;

/**
 * Какое событие означает этот элемент.
 *
 * Два независимых источника: внешние контакты узнаются по домену — тогда
 * не нужно помечать каждую из семи ссылок в разметке, и новая не потеряется;
 * внутренние кнопки помечаются явно, потому что `data-scroll-to` стоит и у
 * навигации, а считать её конверсией нельзя.
 */
const eventFor = (element: HTMLElement): ConversionEvent | null => {
  const marked = element.getAttribute('data-track');

  if (marked !== null) return ALLOWED.includes(marked) ? (marked as ConversionEvent) : null;

  const href = element.getAttribute('href');
  if (!href) return null;

  let url: URL;
  try {
    url = new URL(href, window.location.origin);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const found = OUTBOUND.find(([domain]) => host === domain || host.endsWith(`.${domain}`));

  return found ? found[1] : null;
};

/**
 * Откуда пришёл клик. Секции уже размечены для навигации, поэтому отдельная
 * разметка не нужна: у шапки и подвала своих секций нет, им отдаём имена.
 */
const sourceFor = (element: HTMLElement): string => {
  const section = element.closest('[data-section]')?.getAttribute('data-section');
  if (section) return section.slice(0, MAX_SOURCE);
  if (element.closest('footer')) return 'footer';
  if (element.closest('header')) return 'header';
  return 'unknown';
};

const report = (name: ConversionEvent, element: HTMLElement): void => {
  const payload = new Blob([JSON.stringify({ event: name, source: sourceFor(element) })], {
    type: 'application/json',
  });

  // sendBeacon живёт своей очередью и уходит даже после ухода со страницы.
  if (navigator.sendBeacon?.(ENDPOINT, payload)) return;

  void fetch(ENDPOINT, { method: 'POST', body: payload, keepalive: true }).catch(() => {
    /* Событие не записалось — молча, посетителя это не касается. */
  });
};

/**
 * Один делегированный обработчик на весь хост: внешние ссылки и кнопки CTA
 * отмечаются в разметке по домену или атрибуту, поэтому разбирать каждый
 * клик по отдельности не нужно.
 */
export function initConversions(host: HTMLElement): Dispose {
  const onClick = (event: MouseEvent): void => {
    const origin = event.target;
    if (!(origin instanceof Element)) return;

    const element = origin.closest<HTMLElement>('a[href], [data-track]');
    if (!element || !host.contains(element)) return;

    const name = eventFor(element);
    if (name === null) return;

    report(name, element);
  };

  host.addEventListener('click', onClick);

  return () => host.removeEventListener('click', onClick);
}
