# Инженерная проверка Waystroke — 14 октября 2026

**Статус: PARTIAL.** Аудит и проектная инфраструктура выполнены. Подтверждён дефект перехода к услугам на desktop и неточная обработка отказа календаря; приложение не изменялось. Критических дефектов опубликованного сайта в проверенной области не подтверждено. Нельзя считать релиз полностью верифицированным: нет полевых CWV, Search Console и проверки экранным диктором.

## Область и условия

- Production: `https://waystroke.online/`; локально — свежая **production**, не dev-сборка, `http://127.0.0.1:4173/`.
- Исходники: commit `a767ae798fca4f692ccc87e553b7463ff3d8b5b4`, рабочее дерево до аудита чистое.
- Node 24.21.0, npm 11.19.0, Angular/CLI 22.2.0, Vitest 5.0.2; установленный Playwright 1.64.0-alpha, Chromium 150.0.7871.114, Lighthouse 13.5.0. Alpha-версия Playwright — ограничение переносимости harness; новая библиотека не установлена.
- Реальный Chromium: desktop 1440×1000, mobile 390×844, narrow 320×800. Mobile — эмуляция touch/viewport, не физический телефон. Браузерные функциональные проверки без CPU/network throttling.
- Lighthouse: чистые навигации, стандартное simulated throttling, mobile 412×823 / CPU ×4 / RTT 150 ms / throughput 1638.4 Kbps; desktop preset. Точные настройки каждого прогона в JSON. Замеры на общей рабочей машине, разброс включает её нагрузку и сеть.
- Chrome DevTools MCP недоступен из-за занятого профиля; его не перезапускали. Использованы существующий Playwright и cached Lighthouse CLI.
- При функциональных кликах перехвачены запросы к production conversion endpoint и `/cdn-cgi/rum`. Перехваченные запросы записаны в evidence. Cal.com/Telegram открывались реально; даты/время не выбирались, сообщения и заявки не отправлялись. Lighthouse не выполняет CTA-клики; его загрузки могли учитываться как обычные посещения, это не тест доставки аналитики.

## Что работает

| Проверка | Наблюдаемое доказательство |
|---|---|
| Production-сборка и prerender | `npm run build:prod` завершился успешно, одна статическая страница; postbuild подтвердил H1, услуги, FAQ, ссылки, метаданные, hydration без JS |
| Unit / Worker | 46/46 unit, 4/4 Worker; существующие тесты и assertions не изменены |
| Local / production | 182/183 браузерных assertions на **каждой** версии, одинаковая ошибка desktop services; пять групп сценариев × три viewport |
| Идентичность деплоя | HTML побайтно совпал; SHA-256 всех 27 first-party URL, фактически загруженных в проверенных сценариях, совпали с локальной сборкой |
| Первый экран и адаптив | Hero, галерея, услуги, команда, FAQ и контакты доступны; scrollWidth не превышает viewport в шести проверенных позициях на 320/390/1440 px |
| Галерея | Все шесть карточек открывают dialog; имя, начальный фокус на закрытии, цикл Tab, Escape и возврат к карточке проверены на трёх viewport; дополнительно кнопка закрытия и backdrop |
| Mobile navigation | Enter открывает меню, Tab входит в ссылки, Escape закрывает и возвращает фокус; переходы Design / Services / Contact и чистый URL прошли |
| FAQ | Все шесть summary открываются и закрываются через Enter; дополнительно проверен pointer-путь первого вопроса |
| RU / EN | Переключаются H1, title и lang; EN сохраняется после reload, RU убирает query. Проверено на трёх viewport |
| Контакты | Основные Telegram и Cal.com ссылки открывают правильные реальные адреса. Отдельно после ожидания Cal.com показал Waystroke, 20 минут, Google Meet и расписание |
| Reduced motion | После reload с `reduce` hero виден, `document.getAnimations()` пуст на трёх viewport; никаких обязательных анимаций для доступа к контенту |
| No-JS | Русский hero виден, мобильная fallback-навигация открыта, native FAQ раскрывается; галерея остаётся статической |
| Ошибки приложения | Uncaught `pageerror`: 0; загруженные first-party ресурсы без HTTP ≥400; изображения в наблюдаемом DOM загружены |

Скриншоты hero, узкого экрана, галереи, полного mobile и неверного перехода к услугам просмотрены. Основной текст читается, очевидных перекрытий/горизонтальной прокрутки в этой выборке нет. Полный длинный screenshot сам по себе не доказывает мелкую типографику всех секций; viewport-проверки дают дополнительное подтверждение reflow.

Skip-link: первая Tab даёт видимую ссылку с outline; Enter меняет адрес на `#main`, следующий Tab переходит к hero CTA, минуя шапку. `activeElement` при native переходе остаётся body — не приписываем этому отсутствие keyboard skip. Reverse Tab проверен в этом пути. Hover EN наблюдался; это ограниченный sample, не аудит всех hover/focus состояний.

## Подтверждённые проблемы и приоритет

### 1. P1: desktop «Услуги» прокручивает слишком далеко

**Воспроизведение:** 1440×1000 → открыть `/` → «Дизайн» → «Услуги» → ждать >3 секунд. Заголовок услуг имеет `top = -381.77 px`, шапка заканчивается на 75 px; видны середина услуг и следующая карточка вместо начала секции. Одинаково local/production, повторено отдельно в Playwright MCP.

**Влияние:** навигация не приводит к ожидаемому заголовку и первому предложению услуги. Контакты и сама секция доступны; это не отказ всего сайта.

**Минимальное исправление для согласования:** проверить расчёт позиции section в интеграции Lenis/ScrollTrigger, учитывать финальный layout и offset шапки. Подозреваемая область: `src/app/scroll-motion.ts:336` и `src/app/app.ts:340`; точная причина пока не доказана, миграция анимаций не предлагается.

**Приёмка:** исходный путь и прямой click Services из hero, desktop normal/reduced motion, heading ниже шапки; mobile должен сохранить PASS. Оценка: небольшое исправление после диагностики (несколько часов).

Доказательства: [production assertions](../../output/playwright/audit-2026-10-14/production/journeys.json), [снимок](../../output/playwright/audit-2026-10-14/services-navigation.png).

### 2. P2: отказ iframe Cal.com не переводит loading в error

В отдельном browser context запросы Cal.com намеренно abort. Через 9,5 секунд остаётся «Загружаем календарь…», `.cal__error` не виден, iframe остаётся. **Запасная ссылка видна и работает как независимый путь.** В обычном сценарии реальная страница записи загружается, поэтому booking URL не объявляется сломанным.

В `src/app/app.ts:275` любой iframe `load` выставляет `calendarLoaded=true`; такое событие не доказывает успешную загрузку cross-origin приложения и может поступить для error document. Это согласуется с экспериментом, но точную последовательность событий следует instrument отдельно.

**Предложение:** достоверное состояние доступности внешнего embed/timeout и всегда доступная внешняя ссылка. **Приёмка:** abort, timeout без ответа, обычный успех; loading сменяется честным статусом, fallback доступен, ничего не бронировать. Несколько часов; решение зависит от поддерживаемого Cal.com handshake.

[Эксперимент и дополнительные пути](../../output/playwright/audit-2026-10-14/extra.json), [снимок отказа](../../output/playwright/audit-2026-10-14/calendar-failure.png), [реальное расписание](../../output/playwright/audit-2026-10-14/boundary.json).

### 3. P2: high advisory в сборочной зависимости

`npm audit` обнаружил `source-map-js@1.2.1`, [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q): DoS при обработке специально сформированных source maps; исправлена версия 1.2.2. Дерево показывает PostCSS/Sass у Angular build и css-tree у jsdom. **Эксплуатация через опубликованный статический сайт не подтверждена.** Уровень high относится к advisory, не к критичности этого релиза.

**Предложение:** согласованное точечное обновление транзитивного lockfile, без `npm audit fix --force`, затем build/unit/affected journeys. Небольшое изменение при совместимом обновлении. [Audit JSON](../../output/playwright/audit-2026-10-14/npm-audit.json), [дерево](../../output/playwright/audit-2026-10-14/dependency-tree.txt).

### Условное замечание: Cloudflare beacon недоступен в этой сети

Lighthouse и Playwright получили `ERR_CONNECTION_CLOSED` для `static.cloudflareinsights.com/beacon.min.js`; Lighthouse Best Practices 96 связан с этой ошибкой. Основное приложение не падает. Не доказана глобальная недоступность или неправильный токен. Проверить из другой сети и analytics dashboard, только затем решать, нужен ли fallback. Отправка conversion endpoint намеренно не проверялась на production.

## Архитектура Angular

- Angular 22.2, standalone App → DesignDemo → SiteMock → шесть компонентов-концептов. Компонент App владеет языком, меню и booking; `signal`, `computed`, signal input используются локально. Нет наблюдаемой необходимости в store/service-слое для этой статической витрины.
- Router providers/клиентские routes отсутствуют. Это один документ, разделы — scroll anchors. `serverRoutes` содержит только `/`, `RenderMode.Prerender`, `outputMode: static`; SSR runtime на GitHub не требуется. `provideClientHydration(withEventReplay())`; browser-only initialization через `afterNextRender`, cleanup observers/listeners/timers, decorative import failures сохраняют fallback.
- Initial: 386,74 KB raw / 99,21 KB estimated transfer, main JS 344,31 KB raw. Scroll-motion 137,69 KB raw / 46,27 KB estimate выделен lazy chunk, но импортируется сразу после hydration; это не отложенная до interaction загрузка. Hero chunk 1,74 KB. Галерея и Anime.js входят в initial; GSAP/Lenis — отдельный chunk. Lazy split соответствует текущему устройству, само наличие eager галереи не дефект.
- Forms/router/runtime RxJS и несколько animation engines есть в dependencies; формы не используются в исходниках. Tree-shaking и назначение SSR tooling нужно учитывать до удаления пакетов. Не предложены массовое дробление App, signals migration, SSR migration или смена библиотек.
- Обработка глобальных browser errors подключена. Ошибки декоративных import и tracking не блокируют пользовательские ссылки. Календарный state — подтверждённое слабое место, описанное выше.
- GitHub Actions: lockfile через `npm ci`, Node из `.nvmrc`, root base href `/`, upload только browser, Pages permissions/concurrency корректны для этого сценария. Postbuild добавляет fonts и 404 **до** проверки prerender. CI пока не запускает unit/journeys; это предложение для будущей согласованной работы, workflow не менялся. Подтверждён текущий deployed artifact, а не вся история Actions/настройки аккаунта.
- Local `server.js` возвращает HTML/200 на неизвестные пути, GitHub — HTML/404. Поэтому локальный fallback не доказательство production HTTP semantics. Harness проверяет тип JS/CSS и использует production как отдельную цель.

## SEO и HTTP

[HTTP evidence](../../output/playwright/audit-2026-10-14/http.json), [исходный production HTML](../../output/playwright/audit-2026-10-14/production.html), [27 сравнений ресурсов](../../output/playwright/audit-2026-10-14/asset-comparison.json).

- `/`, robots, sitemap, OG image отвечают 200. HTTP и www приводят к canonical HTTPS apex; конечный status 200. В заголовках нет блокирующего X-Robots-Tag, meta robots разрешает index/follow. robots разрешает обход и указывает sitemap.
- Sitemap перечисляет единственный реальный route `/`. Неизвестный `/__verify_missing__` отдаёт правильный HTTP 404, хотя тело — копия главной. Отдельных routes About/Projects/Services/Contact нет: требовать для них 200 было бы ошибкой.
- H1 и основной текст находятся в исходном HTML; title, description, canonical, OG/Twitter присутствуют. OG PNG доступен. JSON-LD содержит WebSite / ProfessionalService; полный Google rich-result eligibility test не проводился.
- Фактическая индексация **не подтверждена**: GSC 401 `invalid_grant`, авторизацию глобального инструмента не меняли. Indexable ≠ indexed. После восстановления доступа полезен URL Inspection, без повторного полного аудита.
- `lastmod` sitemap — 2026-09-26, а существенные изменения контента есть 2026-10-13. Неблокирующее улучшение: обновлять дату реального значимого изменения. [Официальное правило Google](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
- `?lang=en` отдаёт русский prerender, затем меняет видимый текст/title/description. OG title остаётся русским, canonical указывает `/`. Это наблюдаемое ограничение English search/share, а не ошибка русского SEO. Отдельный English prerender/hreflang имеет смысл только при цели индексировать английскую версию.
- README содержит устаревший ползунок и прежние проверки `pages.dev`. Feature Map исправляет представление для верификации; README не менялся по ограничению scope.

## Производительность и доступность

| Лабораторный сигнал | Mobile, median [min–max], 3 runs | Desktop, median [min–max], 3 runs |
|---|---:|---:|
| Lighthouse Performance | 96 [76–98] | 95 [87–97] |
| LCP | 1,90 с [1,71–2,51] | 0,717 с [0,641–1,119] |
| CLS, navigation | 0,000042 [0,000041–0,000043] | 0,00256 [0,00198–0,00304] |
| TBT | 94,5 ms [50–720,5] | 72 ms [0–83] |

Accessibility 96 / Best Practices 96 / SEO 100 на первом полном прогоне каждой формы. Два повтора на форму — только Performance для диапазона/медианы, а не дублирующие audits всех категорий. Один повтор desktop был прерван, его неполный результат исключён и завершённый третий сохранён. [Lab summary](../../output/playwright/audit-2026-10-14/lab-summary.json), [mobile HTML](../../output/playwright/audit-2026-10-14/lighthouse-mobile.report.html), [desktop HTML](../../output/playwright/audit-2026-10-14/lighthouse-desktop.report.html).

**INP не измерен как полевой CWV.** Raw Event Timing при scripted interactions наблюдал durations до 88 ms production desktop / 48 ms mobile / 64 ms narrow. Это лишь sample отдельных событий; TBT не заменяет INP. Raw layout-shift entries полного путешествия сохранены, но без aggregation session windows не выдаются за окончательный CLS. Таблица выше — navigation CLS Lighthouse.

PageSpeed API запрос для field context получил 429 quota exceeded; CrUX/RUM данных нет. Не утверждаем ни прохождение, ни провал пользовательских CWV. Mobile outlier TBT требует стабильного повторения при отдельной performance-задаче, прежде чем оптимизировать приложение.

Шрифты локальные с swap, concept-fonts отдельно, изображения WebP и преимущественно lazy. Lighthouse показывает около 29 KB избыточной загрузки exhibit thumbnail и unused JS на первом экране. Это кандидаты, а не причины подтверждённого полевого провала. Responsive sources/дальнейшее откладывание motion — необязательные измеряемые улучшения после основных дефектов.

**Контраст требует интерпретации:** Lighthouse зафиксировал opacity 0.55 у промежуточных reveals. После scroll/wait services label/disclaimer имеют opacity 1 и цвет #666860 на #ece9df (около 4,66:1). Это не подтверждённый постоянный контраст 2,11:1. «До» с низким контрастом находится в намеренно декоративной иллюстрации с `aria-hidden=true`; не превращаем этот sample в критический a11y finding. Проверка с завершёнными анимациями нужна, если требуется отдельный contrast audit. Не выдаётся WCAG conformance verdict; screen reader не тестировался.

## Внедрённая проектная верификация

[SKILL.md](../../.agents/skills/verify-waystroke/SKILL.md), [Feature Map](../../.agents/skills/verify-waystroke/features/README.md), [project AGENTS.md](../../AGENTS.md).

Созданы executable lifecycle/drive helpers, Launch/Doctor/Drive/Evidence/Cleanup и пять feature-файлов. Реальные selectors, owned PID + process start time, build hash, три viewport, безопасные external boundaries. Никакой глобальной инфраструктуры, dependencies, бизнес-логики, дизайна или production configuration не меняли; commits/PR/deploy не выполнялись.

Первый цикл выявил ошибки **harness**: неоднозначный contact selector, преждевременная проверка FAQ animation и native dialog single-control Tab cycle. Они исправлены; ожидания не используются для скрытия подтверждённого services failure. Existing unit assertions сохранены. Новые resource assertions проверяют HTTP/MIME и отсутствие uncaught application errors.

Финальная проверка skill: отдельный Launch → Doctor → gallery на трёх viewport → Cleanup, 105/105 assertions прошли; число и доказательства в [final-proof/journeys.json](../../output/playwright/audit-2026-10-14/final-proof/journeys.json). Очистка сохраняет JSON/ARIA/screenshots и останавливает только созданный процесс. Основной full run честно остаётся 182/183, не маскируется успешной галереей.

## Непроверенные сценарии и следующие действия

Не проверены: реальная submission бронирования/сообщений (запрещено), запись production analytics/D1, screen readers/другие браузеры/реальные телефоны, полевой INP/CrUX, GSC indexing, полный zoom/text-spacing/contrast audit, все footer/fallback контактные ссылки отдельными кликами, мобильный CTA как самостоятельный entry point, fresh EN context независимо от switch+reload, все hover/focus targets, разные latency/offline режимы и до-hydration replay. Эти entry points отмечены в Feature Map; общая группа PASS не означает полную проверку каждого.

Рекомендуемый порядок согласованной работы: (1) desktop Services scroll, (2) failure state календаря, (3) безопасное обновление source-map-js lockfile. Затем при необходимости синхронизировать README/sitemap, уточнить English SEO цель, восстановить GSC доступ и проверить beacon из другой сети. Performance redesign и крупный рефакторинг оснований не имеют.

Для дальнейшего сопровождения карты использовать `/maintain-verification-skill`. Исправления приложения ждут решения пользователя.
