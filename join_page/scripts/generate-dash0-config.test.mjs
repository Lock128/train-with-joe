import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildConfig, disabledReason } from './generate-dash0-config.mjs';

const HEADERS = 'Authorization=Bearer tok,Dash0-Dataset=ds';

test('uses OTLP_* variables', () => {
  const c = buildConfig({ OTLP_ENDPOINT: 'https://e/v1/traces', OTLP_HEADERS: HEADERS }, 'p');
  assert.equal(c.endpointUrl, 'https://e');
  assert.equal(c.authToken, 'tok');
  assert.equal(c.dataset, 'ds');
});

test('falls back to FLUTTER_OTLP_* variables', () => {
  const c = buildConfig({ FLUTTER_OTLP_ENDPOINT: 'https://f', FLUTTER_OTLP_HEADERS: HEADERS }, 'p');
  assert.equal(c.endpointUrl, 'https://f');
  assert.equal(c.authToken, 'tok');
});

test('empty OTLP_* values fall back', () => {
  const c = buildConfig(
    { OTLP_ENDPOINT: ' ', OTLP_HEADERS: '', FLUTTER_OTLP_ENDPOINT: 'https://f', FLUTTER_OTLP_HEADERS: HEADERS },
    'p',
  );
  assert.equal(c.endpointUrl, 'https://f');
});

test('OTLP_* takes precedence over fallbacks', () => {
  const c = buildConfig(
    {
      OTLP_ENDPOINT: 'https://a',
      OTLP_HEADERS: 'Authorization=Bearer a,Dash0-Dataset=x',
      FLUTTER_OTLP_ENDPOINT: 'https://b',
      FLUTTER_OTLP_HEADERS: 'Authorization=Bearer b,Dash0-Dataset=y',
    },
    'p',
  );
  assert.equal(c.endpointUrl, 'https://a');
  assert.equal(c.authToken, 'a');
  assert.equal(c.dataset, 'x');
});

test('missing inputs are named without values', () => {
  assert.equal(buildConfig({}, 'p'), null);
  assert.match(disabledReason({}), /endpoint.*and headers/);
  assert.match(disabledReason({ OTLP_HEADERS: HEADERS }), /^missing endpoint/);
  assert.match(disabledReason({ OTLP_ENDPOINT: 'https://e' }), /^missing headers/);
  const r = disabledReason({ OTLP_ENDPOINT: 'https://e', OTLP_HEADERS: 'Dash0-Dataset=secretds' });
  assert.match(r, /bearer token/);
  assert.ok(!r.includes('secretds') && !r.includes('https://e'));
  assert.equal(disabledReason({ OTLP_ENDPOINT: 'https://e', OTLP_HEADERS: HEADERS }), undefined);
});
