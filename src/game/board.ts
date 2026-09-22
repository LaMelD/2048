export const SIZE = 4;

export type Direction = 'up' | 'down' | 'left' | 'right';

export type Tile = {
  id: number;
  value: number;
  row: number;
  col: number;
};

export type GameState = {
  tiles: Tile[];
  score: number;
  nextId: number;
  /**
   * 이번 수에 병합으로 사라진 타일. 합쳐진 타일의 최종 좌표를 갖는다.
   * 화면은 이 타일을 그 자리까지 미끄러뜨린 뒤 지운다. 저장하지 않는다.
   */
  ghosts?: Tile[];
};

/**
 * 미는 방향 앞쪽부터 정렬된 타일들을 앞으로 몰아붙이고 병합한다.
 * 좌표는 건드리지 않는다. 호출자가 결과 순서에 맞춰 부여한다.
 * 한 수에서 이미 병합된 타일은 다시 병합되지 않는다.
 */
export function slideLine(line: Tile[]): {
  result: Tile[];
  gained: number;
  removed: { tile: Tile; into: number }[];
} {
  const result: Tile[] = [];
  const removed: { tile: Tile; into: number }[] = [];
  let gained = 0;
  let i = 0;

  while (i < line.length) {
    const a = line[i];
    const b = line[i + 1];
    if (b && b.value === a.value) {
      const merged = { ...a, value: a.value * 2 };
      result.push(merged);
      removed.push({ tile: { ...b }, into: result.length - 1 });
      gained += merged.value;
      i += 2; // 병합에 쓰인 두 타일을 건너뛴다 → 같은 수에 재병합 불가
    } else {
      result.push({ ...a });
      i += 1;
    }
  }

  return { result, gained, removed };
}

/**
 * 한 수 이동. 새 타일은 놓지 않는다 (무작위성 없음 → 결정적 테스트 가능).
 * changed가 false면 tiles는 입력과 같은 배치다.
 */
export function slide(
  state: GameState,
  dir: Direction,
): { tiles: Tile[]; gained: number; changed: boolean; ghosts: Tile[] } {
  const horizontal = dir === 'left' || dir === 'right';
  const forward = dir === 'left' || dir === 'up'; // 인덱스 0 쪽으로 미는가
  const next: Tile[] = [];
  const ghosts: Tile[] = [];
  let gained = 0;

  const place = (t: Tile, k: number, idx: number): Tile => {
    const pos = forward ? idx : SIZE - 1 - idx;
    return horizontal ? { ...t, row: k, col: pos } : { ...t, row: pos, col: k };
  };

  for (let k = 0; k < SIZE; k++) {
    const lane = state.tiles
      .filter((t) => (horizontal ? t.row : t.col) === k)
      .sort((a, b) => {
        const pa = horizontal ? a.col : a.row;
        const pb = horizontal ? b.col : b.row;
        return forward ? pa - pb : pb - pa;
      });

    const { result, gained: g, removed } = slideLine(lane);
    gained += g;

    result.forEach((t, idx) => next.push(place(t, k, idx)));
    // 사라진 타일은 합쳐진 타일과 같은 자리로 보낸다
    removed.forEach(({ tile, into }) => ghosts.push(place(tile, k, into)));
  }

  return { tiles: next, gained, changed: hasChanged(state.tiles, next), ghosts };
}

/** 병합으로 타일이 줄었거나, 어느 타일이든 자리가 바뀌었으면 변화로 본다. */
function hasChanged(before: Tile[], after: Tile[]): boolean {
  if (before.length !== after.length) return true;
  const byId = new Map(after.map((t) => [t.id, t]));
  return before.some((t) => {
    const a = byId.get(t.id);
    return !a || a.row !== t.row || a.col !== t.col || a.value !== t.value;
  });
}

/** 빈 칸 하나를 골라 새 타일을 놓는다. 빈 칸이 없으면 그대로 돌려준다. */
function addRandomTile(tiles: Tile[], nextId: number): { tiles: Tile[]; nextId: number } {
  const occupied = new Set(tiles.map((t) => t.row * SIZE + t.col));
  const empty: number[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (!occupied.has(i)) empty.push(i);
  }
  if (empty.length === 0) return { tiles, nextId };

  const spot = empty[Math.floor(Math.random() * empty.length)];
  const tile: Tile = {
    id: nextId,
    value: Math.random() < 0.9 ? 2 : 4, // 2가 90%, 4가 10%
    row: Math.floor(spot / SIZE),
    col: spot % SIZE,
  };
  return { tiles: [...tiles, tile], nextId: nextId + 1 };
}

export function newGame(): GameState {
  let tiles: Tile[] = [];
  let nextId = 0;
  for (let i = 0; i < 2; i++) {
    const added = addRandomTile(tiles, nextId);
    tiles = added.tiles;
    nextId = added.nextId;
  }
  return { tiles, score: 0, nextId };
}

/**
 * 한 수를 둔다. 이동이 없었다면 입력 state를 그대로 반환한다.
 * 호출자는 반환값이 입력과 같은 객체인지로 "헛스와이프"를 판별할 수 있다.
 */
export function move(state: GameState, dir: Direction): GameState {
  const { tiles, gained, changed, ghosts } = slide(state, dir);
  if (!changed) return state;

  const added = addRandomTile(tiles, state.nextId);
  return {
    tiles: added.tiles,
    score: state.score + gained,
    nextId: added.nextId,
    ghosts,
  };
}

/** 빈 칸이 없고 인접한 같은 값도 없으면 끝이다. */
export function isGameOver(state: GameState): boolean {
  if (state.tiles.length < SIZE * SIZE) return false;

  const grid = new Map(state.tiles.map((t) => [t.row * SIZE + t.col, t.value]));
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid.get(r * SIZE + c);
      if (c + 1 < SIZE && grid.get(r * SIZE + c + 1) === v) return false;
      if (r + 1 < SIZE && grid.get((r + 1) * SIZE + c) === v) return false;
    }
  }
  return true;
}
