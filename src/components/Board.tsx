import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { SIZE, type Direction, type Tile as TileType } from '../game/board';
import Tile from './Tile';

const GAP_RATIO = 0.03;  // 보드 한 변 대비 칸 사이 간격
const SWIPE_MIN = 20;    // 이보다 적게 움직이면 스와이프로 보지 않는다 (dp)

type Props = {
  tiles: TileType[];
  newTileIds: Set<number>;
  onSwipe: (dir: Direction) => void;
};

export default function Board({ tiles, newTileIds, onSwipe }: Props) {
  const [size, setSize] = useState(0);

  const gap = size * GAP_RATIO;
  const cellSize = size > 0 ? (size - gap * (SIZE + 1)) / SIZE : 0;

  // onSwipe가 매 렌더 바뀌어도 PanResponder를 새로 만들지 않도록 ref로 우회한다
  const swipeRef = useRef(onSwipe);
  swipeRef.current = onSwipe;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
        onPanResponderRelease: (_, g) => {
          const { dx, dy } = g;
          if (Math.abs(dx) < SWIPE_MIN && Math.abs(dy) < SWIPE_MIN) return;
          if (Math.abs(dx) > Math.abs(dy)) {
            swipeRef.current(dx > 0 ? 'right' : 'left');
          } else {
            swipeRef.current(dy > 0 ? 'down' : 'up');
          }
        },
      }),
    [],
  );

  // 빈 칸 배경. 타일과 같은 좌표 계산을 쓴다.
  const cells = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      cells.push(
        <View
          key={`cell-${r}-${c}`}
          style={[
            styles.cell,
            {
              width: cellSize,
              height: cellSize,
              left: gap + c * (cellSize + gap),
              top: gap + r * (cellSize + gap),
            },
          ]}
        />,
      );
    }
  }

  return (
    <View
      style={styles.board}
      onLayout={(e) => setSize(e.nativeEvent.layout.width)}
      {...responder.panHandlers}
    >
      {size > 0 && cells}
      {size > 0 &&
        tiles.map((t) => (
          <Tile
            key={t.id}
            value={t.value}
            row={t.row}
            col={t.col}
            cellSize={cellSize}
            gap={gap}
            isNew={newTileIds.has(t.id)}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#bbada0',
    borderRadius: 8,
  },
  cell: {
    position: 'absolute',
    backgroundColor: '#cdc1b4',
    borderRadius: 6,
  },
});
