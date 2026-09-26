/**
 * Приём конверсионных событий Waystroke.
 *
 * Зачем отдельный Worker: у Cloudflare Web Analytics нет API для своих
 * событий (официальный FAQ — «Not yet»), поэтому клики по контактам
 * считаются здесь. Событие попадает в таблицу `conversions` базы D1,
 * счётчики читаются обычным SQL.
 *
 * Правила, которых держится обработчик:
 *  - событие принимается только из белого списка, иначе счётчик можно набить;
 *  - запрос принимается только с нашего домена, по чужому Origin — 403;
 *  - в таблицу не пишутся cookie, IP и идентификаторы посетителей;
 *  - если запись не прошла, ответ не 204, а 500: молчаливый «успех» хуже
 *    явной ошибки — по нему видно, что привязка базы потеряна.
 *
 * События приходят с того же домена, поэтому CORS не нужен: заголовки
 * доступа не выдаём, перекрёстные вызовы отсекаем проверкой Origin.
 */

/** Всё, что не перечислено здесь, в счётчики не попадает. */
const EVENTS = new Set(['telegram_click', 'calcom_click', 'cta_click']);

/** Сайт и его www-версия — больше никто не считается. */
const ORIGINS = new Set(['https://waystroke.online', 'https://www.waystroke.online']);

/** Обрезка полей: в базу попадают только короткие осмысленные строки. */
const LIMIT_EVENT = 32;
const LIMIT_SOURCE = 48;

const text = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');

/**
 * На каждый клик строка не заводится — счётчик за день, событие и источник
 * просто увеличивается. Благодаря этому таблица остаётся маленькой
 * (дни × события × источники) и не требует уборки.
 */
const UPSERT =
  'INSERT INTO conversions (day, event, source, count) VALUES (?1, ?2, ?3, 1) ' +
  'ON CONFLICT (day, event, source) DO UPDATE SET count = count + 1';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
    }

    const origin = request.headers.get('Origin');
    if (origin === null || !ORIGINS.has(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    const event = text(body?.event, LIMIT_EVENT);
    if (!EVENTS.has(event)) {
      return new Response('Unknown event', { status: 400 });
    }

    const source = text(body?.source, LIMIT_SOURCE) || 'unknown';

    try {
      await env.DB.prepare(UPSERT).bind(new Date().toISOString().slice(0, 10), event, source).run();
    } catch {
      return new Response('Write failed', { status: 500 });
    }

    return new Response(null, { status: 204 });
  },
};
