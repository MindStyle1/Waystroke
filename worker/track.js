/**
 * Приём конверсионных событий Waystroke и страница со сводкой.
 *
 * Зачем отдельный Worker: у Cloudflare Web Analytics нет API для своих
 * событий (официальный FAQ — «Not yet»), поэтому клики по контактам
 * считаются здесь. Событие попадает в таблицу `conversions` базы D1,
 * счётчики читаются на странице `/api/stats`.
 *
 * Три пути, разные по строгости:
 *  - запись события (`POST /api/track`) — публичная, но с проверкой Origin;
 *  - страница сводки (`GET /api/stats`) и её данные (`GET /api/stats.json`)
 *    — только по секрету из переменной окружения, иначе счётчики кликов
 *    были бы видны всем;
 *  - всё прочее — 404.
 *
 * Страница живёт под /api/* намеренно: отдельный маршрут на голый путь
 * `/stats` перехватывался раздачей статики Pages и отдавал 404.
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

/** Ряд по дням: график и сравнение «сегодня со вчера». */
const DAILY = `SELECT day, event, SUM(count) AS clicks
               FROM conversions
               WHERE day >= ?1
               GROUP BY day, event
               ORDER BY day`;

/** Сколько дней показывать в графике. */
const WINDOW_DAYS = 30;

/**
 * Сравнение секрета без утечки по времени: результат собирается из всех
 * символов, а не выходит сразу на первом несовпадении.
 */
const matches = (given, secret) => {
  if (typeof given !== 'string' || typeof secret !== 'string') return false;
  let diff = given.length ^ secret.length;
  const length = Math.max(given.length, secret.length);
  for (let i = 0; i < length; i += 1) {
    diff |= (given.charCodeAt(i) || 0) ^ (secret.charCodeAt(i) || 0);
  }
  return diff === 0;
};

/**
 * Ключ приходит заголовком, адресом или из сессионной cookie. Cookie нужна
 * для запроса данных самой страницы: там ключа в адресе уже нет, потому что
 * он был убран из строки браузера при открытии.
 */
const keyOf = (url, request) => {
  const fromHeader = request.headers.get('X-Stats-Key');
  if (fromHeader) return fromHeader;

  const fromQuery = url.searchParams.get('key');
  if (fromQuery) return fromQuery;

  const cookie = request.headers.get('Cookie') ?? '';
  const match = /(?:^|;\s*)ws_stats=([^;]*)/.exec(cookie);

  return match ? decodeURIComponent(match[1]) : '';
};

const readSummary = async (env) => {
  const [totals, byEvent, bySource, daily] = await Promise.all([
    env.DB.prepare('SELECT SUM(count) AS clicks FROM conversions').all(),
    env.DB.prepare(
      'SELECT event, SUM(count) AS clicks FROM conversions GROUP BY event ORDER BY clicks DESC',
    ).all(),
    env.DB.prepare(
      'SELECT source, SUM(count) AS clicks FROM conversions GROUP BY source ORDER BY clicks DESC',
    ).all(),
    env.DB.prepare(DAILY).bind(isoDayAgo(WINDOW_DAYS)).all(),
  ]);

  return {
    total: totals.results?.[0]?.clicks ?? 0,
    byEvent: byEvent.results ?? [],
    bySource: bySource.results ?? [],
    daily: daily.results ?? [],
    windowDays: WINDOW_DAYS,
  };
};

function isoDayAgo(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/** Ответ со сводкой никогда не кэшируется: это счётчики, а не статика. */
const noStore = (body, type) =>
  new Response(body, {
    status: 200,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Страница и её данные живут под /api/*: этот маршрут точно доходит до
    // Worker'а, в отличие от голого пути, где его перехватывает Pages.
    if (url.pathname === '/api/stats') return serveStatsPage(request, env, url);
    if (url.pathname === '/api/stats.json') return serveStatsJson(request, env, url);
    if (url.pathname !== '/api/track') return new Response('Not Found', { status: 404 });

    return track(request, env);
  },
};

async function track(request, env) {
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
}

async function serveStatsJson(request, env, url) {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET' } });
  }

  if (!matches(keyOf(url, request), env.STATS_TOKEN)) {
    return new Response('Forbidden', { status: 403 });
  }

  try {
    return noStore(JSON.stringify(await readSummary(env)), 'application/json; charset=utf-8');
  } catch {
    return new Response('Query failed', { status: 500 });
  }
}

function serveStatsPage(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET' } });
  }

  // Страница получает ключ в адресе, поэтому кладём его в сессионную
  // cookie и убираем из адресной строки: иначе он останется в истории
  // браузера и в закладках. Cookie живёт только до закрытия вкладки.
  const given = keyOf(url, request);

  if (!matches(given, env.STATS_TOKEN)) {
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Stats</title>' +
        '<p style="font:15px system-ui;padding:2rem">Нужен ключ: <code>/api/stats?key=…</code></p>',
      { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  const body = page();

  // Ссылку с ключом человек открывает один раз и уходит со вкладки на сайт.
  // Без подсказки ключ забывается через день, поэтому в самом низу страницы
  // оставляем заметную кнопку «открыть сайт» вместе со строкой о ключе.
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Set-Cookie': `ws_stats=${given}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`,
      'Content-Security-Policy':
        "default-src 'none'; script-src 'nonce-ws'; style-src 'nonce-ws'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'",
      'Referrer-Policy': 'no-referrer',
    },
  });
}

/** Страница сводки: одна разметка, данные подтягиваются с `/api/stats`. */
function page() {
  return `<!doctype html>
<html lang="ru">
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<title>Waystroke · конверсии</title>
<!-- Своя иконка: без неё браузер просит /favicon.ico и получает 404. -->
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style nonce="ws">
  :root {
    --bg: #f4f2ec; --ink: #16150f; --ink-2: #55524a; --ink-3: #8b877c;
    --line: #ded9cc; --accent: #7c9a1f; --card: #fffdf8;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2.5rem 1.5rem 4rem; background: var(--bg); color: var(--ink);
    font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  main { max-width: 62rem; margin: 0 auto; }
  header { display: flex; align-items: baseline; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
  h1 { margin: 0; font-size: 1.3rem; letter-spacing: -0.01em; }
  .muted { color: var(--ink-3); font-size: 0.8rem; }
  .total { margin-left: auto; font-size: 2.4rem; font-weight: 600; letter-spacing: -0.02em; }
  .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 1.15rem 1.25rem; }
  .card--wide { grid-column: 1 / -1; }
  h2 { margin: 0 0 0.85rem; font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 0.4rem 0; font-size: 0.9rem; }
  th { color: var(--ink-3); font-weight: 500; font-size: 0.75rem; letter-spacing: 0.04em; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tbody tr + tr { border-top: 1px solid var(--line); }
  .name { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.82rem; }
  .empty { color: var(--ink-3); font-size: 0.88rem; }
  .chart { display: flex; align-items: flex-end; gap: 2px; height: 7rem; margin-top: 0.4rem; }
  .bar { flex: 1; min-width: 2px; background: var(--accent); border-radius: 1px 1px 0 0; height: calc(var(--h, 0) * 1%); }
  .axis { display: flex; justify-content: space-between; color: var(--ink-3); font-size: 0.72rem; margin-top: 0.4rem; }
  footer { margin-top: 2rem; color: var(--ink-3); font-size: 0.78rem; }
  footer p { margin: 0.35rem 0; }
  .keys a { color: var(--ink-2); }
  .err { color: #a33; }
</style>
<main>
  <header>
    <h1>Конверсии Waystroke</h1>
    <span class="muted" id="range"></span>
    <span class="total" id="total">—</span>
  </header>

  <div class="grid">
    <section class="card">
      <h2>По событиям</h2>
      <table><tbody id="events"></tbody></table>
    </section>
    <section class="card">
      <h2>По источникам</h2>
      <table><tbody id="sources"></tbody></table>
    </section>
    <section class="card card--wide">
      <h2>По дням</h2>
      <div class="chart" id="chart"></div>
      <div class="axis"><span id="from"></span><span id="to"></span></div>
    </section>
  </div>

  <footer>
    <p>Обновление раз в минуту. События: telegram_click · calcom_click · cta_click</p>
    <p class="keys">
      Это служебная страница, в меню сайта её нет.
      <a href="/">Открыть waystroke.online</a> ·
      <span class="muted">входить снова: /api/stats?key=… (ключ в приглашении)</span>
    </p>
  </footer>
</main>
<script nonce="ws">
  // Строки собираем через DOM, а не строкой HTML: под этим CSP безопаснее
  // и не нужно гадать, что именно пришло из базы.
  const tableRows = (list, label) => {
    const frag = document.createDocumentFragment();

    if (!list.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.className = 'empty';
      td.colSpan = 2;
      td.textContent = 'Пока нет данных';
      tr.append(td);
      frag.append(tr);
      return frag;
    }

    for (const row of list) {
      const tr = document.createElement('tr');

      const name = document.createElement('td');
      name.className = 'name';
      name.textContent = String(row[label]);

      const clicks = document.createElement('td');
      clicks.className = 'num';
      clicks.textContent = String(row.clicks);

      tr.append(name, clicks);
      frag.append(tr);
    }
    return frag;
  };

  const draw = (data) => {
    document.getElementById('total').textContent = data.total;
    document.getElementById('events').replaceChildren(tableRows(data.byEvent, 'event'));
    document.getElementById('sources').replaceChildren(tableRows(data.bySource, 'source'));

    const byDay = {};
    for (const row of data.daily) byDay[row.day] = (byDay[row.day] || 0) + row.clicks;

    // График всегда показывает все дни окна, включая пустые: иначе единственный
    // столбик с данными растягивается на всю ширину и читается как «много».
    const today = new Date().toISOString().slice(0, 10);
    const first = new Date(Date.now() - (data.windowDays - 1) * 86400000)
      .toISOString()
      .slice(0, 10);

    const days = [];
    for (let i = 0; i < data.windowDays; i += 1) {
      const day = new Date(Date.parse(first) + i * 86400000).toISOString().slice(0, 10);
      days.push({ day, clicks: byDay[day] ?? 0 });
    }

    const max = Math.max(1, ...days.map((d) => d.clicks));
    const chart = document.getElementById('chart');
    chart.textContent = '';

    for (const { day, clicks } of days) {
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.title = day + ': ' + clicks;
      // Высота задаётся через CSSOM, а не строкой style="…": под этим CSP
      // инлайновые стили в разметке не проходят, а CSSOM-присваивание —
      // обычный скрипт и правилам не подчиняется.
      bar.style.setProperty('--h', String(Math.round((clicks / max) * 100)));
      chart.append(bar);
    }

    document.getElementById('range').textContent = 'за ' + data.windowDays + ' дней · всего';
    document.getElementById('from').textContent = first;
    document.getElementById('to').textContent = today;
  };

  const load = async () => {
    try {
      const res = await fetch('/api/stats.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      draw(await res.json());
    } catch (err) {
      const total = document.getElementById('total');
      total.className = 'total err';
      total.textContent = 'ошибка';
      document.getElementById('range').textContent = String(err.message);
    }
  };

  load();
  setInterval(load, 60000);
</script>
</html>`;
}
