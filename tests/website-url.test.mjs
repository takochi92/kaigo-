import test from 'node:test';
import assert from 'node:assert/strict';
import { websiteUrl } from '../scripts/website-url.mjs';
test('website links reject malformed source data without guessing destinations', () => {
  for (const input of ['http://', 'https://', 'http://a＠example.jp', 'http://a@example.jp', 'http://clinic .jp', 'http://care-net:biz/06/', 'javascript:alert(1)', 'https://a.jp, https://b.jp']) assert.equal(websiteUrl(input), '', input);
  assert.equal(websiteUrl('www.example.jp'), 'https://www.example.jp/');
  assert.equal(websiteUrl('https://example.jp/a?b=1'), 'https://example.jp/a?b=1');
});
