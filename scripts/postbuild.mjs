/**
 * Копирует свежесобранный index.html в 404.html.
 *
 * Cloudflare Pages отдаёт 404.html на любой несуществующий путь — это
 * SPA-fallback: прямое открытие вложенного адреса и перезагрузка страницы
 * рендерят приложение, а не страницу ошибки хостинга. Копия делается после
 * сборки, чтобы в 404.html остались актуальные имена хешированных js/css.
 */
import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist/waystroke-studio';
const candidates = [join(dist, 'browser'), dist];

const outDir = candidates.find((dir) => existsSync(join(dir, 'index.html')));

if (!outDir) {
  console.error('[postbuild] index.html не найден ни в одной из папок:', candidates.join(', '));
  process.exit(1);
}

copyFileSync(join(outDir, 'index.html'), join(outDir, '404.html'));

const entries = readdirSync(outDir).sort();
console.log(`[postbuild] 404.html создан в ${outDir} (${entries.length} файлов в сборке)`);
