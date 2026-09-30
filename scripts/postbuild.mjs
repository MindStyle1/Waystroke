/**
 * Копирует свежесобранный index.html в 404.html.
 *
 * GitHub Pages (и запасной Cloudflare Pages) используют статический 404.html.
 * Копируем уже prerendered страницу вместе с hydration и актуальными js/css.
 */
import { copyFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist/waystroke-studio';
const candidates = [join(dist, 'browser'), dist];

const outDir = candidates.find((dir) => existsSync(join(dir, 'index.html')));

if (!outDir) {
  console.error('[postbuild] index.html не найден ни в одной из папок:', candidates.join(', '));
  process.exit(1);
}

const fontBundle = readdirSync(outDir).find((entry) => /^concept-fonts(?:-[\w]+)?\.css$/.test(entry));
if (!fontBundle) throw new Error('[postbuild] concept-fonts.css не найден');
const indexPath = join(outDir, 'index.html');
const html = readFileSync(indexPath, 'utf8');
const fontLink = `<link id="concept-fonts" rel="stylesheet" href="${fontBundle}" media="print"><noscript><link rel="stylesheet" href="${fontBundle}"></noscript>`;
if (!html.includes('</head>')) throw new Error('[postbuild] </head> не найден');
writeFileSync(indexPath, html.replace('</head>', `${fontLink}</head>`));

copyFileSync(indexPath, join(outDir, '404.html'));

const entries = readdirSync(outDir).sort();
console.log(`[postbuild] 404.html создан в ${outDir} (${entries.length} файлов в сборке)`);

await import('./verify-prerender.mjs');
