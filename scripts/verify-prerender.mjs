/** Проверяет HTML на диске без выполнения скриптов: пустой CSR-shell не публикуется. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const path = 'dist/waystroke-studio/browser/index.html';
const html = readFileSync(path, 'utf8');
const dom = new JSDOM(html);
const doc = dom.window.document;
const root = doc.querySelector('app-root');

assert.equal(doc.querySelectorAll('app-root').length, 1);
assert.ok(root?.hasAttribute('ngh'), 'Нет данных hydration');
assert.equal(root.querySelectorAll('h1').length, 1);
assert.match(root.querySelector('h1').textContent, /Сайты, которые удобно/);
assert.match(root.querySelector('.eyebrow__text').textContent, /цифровая мастерская/);
assert.match(root.querySelector('.lead').textContent, /Waystroke начинает со структуры/);
assert.deepEqual(
  [...root.querySelectorAll('.service__title')].map((el) => el.textContent.trim()),
  ['Новый сайт', 'Адаптивная вёрстка', 'Доработка'],
);
assert.equal(root.querySelectorAll('.faq__item').length, 6);
assert.equal(doc.querySelector('link#concept-fonts[media="print"]')?.getAttribute('rel'), 'stylesheet');
assert.ok(doc.querySelector('noscript link[href="concept-fonts.css"]'), 'Нет шрифтов концептов без JS');
assert.match(root.querySelector('.faq__a').textContent, /50 %/);
for (const link of root.querySelectorAll('a[href^="#"]')) {
  assert.ok(doc.getElementById(link.getAttribute('href').slice(1)), `Нет цели ${link.href}`);
}
assert.ok(root.querySelector('a[href="#services"]'));
assert.ok(root.querySelector('a[href="#contact"]'));
assert.ok(root.querySelector('a[href="https://t.me/waystroke"]'));
assert.ok(root.querySelector('a[href="https://cal.com/mind-style-00/waystroke-call"]'));
assert.equal(doc.querySelector('link[rel="canonical"]').href, 'https://waystroke.online/');
assert.ok(doc.querySelector('meta[name="description"]').content);
assert.equal(JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'].length, 2);
assert.equal(readFileSync('dist/waystroke-studio/browser/404.html', 'utf8'), html);

console.log(`[prerender] ${path}: H1, hero, 3 услуги, 6 FAQ, ссылки, metadata и hydration проверены без JS`);
dom.window.close();
