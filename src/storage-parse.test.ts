import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSaved } from './storage-parse.ts';

const valid = JSON.stringify({
  tiles: [{ id: 0, value: 2, row: 0, col: 0 }],
  score: 4,
  nextId: 1,
  best: 100,
});

test('정상 JSON을 파싱한다', () => {
  const s = parseSaved(valid);
  assert.equal(s?.score, 4);
  assert.equal(s?.best, 100);
  assert.equal(s?.tiles.length, 1);
});

test('null 입력은 null을 돌려준다', () => {
  assert.equal(parseSaved(null), null);
});

test('깨진 JSON은 null을 돌려준다 (throw하지 않는다)', () => {
  assert.equal(parseSaved('{ 이건 JSON이 아니다'), null);
});

test('tiles가 배열이 아니면 null', () => {
  assert.equal(parseSaved(JSON.stringify({ tiles: 'x', score: 0, nextId: 0, best: 0 })), null);
});

test('숫자여야 할 필드가 숫자가 아니면 null', () => {
  assert.equal(parseSaved(JSON.stringify({ tiles: [], score: 'a', nextId: 0, best: 0 })), null);
});

test('타일 모양이 틀리면 null', () => {
  assert.equal(
    parseSaved(JSON.stringify({ tiles: [{ id: 0 }], score: 0, nextId: 1, best: 0 })),
    null,
  );
});
