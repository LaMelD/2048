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
};

/**
 * 미는 방향 앞쪽부터 정렬된 타일들을 앞으로 몰아붙이고 병합한다.
 * 좌표는 건드리지 않는다. 호출자가 결과 순서에 맞춰 부여한다.
 * 한 수에서 이미 병합된 타일은 다시 병합되지 않는다.
 */
export function slideLine(line: Tile[]): { result: Tile[]; gained: number } {
  const result: Tile[] = [];
  let gained = 0;
  let i = 0;

  while (i < line.length) {
    const a = line[i];
    const b = line[i + 1];
    if (b && b.value === a.value) {
      const merged = { ...a, value: a.value * 2 };
      result.push(merged);
      gained += merged.value;
      i += 2; // 병합에 쓰인 두 타일을 건너뛴다 → 같은 수에 재병합 불가
    } else {
      result.push({ ...a });
      i += 1;
    }
  }

  return { result, gained };
}

/**
 * 한 수 이동. 새 타일은 놓지 않는다 (무작위성 없음 → 결정적 테스트 가능).
 * changed가 false면 tiles는 입력과 같은 배치다.
 */
export function slide(
  state: GameState,
  dir: Direction,
): { tiles: Tile[]; gained: number; changed: boolean } {
  const horizontal = dir === 'left' || dir === 'right';
  const forward = dir === 'left' || dir === 'up'; // 인덱스 0 쪽으로 미는가
  const next: Tile[] = [];
  let gained = 0;

  for (let k = 0; k < SIZE; k++) {
    // k번째 줄의 타일: 가로 이동이면 row===k, 세로 이동이면 col===k
    const lane = state.tiles
      .filter((t) => (horizontal ? t.row : t.col) === k)
      .sort((a, b) => {
        const pa = horizontal ? a.col : a.row;
        const pb = horizontal ? b.col : b.row;
        return forward ? pa - pb : pb - pa;
      });

    const { result, gained: g } = slideLine(lane);
    gained += g;

    result.forEach((t, idx) => {
      const pos = forward ? idx : SIZE - 1 - idx;
      next.push(horizontal ? { ...t, row: k, col: pos } : { ...t, row: pos, col: k });
    });
  }

  return { tiles: next, gained, changed: hasChanged(state.tiles, next) };
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
