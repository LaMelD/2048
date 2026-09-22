// 2048의 관례적인 팔레트. 값이 클수록 진해진다.
const TILE_COLORS: Record<number, string> = {
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#edc22e',
};

const BEYOND = '#3c3a32'; // 2048을 넘어선 타일

export function colorFor(value: number): string {
  return TILE_COLORS[value] ?? BEYOND;
}

export function textColorFor(value: number): string {
  // 밝은 타일(2, 4)에만 어두운 글자를 쓴다
  return value <= 4 ? '#776e65' : '#f9f6f2';
}

/** 자릿수가 늘수록 글자를 줄여 칸을 넘지 않게 한다. */
export function fontSizeFor(value: number, cellSize: number): number {
  const digits = String(value).length;
  if (digits <= 2) return cellSize * 0.45;
  if (digits === 3) return cellSize * 0.36;
  if (digits === 4) return cellSize * 0.28;
  return cellSize * 0.22;
}
