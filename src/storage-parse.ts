import type { Tile } from './game/board';

export type Saved = {
  tiles: Tile[];
  score: number;
  nextId: number;
  best: number;
};

function isTile(v: unknown): v is Tile {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.id === 'number' &&
    typeof t.value === 'number' &&
    typeof t.row === 'number' &&
    typeof t.col === 'number'
  );
}

/**
 * 저장된 문자열을 Saved로 바꾼다. 조금이라도 모양이 어긋나면 null이다.
 * 앱 버전이 바뀌어 옛 데이터가 남아 있어도 조용히 새 게임으로 떨어진다.
 */
export function parseSaved(raw: string | null): Saved | null {
  if (!raw) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.tiles) || !o.tiles.every(isTile)) return null;
  if (typeof o.score !== 'number') return null;
  if (typeof o.nextId !== 'number') return null;
  if (typeof o.best !== 'number') return null;
  return { tiles: o.tiles, score: o.score, nextId: o.nextId, best: o.best };
}
