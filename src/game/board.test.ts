import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slideLine, type Tile } from './board.ts';

// 값 배열로부터 타일 배열을 만든다. id는 0부터, 좌표는 검사하지 않으므로 0.
function line(...values: number[]): Tile[] {
  return values.map((value, id) => ({ id, value, row: 0, col: 0 }));
}

const values = (tiles: Tile[]) => tiles.map((t) => t.value);

test('빈 줄은 빈 결과', () => {
  const { result, gained } = slideLine(line());
  assert.deepEqual(values(result), []);
  assert.equal(gained, 0);
});

test('병합 대상이 없으면 값이 그대로', () => {
  const { result, gained } = slideLine(line(2, 4, 8));
  assert.deepEqual(values(result), [2, 4, 8]);
  assert.equal(gained, 0);
});

test('같은 값 두 개는 병합된다', () => {
  const { result, gained } = slideLine(line(2, 2));
  assert.deepEqual(values(result), [4]);
  assert.equal(gained, 4);
});

test('한 수에 같은 타일이 두 번 병합되지 않는다', () => {
  // 2 2 4 4 는 8 이 아니라 4 8 이 되어야 한다
  const { result, gained } = slideLine(line(2, 2, 4, 4));
  assert.deepEqual(values(result), [4, 8]);
  assert.equal(gained, 12);
});

test('연속 세 개는 앞쪽 둘만 병합된다', () => {
  const { result, gained } = slideLine(line(2, 2, 2));
  assert.deepEqual(values(result), [4, 2]);
  assert.equal(gained, 4);
});

test('네 개가 같으면 두 쌍이 된다', () => {
  const { result, gained } = slideLine(line(4, 4, 4, 4));
  assert.deepEqual(values(result), [8, 8]);
  assert.equal(gained, 16);
});

test('병합된 타일은 앞쪽 타일의 id를 물려받는다', () => {
  const { result } = slideLine(line(2, 2));
  assert.equal(result[0].id, 0);
});

test('입력 배열을 변경하지 않는다', () => {
  const input = line(2, 2);
  slideLine(input);
  assert.deepEqual(values(input), [2, 2]);
});
