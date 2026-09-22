import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slideLine, slide, move, newGame, isGameOver,
  SIZE, type Tile, type GameState,
} from './board.ts';

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

/** 2차원 값 배열로 상태를 만든다. 0은 빈칸이다. */
function stateOf(grid: number[][]): GameState {
  const tiles: Tile[] = [];
  let id = 0;
  grid.forEach((row, r) =>
    row.forEach((value, c) => {
      if (value !== 0) tiles.push({ id: id++, value, row: r, col: c });
    }),
  );
  return { tiles, score: 0, nextId: id };
}

/** 타일 배열을 2차원 값 배열로 되돌린다. 비교용. */
function gridOf(tiles: Tile[]): number[][] {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  tiles.forEach((t) => {
    grid[t.row][t.col] = t.value;
  });
  return grid;
}

test('왼쪽으로 밀면 타일이 왼쪽 끝으로 몰린다', () => {
  const s = stateOf([
    [0, 0, 0, 2],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const { tiles, changed } = slide(s, 'left');
  assert.equal(changed, true);
  assert.deepEqual(gridOf(tiles)[0], [2, 0, 0, 0]);
});

test('오른쪽으로 밀면 오른쪽 끝으로 몰린다', () => {
  const s = stateOf([
    [2, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const { tiles } = slide(s, 'right');
  assert.deepEqual(gridOf(tiles)[0], [0, 0, 0, 2]);
});

test('위로 밀면 위쪽 끝으로 몰린다', () => {
  const s = stateOf([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [2, 0, 0, 0],
  ]);
  const { tiles } = slide(s, 'up');
  assert.deepEqual(gridOf(tiles).map((r) => r[0]), [2, 0, 0, 0]);
});

test('아래로 밀면 아래쪽 끝으로 몰린다', () => {
  const s = stateOf([
    [2, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const { tiles } = slide(s, 'down');
  assert.deepEqual(gridOf(tiles).map((r) => r[0]), [0, 0, 0, 2]);
});

test('오른쪽으로 밀 때도 이중 병합이 없다', () => {
  const s = stateOf([
    [2, 2, 4, 4],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const { tiles, gained } = slide(s, 'right');
  assert.deepEqual(gridOf(tiles)[0], [0, 0, 4, 8]);
  assert.equal(gained, 12);
});

test('막힌 방향으로 밀면 changed가 false이고 상태가 그대로다', () => {
  const s = stateOf([
    [2, 4, 2, 4],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const { tiles, changed, gained } = slide(s, 'left');
  assert.equal(changed, false);
  assert.equal(gained, 0);
  assert.deepEqual(gridOf(tiles)[0], [2, 4, 2, 4]);
});

test('이동한 타일은 id를 유지한다', () => {
  const s = stateOf([
    [0, 0, 0, 2],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const original = s.tiles[0].id;
  const { tiles } = slide(s, 'left');
  assert.equal(tiles[0].id, original);
  assert.equal(tiles[0].col, 0);
});

test('slide는 입력 상태를 변경하지 않는다', () => {
  const s = stateOf([
    [0, 0, 0, 2],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  slide(s, 'left');
  assert.equal(s.tiles[0].col, 3);
});

test('newGame은 타일 2개로 시작한다', () => {
  const s = newGame();
  assert.equal(s.tiles.length, 2);
  assert.equal(s.score, 0);
});

test('newGame의 타일 값은 2 또는 4다', () => {
  for (let i = 0; i < 50; i++) {
    newGame().tiles.forEach((t) => assert.ok(t.value === 2 || t.value === 4));
  }
});

test('newGame의 타일은 서로 다른 칸에 놓인다', () => {
  for (let i = 0; i < 50; i++) {
    const [a, b] = newGame().tiles;
    assert.ok(a.row !== b.row || a.col !== b.col);
  }
});

test('newGame의 타일 id는 서로 다르다', () => {
  const s = newGame();
  assert.notEqual(s.tiles[0].id, s.tiles[1].id);
  assert.equal(s.nextId, 2);
});

test('move는 이동이 있으면 타일을 정확히 하나 늘린다', () => {
  const s = stateOf([
    [0, 0, 0, 2],
    [0, 0, 0, 2],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const after = move(s, 'up');
  // 2와 2가 병합되어 1개 → 새 타일 1개 추가 = 2개
  assert.equal(after.tiles.length, 2);
});

test('move는 병합 점수를 누적한다', () => {
  const s = stateOf([
    [2, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const after = move(s, 'left');
  assert.equal(after.score, 4);
});

test('막힌 방향으로 move하면 같은 객체가 그대로 돌아온다', () => {
  const s = stateOf([
    [2, 4, 2, 4],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const after = move(s, 'left');
  assert.equal(after, s); // 참조가 같아야 한다 → 새 타일이 생기지 않았다는 뜻
});

test('빈 칸이 있으면 게임오버가 아니다', () => {
  const s = stateOf([
    [2, 4, 8, 16],
    [4, 8, 16, 32],
    [8, 16, 32, 64],
    [16, 32, 64, 0],
  ]);
  assert.equal(isGameOver(s), false);
});

test('가득 찼어도 인접한 같은 값이 있으면 게임오버가 아니다', () => {
  const s = stateOf([
    [2, 2, 8, 16],
    [4, 8, 16, 32],
    [8, 16, 32, 64],
    [16, 32, 64, 128],
  ]);
  assert.equal(isGameOver(s), false);
});

test('가득 찼고 인접한 같은 값이 없으면 게임오버다', () => {
  const s = stateOf([
    [2, 4, 8, 16],
    [4, 8, 16, 32],
    [8, 16, 32, 64],
    [16, 32, 64, 128],
  ]);
  assert.equal(isGameOver(s), true);
});

test('세로로 인접한 같은 값도 게임오버가 아니다', () => {
  const s = stateOf([
    [2, 4, 8, 16],
    [2, 8, 16, 32],
    [8, 16, 32, 64],
    [16, 32, 64, 128],
  ]);
  assert.equal(isGameOver(s), false);
});
