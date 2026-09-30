import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';

const code = await readFile(new URL('./track.js', import.meta.url), 'utf8');
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const endpoint = 'https://track.waystroke.online/api/track';
const origins = ['https://waystroke.online', 'https://www.waystroke.online'];

for (const origin of origins) {
  test(`preflight and POST: ${origin}, no credentials`, async () => {
    const options = await worker.fetch(new Request(endpoint, {
      method: 'OPTIONS', headers: { Origin: origin,
        'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
    }), {});
    assert.equal(options.status, 204);
    assert.equal(options.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal(options.headers.get('Access-Control-Allow-Methods'), 'POST');
    assert.equal(options.headers.get('Access-Control-Allow-Headers'), 'content-type');
    assert.equal(options.headers.get('Access-Control-Allow-Credentials'), null);
    const writes = [];
    const env = { DB: { prepare: () => ({ bind: (...values) => ({ run: async () => writes.push(values) }) }) } };
    const response = await worker.fetch(new Request(endpoint, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'cta_click', source: 'hero' }),
    }), env);
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal(response.headers.get('Access-Control-Allow-Credentials'), null);
    assert.equal(response.headers.get('Vary'), 'Origin');
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].slice(1), ['cta_click', 'hero']);
  });
}

test('untrusted, localhost and absent origins cannot write or obtain CORS permission', async () => {
  for (const origin of ['https://evil.example', 'http://localhost:4200', 'https://waystroke.online.evil.example', null]) {
    for (const method of ['OPTIONS', 'POST']) {
      const response = await worker.fetch(new Request(endpoint, {
        method, headers: origin ? { Origin: origin } : {},
      }), {});
      assert.equal(response.status, 403);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
    }
  }
});

test('unknown events never write; failed D1 writes never return success', async () => {
  const request = (event) => new Request(endpoint, {
    method: 'POST', headers: { Origin: origins[0], 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, source: 'hero' }),
  });
  assert.equal((await worker.fetch(request('unknown'), {})).status, 400);
  const env = { DB: { prepare: () => ({ bind: () => ({ run: async () => { throw new Error('unavailable'); } }) }) } };
  assert.equal((await worker.fetch(request('cta_click'), env)).status, 500);
  assert.equal((await worker.fetch(new Request(endpoint, { method: 'GET' }), {})).status, 405);
});
