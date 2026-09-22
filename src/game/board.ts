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
