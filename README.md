# Waystroke — одностраничный сайт-портфолио

Одностраничная витрина цифровой мастерской веб-дизайна и разработки: тёплый светлый фон,
выразительная типографика, тёмная секция «Дизайн» и один лаймовый акцент
(`#C8F054`). Мотив — тонкая линия, похожая на мазок кисти и путь.

## Стек

- **Angular 22.2.0** (стабильный релиз, standalone-компоненты, zoneless)
- Обычный CSS без UI-библиотек, шрифты локально через `@fontsource`
  (Inter 400–700, Playfair Display italic для акцентной строки)
- Без бэкенда и без внешних сервисов, кроме Cal.com (эмбед записи) и Telegram

## Команды

```bash
npm install        # зависимости
npm start          # дев-сервер: http://127.0.0.1:4200
npm run build:prod # production-сборка в dist/waystroke-studio/browser
npm run serve      # статический сервер собранного варианта (порт из PORT, по умолчанию 3000)
npm test           # unit-тесты (vitest)
```

## Структура

| Файл | Назначение |
| --- | --- |
| `src/app/app.html` | вся разметка страницы: шапка, первый экран, «Дизайн», работы, услуги/подход, направления работы, FAQ, контакты, футер |
| `src/app/app.ts` | логика: появление блоков (IntersectionObserver), меню, навигация без якорей, подстраховка календаря |
| `src/app/design-demo/design-demo.*` | шесть карточек концептов, просмотр в нативном dialog, восстановление фокуса |
| `src/app/design-demo/site-mock.*` | диспетчер макетов: выбирает один из шести концептов по входному `concept` |
| `src/app/design-demo/concepts/` | шесть независимых концептов, каждому по три файла (`<имя>.ts|html|css`) |
| `src/app/motion.ts` | секционные анимации; покой — законченное состояние из разметки, анимация только улучшает его (страховка возвращает финал, если движок не получил кадров) |
| `src/app/loader.spec.ts` | проверки загрузчика по исходным файлам: устройство кадра, исходное состояние (нет видимого `WAYSTROKE` до сцены) и договорённость сцены с приложением |
| `src/styles.css` | дизайн-токены, сетки, мотив линии, загрузчик, адаптив и `prefers-reduced-motion` |
| `public/images/` | четыре фотографии концептов (WebP, CC0) и OG-картинка — см. «Фотографии» и «Превью ссылки» ниже |
| `public/favicon.svg` + `favicon-16x16/32x32/48x48.png`, `apple-touch-icon.png` | иконка сайта во всех размерах, которые ищут браузер, Яндекс и Google |
| `public/robots.txt`, `public/sitemap.xml` | индексация: разрешение роботам и единственный реальный адрес сайта |
| `src/index.html` | `lang`, мета, canonical, Open Graph, Twitter Card, Schema.org, иконки, ранний скрипт `no-js → js`, брендовый загрузчик «первый штрих» и его сценарий |
| `server.js` | локальный статический сервер (`npm run serve`, порт из `PORT`) |
| `scripts/postbuild.mjs` | копирует `index.html` в `404.html` — статический fallback для GitHub/Cloudflare Pages |
| `.nvmrc` | версия Node для облачной сборки (Angular 22 требует ≥ 22.22.3) |

## Rendering: prerender / SSG

Angular 22.2 создаёт главную страницу (`/`) при сборке: `RenderMode.Prerender`
и `outputMode: "static"`. В `dist/waystroke-studio/browser/index.html` уже есть
H1, hero copy, услуги, FAQ и ссылки; сервер Angular на хостинге не нужен.
GitHub Pages продолжает публиковать только папку `browser`. `404.html` — копия
готовой страницы с hydration, а не пустой CSR-shell.

`provideClientHydration(withEventReplay())` восстанавливает интерактивность
на существующем DOM. Browser-only инициализация в `App` запускается через
`afterNextRender`: window/document, observers, motion, tracking и календарь
не выполняются при prerender. Cleanup защищён флагом browserInitialized.

Без JavaScript работают обычные якорные ссылки, контакты и нативные FAQ
(`<details>`). На мобильном fallback-навигация открыта; галерея статична,
а для записи остаётся обычная ссылка вместо скрытого iframe.

Postbuild запускает `scripts/verify-prerender.mjs`, который читает HTML без
выполнения скриптов и проверяет контент, ссылки, metadata и данные hydration.
Повторить проверку отдельно: `node scripts/verify-prerender.mjs`.

В production отключён только автоматический inlineCritical: извлечение CSS
по серверному `no-js` исключало исходное состояние `.js .stroke__path`.
Обычная минифицированная таблица стилей применяется до первого кадра,
поэтому линия не успевает показаться целиком перед своей анимацией.

В production основные Inter 400/500/600 и Playfair 400 italic остаются в
первом CSS. Остальные шрифты концептов собраны в `concept-fonts.css`:
postbuild добавляет его в HTML с `media="print"`, а небольшой скрипт включает
при приближении к секции дизайна или выборе ссылки «Дизайн». В `<noscript>`
он подключён обычным stylesheet. `font-display: swap` сохранён; в dev все
шрифты подключаются как раньше.

## Первый экран и галерея

Основной фон hero — декоративные DOM-слои с CSS, вариант `hybrid`.
`hero-background.ts` загружается отдельно; движение приостанавливается вне
экрана, в скрытой вкладке и при `prefers-reduced-motion`. Preview-варианты
`?hero=wave|paper|lime|hybrid` и `?preview=loader` сохранены для ревью.

«Дизайн» — шесть авторских концептов: СДВИГ, miora, ТОЧКА МОТОР,
крошка, ВНЕ РАМКИ и saldo. Карточка открывает нативный `<dialog>` с целым
макетом. Закрытие кнопкой, Escape или backdrop возвращает фокус на карточку.
Это демонстрационные концепты, отдельного списка клиентских проектов и
ползунка сравнения в текущей версии нет. Декоративные controls макетов inert.
Превью кофе и выставки выбирают существующие WebP 480/960 через srcset.

Язык интерфейса переключается RU/EN, EN сохраняется в `?lang=en`.
Title, description, OG и Twitter в DOM синхронизируются с языком. На статическом
GitHub Pages query всё ещё получает русский prerender; социальный crawler,
не выполняющий JS, получит русское превью. Canonical остаётся главной `/`.

## Фотографии

Четыре свободные фотографии (CC0, авторство не требуется) с StockSnap.io.
Найдены через Openverse API (`api.openverse.org`), пережаты в WebP
(ImageMagick) в двух размерах — 960 px и 480 px, есть `srcset`/`sizes`:

| Файл | Источник | Где используется |
| --- | --- | --- |
| `concept-moto-960.webp`, `concept-moto-480.webp` | «Car Paint job», <https://stocksnap.io/photo/90734C8136> | Архивная фотография автосервиса; текущий концепт использует техническую иллюстрацию |
| `concept-beauty-960.webp`, `concept-beauty-480.webp` | «Beauty Skincare», <https://stocksnap.io/photo/LRSAT4NCLS> | Архивный концепт косметики; текущая карточка miora использует `concept-miora-v2.webp` |
| `concept-coffee-960.webp`, `concept-coffee-480.webp` | «Barista Latte», <https://stocksnap.io/photo/V7HJ1MBGUP> | «крошка» — кофейня |
| `concept-exhibit-960.webp`, `concept-exhibit-480.webp` | «Art Gallery», <https://stocksnap.io/photo/481AD95CF9> | «ВНЕ РАМКИ» — выставочный зал |

На фотографиях нет чужих логотипов и читаемых надписей; концепт «СДВИГ»
обходится без внешних картинок (только CSS/SVG), а в «saldo» использованы
вымышленные магазины и суммы.

## Превью ссылки и индексация

Заголовок и описание сайта (в `<title>`, `description`, `og:*` и `twitter:*`
берутся из тех же строк):

- **title** — `Waystroke — цифровая мастерская веб-дизайна и разработки`:
  название и позиционирование, затем направления работы;
- **description** — структура страниц, визуальная система, адаптивный интерфейс
  и запуск. Без «лучших», «дешёвых», «№1» и «гарантированного результата»;
- **keywords** в `meta` намеренно нет: Google и Яндекс его не читают, а список
  мгновенно устаревает и тянет за собой правки.

Waystroke говорит от имени цифровой мастерской. Первый экран связывает имя с
работой от структуры до публикации; блок «В мастерской» описывает направления
работы, не утверждая состав или численность участников. Отзывы, рейтинги и
цифры результата не заявлены без подтверждения.

Картинка для ссылок — `public/images/og-waystroke.png`, ровно **1200×630, PNG**
(собрана из тех же токенов и шрифтов Inter/Playfair, что и сайт: фон `#ece9df`,
тёмный текст, лаймовый акцент `#c8f054`, фирменный мазок линии). Читается и в
маленьком превью Telegram — проверено на уменьшении до 420 px и 200 px.

В `<head>` (`src/index.html`):

- `link rel="canonical"` → `https://waystroke.online/`;
- `meta name="robots"` → `index, follow, max-image-preview:large`;
- Open Graph: `og:type=website`, `og:site_name=Waystroke`, `og:locale=ru_RU`,
  `og:title`, `og:description`, `og:url=https://waystroke.online/`,
  абсолютный `og:image` + `og:image:type/width/height/alt`;
- Twitter Card: `summary_large_image` (+ `twitter:title/description/image`
  и `twitter:image:alt`);
- **Schema.org** (JSON-LD, `@graph`): `WebSite` и `ProfessionalService` с
  `sameAs` на Telegram и каталогом услуг `hasOfferCatalog` — четыре позиции с
  теми же ценами и сроками, что напечатаны в карточках услуг. Оценок и отзывов
  в разметке нет: выдумывать их нельзя, Google такие данные считает
  нарушением правил;
- `link rel="preconnect"` к `cloudflareinsights.com` — beacon грузится всегда,
  и раннее соединение срезает ~300 мс.

Все URL в метаданных абсолютные и ведут на `https://waystroke.online` — с
`<base href="/">` относительные пути в превью ломались бы.

- `public/robots.txt` — `User-agent: *`, `Allow: /`, ссылка на sitemap;
- `public/sitemap.xml` — единственный реально существующий адрес
  `https://waystroke.online/` (сайт одностраничный, якорей и роутинга нет,
  выдуманных маршрутов в карте нет);
- `public/yandex_6e99f680d7655231.html` — файл подтверждения Яндекс.Вебмастера.

### Иконка сайта

`favicon.svg` — та же метка, что и в шапке (лаймовая точка и линия), но без
полупрозрачной линии: на 16 px она не читалась. Растровые версии
(`favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`) нарисованы из
того же SVG, `apple-touch-icon.png` — 180×180 для экрана «Домой» на iOS.
Все четыре файла квадратные, с одинаковым безопасным полем, и подключены явно
(`rel="icon"` с `sizes` и `rel="apple-touch-icon"`) — иначе Яндекс и Google
подставляют случайную иконку или вовсе её не находят.

`manifest.webmanifest` не нужен: это не PWA, нет устанавливаемого приложения и
нет экранов, которые пришлось бы кэшировать офлайн. По той же причине нет и
`theme-color` для конкретных медиазапросов — есть один общий, в тон фону.

### Иерархия заголовков

Главная содержит один H1. H2 обозначают дизайн, услуги, процесс, команду,
FAQ и контакты; H3 — карточки/элементы разделов. Декоративные вложенные
концепты в превью скрыты от accessibility tree; полный макет открывается
в диалоге с собственным заголовком.

## Навигация

Пункты меню и CTA — обычные `<a href="#…">` с существующими целями в HTML.
Без JS работают нативные якоря. После hydration обычный клик плавно скроллит
страницу к секции и ставит на неё фокус (`focus({ preventScroll: true })`), **URL не меняется** —
в адресной строке нет `#top`, `#design`, `#services`. Логотип возвращает к
позиции 0 без перезагрузки. Перед переходом Lenis синхронизирует фактическую прокрутку браузера,
включая нативные перемещения при фокусировке. Учтены фиксированная шапка (через `scroll-padding-top`),
закрытие мобильного меню по Escape (фокус возвращается на кнопку меню)
и `prefers-reduced-motion` (скролл становится мгновенным).

## Контакты

- Telegram: <https://t.me/waystroke> (видимый ник — `@waystroke`)
- Запись на 20-минутный созвон: <https://cal.com/mind-style-00/waystroke-call>
  (встроен через iframe; готовность подтверждает `linkReady` Cal.com от
  собственного iframe после ответа на `__iframeReady`, а не событие load. Без подтверждения через 8 секунд
  показывается ошибка и обычная ссылка на запись. Медленная загрузка
  может восстановить календарь позднее; до готовности iframe скрыт и inert)

## Деплой

Хостинг — **GitHub Pages** (репозиторий `MindStyle1/Waystroke`, workflow
`.github/workflows/static.yml`), адрес: <https://waystroke.online>

Почему не Cloudflare Pages: `pages.dev` из части сетей без VPN не открывается.
Cloudflare в проекте остался только как DNS и как приёмник событий.

- Источник — GitHub `MindStyle1/Waystroke`, ветка `main`: каждый push в `main`
  собирается и публикуется автоматически (Actions → Pages).
- **Сборка**: `npm run build -- --base-href=/`. Именно `/`, а не `/Waystroke/`:
  кастомный домен отдаётся из корня, и с префиксом репозитория пути к js/css
  уезжали бы в подпапку и сайт открывался пустым.
- **Артефакт**: `dist/waystroke-studio/browser`.
- `.nvmrc` поднимает Node до 24.21.0 — облачный образ по умолчанию даёт 22.16.0,
  а Angular 22 требует ≥ 22.22.3.
- **SPA-fallback**: `postbuild` кладёт копию `index.html` в `404.html`, поэтому
  неизвестный адрес показывает оболочку с HTTP 404. Единственный route — `/`;
  разделы не являются отдельными routes. Catch-all-правило
  `/* /index.html 200` в `_redirects` Cloudflare отклоняет собственной валидацией
  («infinite loop detected»), а `/* /404.html 200` на практике закольцовывает
  ответы (308 → `/404` → …) — поэтому используется только `404.html`.
- **DNS** (зона `waystroke.online`, NS Cloudflare): apex — четыре A-записи
  `185.199.108–111.153`, `www` — CNAME на `mindstyle1.github.io`, всё в режиме
  «только DNS» (серое облако, без прокси). MX и TXT Timeweb сохранены.
  Сертификат для обоих имён выпускает GitHub автоматически.
- **Cloudflare Pages** (проект `waystroke`) не удалён: `waystroke.pages.dev`
  продолжает собираться и открываться, но больше не обслуживает
  `waystroke.online` — это осознанный запасной адрес.

### Cloudflare Web Analytics

Beacon лежит в `src/index.html` с тем же токеном, который раньше подставлял
сам Cloudflare Pages. Как только сайт уехал на GitHub Pages, вставки от Pages
больше нет — без снимка в исходниках аналитика молча перестала бы собирать
всё, включая обычные посещения.

### Worker приёма конверсий

`worker/track.js` живёт на собственном имени `track.waystroke.online`
(Worker custom domain), а не на пути `/api/*` сайта. Причина та же: маршрут
`waystroke.online/api/*` работает только на проксированном трафике, а apex
теперь уходит на IP GitHub мимо Cloudflare. Свой домен остаётся на прокси,
поэтому Worker на месте; события приходят к нему с чужого источника, и в
обработчике появились CORS-заголовки с ответом на preflight.

Клиент отправляет ровно один `fetch` на действие: `POST`, JSON с полями
`event` и `source`, `credentials: omit`, `mode: cors`, `keepalive: true`.
`sendBeacon` не используется, поскольку его credentials mode всегда `include`.
Повторов нет: потеря ответа не должна удвоить агрегированный счётчик.
Worker сохраняет allowlist `https://waystroke.online` и
`https://www.waystroke.online`; preflight разрешает только `POST` и
`content-type`, без `Access-Control-Allow-Credentials`. Localhost не разрешён.
Секрет и cookie страницы статистики не используются для записи событий.

## Проектная верификация

Используйте [.agents/skills/verify-waystroke/SKILL.md](.agents/skills/verify-waystroke/SKILL.md)
и [Feature Map](.agents/skills/verify-waystroke/features/README.md).
Навык запускает production-сборку, проверяет идентичность процесса и HTML,
водит настоящий браузер по сценариям и сохраняет доказательства в `output/playwright/`.
Не отправляйте заявки/сообщения, не создавайте бронирования и не пишите
тестовые события production analytics.

[Аудит 14 октября 2026](docs/audits/waystroke-2026-10-14.md) фиксирует
состояние опубликованной версии до исправлений. Результаты локальных исправлений
и ограничения — в [отчёте исправлений](docs/audits/waystroke-fixes-2026-10-14.md).
Сборка и Lighthouse не доказывают полевую производительность или индексацию.
