import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SIZE, type Tile as TileType } from '../game/board';
import Tile from './Tile';

const GAP_RATIO = 0.03; // 보드 한 변 대비 칸 사이 간격

type Props = {
  tiles: TileType[];
  ghosts: TileType[];
  newTileIds: Set<number>;
};

export default function Board({ tiles, ghosts, newTileIds }: Props) {
  const [size, setSize] = useState(0);

  const gap = size * GAP_RATIO;
  const cellSize = size > 0 ? (size - gap * (SIZE + 1)) / SIZE : 0;

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
    <View style={styles.board} onLayout={(e) => setSize(e.nativeEvent.layout.width)}>
      {size > 0 && cells}
      {size > 0 &&
        [...ghosts, ...tiles].map((t) => (
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
