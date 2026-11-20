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

const NONPROD = {
  NONPROD_FLUTTER_OTLP_ENDPOINT: 'https://nonprod/v1/traces',
  NONPROD_FLUTTER_OTLP_HEADERS: 'Authorization=Bearer np,Dash0-Dataset=npds',
};
const PROD = {
  PROD_FLUTTER_OTLP_ENDPOINT: 'https://prod',
  PROD_FLUTTER_OTLP_HEADERS: 'Authorization=Bearer pr,Dash0-Dataset=prds',
};

test('falls back to NONPROD_FLUTTER_OTLP_* for non-production environments', () => {
  for (const environment of ['sandbox', 'beta', 'billing', 'dev', 'development']) {
    const c = buildConfig({ ...NONPROD, ...PROD, DASH0_ENVIRONMENT: environment }, 'p');
    assert.equal(c.endpointUrl, 'https://nonprod');
    assert.equal(c.authToken, 'np');
    assert.equal(c.dataset, 'npds');
  }
});

test('falls back to PROD_FLUTTER_OTLP_* for production and teamcorner environments', () => {
  for (const environment of ['production', 'prod', 'production-teamcorner', 'teamcorner']) {
    const c = buildConfig({ ...NONPROD, ...PROD, DASH0_ENVIRONMENT: environment }, 'p');
    assert.equal(c.endpointUrl, 'https://prod');
    assert.equal(c.authToken, 'pr');
    assert.equal(c.dataset, 'prds');
  }
});

test('unknown environment tries PROD_ then NONPROD_ pairs as a whole', () => {
  assert.equal(buildConfig({ ...NONPROD, ...PROD }, 'p').authToken, 'pr');
  assert.equal(buildConfig({ ...NONPROD }, 'p').authToken, 'np');
  const half = { PROD_FLUTTER_OTLP_ENDPOINT: 'https://prod', ...NONPROD };
  const c = buildConfig(half, 'p');
  assert.equal(c.endpointUrl, 'https://nonprod');
  assert.equal(c.authToken, 'np');
});

test('does not mix endpoint and headers across pairs', () => {
  const env = { DASH0_ENVIRONMENT: 'production', PROD_FLUTTER_OTLP_ENDPOINT: 'https://prod', ...NONPROD };
  assert.equal(buildConfig(env, 'p'), null);
  assert.match(disabledReason(env), /^missing endpoint .* and headers /);
});

test('preferred OTLP_* variables win over NONPROD_/PROD_ fallbacks', () => {
  const c = buildConfig(
    {
      OTLP_ENDPOINT: 'https://a',
      OTLP_HEADERS: 'Authorization=Bearer a,Dash0-Dataset=x',
      ...PROD,
      DASH0_ENVIRONMENT: 'production',
    },
    'p',
  );
  assert.equal(c.endpointUrl, 'https://a');
  assert.equal(c.authToken, 'a');
});

test('disabled message names the NONPROD_/PROD_ fallbacks', () => {
  assert.match(disabledReason({}), /NONPROD_\/PROD_FLUTTER_OTLP_ENDPOINT/);
  assert.match(disabledReason({}), /NONPROD_\/PROD_FLUTTER_OTLP_HEADERS/);
});
