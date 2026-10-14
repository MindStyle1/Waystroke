# Исправления после аудита — 14 октября 2026

Изменения локальные, не опубликованы. Дизайн, бизнес-контент и архитектура сохранены; новых библиотек нет. [Исходный аудит](waystroke-2026-10-14.md) описывает предыдущую опубликованную сборку.

## Изменения

- **Переход к услугам:** перед вычислением цели вызывается `lenis.resize()`, синхронизирующий actual scroll. Диагностика показала native-перемещение 598 → 87 px перед чтением координат; прежняя animatedScroll добавляла 511 лишних px. Это объясняет воспроизведённый уход заголовка выше экрана. Поправка применяется ко всем navigation targets, без случайного дополнительного offset.
- **Cal.com:** обычный iframe `load` больше не объявляет успех. Обработчик проверяет origin `https://cal.com`, source именно текущего iframe и originator CAL. На `__iframeReady` отвечает `parentKnowsIframeReady`; только `linkReady` делает календарь доступным. `linkFailed` показывает ошибку. Через 8 секунд без готовности остаётся честный fallback; iframe скрыт и inert, но не уничтожается, поэтому поздняя готовность восстанавливает календарь. Window listener удаляется при уничтожении App.
- **Английские метаданные:** title/description, OG/Twitter title/description/image alt и OG locale согласованы с выбранным языком в DOM. Не вводились новые routes и hreflang. Static `?lang=en` по-прежнему отдаёт русское HTML: для crawler без JS англоязычное социальное превью требует отдельного prerender URL, это остаётся ограничением.
- **Изображения:** coffee/exhibit preview используют существующие WebP 480/960 через srcset/sizes. Полные макеты и композиции не менялись.
- **Sitemap/README:** дата значимого обновления 2026-10-14; README теперь описывает шесть concept dialogs, текущий hero, ограничения English metadata и проектную верификацию, убраны устаревшие сравнения/пустой Work list и прежние заявления о проверках.
- **Verification:** карта актуализирована; добавлены English metadata assertions, keyboard reduced-motion navigation и executable calendar helper для реального расписания и управляемых внешних отказов.

## Что проверяется

Production build с postbuild/prerender contract; unit-тесты; основной реальный браузер на 1440/390/320 px; дополнительные calendar сценарии на 1440/390 px. Booking/message submission не выполняется. Conversion endpoint перехвачен до кликов, state setters приложения не используются в браузерных сценариях.

Unit assertions **усилены**: load без readiness не проходит; проверены handshake, origin/source, отклонение преждевременных/чужих событий, failure → ready и inert/ARIA. Существующие остальные assertions сохранены. Browser календаря проверяет видимое расписание, а не только HTTP 200 или текст в DOM. В late-ready сценарии подменяется только внешний iframe response, отдельный реальный Cal.com путь остаётся неподменённым.

## Процесс диагностики и честность доказательств

Промежуточные прогоны сохранены отдельно. Один calendar screenshot показал пустой embed несмотря на availability events; это привело к внедрению настоящего handshake и ужесточению проверки видимости. Прежняя проверка удаления iframe заменена проверкой скрытого/inert состояния и позднего восстановления: удаление мешало recovery и не являлось пользовательским требованием.

Дополнительные mobile reduced-motion проверки сначала фокусировали ссылку до того, как раскрытая навигация стала видимой. Harness исправлен ожиданием видимого control и явным подтверждением его фокуса; проверка позиции заголовка не ослаблялась.

## Ограничения

Production не изменён и всё ещё отдаёт старый main bundle; исправления пока не доступны посетителям. Field CWV, индексация GSC, screen reader, реальные устройства и отправка заявок не подтверждены. Причины недоступности этих проверок — в исходном аудите; глобальная авторизация/инфраструктура не менялась. High advisory в source-map-js из первоначального аудита остаётся: пакет/lockfile в этом исправлении не обновлялись.

## Доказательства

- [Build / prerender log](../../output/playwright/fixes-2026-10-14/build.txt)
- [Unit log](../../output/playwright/fixes-2026-10-14/unit.txt)
- [Диагностика](../../output/playwright/fixes-2026-10-14/diagnosis.json)
- [Финальные пользовательские сценарии](../../output/playwright/fixes-2026-10-14/verified/journeys.json)
- [Финальный calendar probe](../../output/playwright/fixes-2026-10-14/verified-calendar/calendar.json)
- [Сравнение с ещё не обновлённым production](../../output/playwright/fixes-2026-10-14/production-comparison.json)

## Итог

**PASS для локальных исправлений**, не для опубликованного релиза. Build/prerender прошли; unit 47/47; основной браузерный прогон **210/210** на 1440×1000, 390×844 и 320×800; calendar сценарии **40/40** на desktop/mobile. Дополнительный контроль реально отображаемых данных расписания — **8/8**. Chromium 153.0.8010.12, без network/CPU throttling. Assertions усилены.

Screenshot/error-state и hero просмотрены, visual composition не менялась. В preview coffee/exhibit браузер выбрал 480w на всех трёх проверенных viewport при DPR 1; на более плотных экранах srcset позволяет выбрать 960w. Размеры сетки и макеты сохранены. Navigation нормальный и reduced-motion/Enter прошли; нет uncaught application errors и неуспешных first-party assets в основном прогоне.

Публичная версия по-прежнему старая: main-7J7ZG3RK.js. Локальная исправленная сборка имеет другой main/hash; совпадение с публичной версией намеренно отсутствует. Новая публикация не выполнялась. Cleanup останавливает только собственные instances; JSON, ARIA и screenshots сохраняются.

Сводка: [result-summary.json](../../output/playwright/fixes-2026-10-14/result-summary.json). [Видимое расписание](../../output/playwright/fixes-2026-10-14/calendar-visible-final/calendar.json).
