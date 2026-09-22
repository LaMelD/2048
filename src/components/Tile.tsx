import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colorFor, textColorFor, fontSizeFor } from '../game/colors';

type Props = {
  value: number;
  row: number;
  col: number;
  cellSize: number;
  gap: number;
  isNew: boolean;
};

export default function Tile({ value, row, col, cellSize, gap, isNew }: Props) {
  const x = gap + col * (cellSize + gap);
  const y = gap + row * (cellSize + gap);

  const pos = useRef(new Animated.ValueXY({ x, y })).current;
  const scale = useRef(new Animated.Value(isNew ? 0.5 : 1)).current;
  const firstRender = useRef(true);
  const prevValue = useRef(value);

  // 자리 이동
  useEffect(() => {
    if (firstRender.current) return;
    Animated.spring(pos, {
      toValue: { x, y },
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  }, [x, y, pos]);

  // 등장 팝 / 병합 팝
  useEffect(() => {
    const merged = !firstRender.current && value !== prevValue.current;
    prevValue.current = value;

    if (firstRender.current) {
      firstRender.current = false;
      if (!isNew) return;
    } else if (!merged) {
      return;
    }

    scale.setValue(merged ? 1.15 : 0.5);
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 180,
    }).start();
  }, [value, isNew, scale]);

  return (
    <Animated.View
      style={[
        styles.tile,
        {
          width: cellSize,
          height: cellSize,
          backgroundColor: colorFor(value),
          transform: [...pos.getTranslateTransform(), { scale }],
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: textColorFor(value), fontSize: fontSizeFor(value, cellSize) },
        ]}
        // 폰트 크기를 이미 값에 맞춰 줄였지만, 기기 글꼴 배율이 커도 칸을 넘지 않게 한다
        allowFontScaling={false}
      >
        {value}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
  },
});
