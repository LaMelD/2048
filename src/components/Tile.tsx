import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colorFor, textColorFor, fontSizeFor } from '../game/colors';

// 이동 spring이 사실상 끝나는 시간. 병합된 숫자는 이 뒤에 바뀐다.
const MOVE_MS = 120;

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
  const mounted = useRef(false);
  // 화면에 보이는 값. 병합으로 value가 바뀌어도 이동이 끝날 때까지는 옛 값을 보여 준다.
  const [shown, setShown] = useState(value);

  // 자리 이동
  useEffect(() => {
    if (!mounted.current) return;
    Animated.spring(pos, {
      toValue: { x, y },
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  }, [x, y, pos]);

  // 등장 팝 (마운트 1회)
  useEffect(() => {
    mounted.current = true;
    if (!isNew) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 180,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 병합 팝 — 이동이 끝난 뒤 값을 바꾸고 튕긴다
  useEffect(() => {
    if (value === shown) return;
    const t = setTimeout(() => {
      setShown(value);
      scale.setValue(1.15);
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 180,
      }).start();
    }, MOVE_MS);
    return () => clearTimeout(t);
  }, [value, shown, scale]);

  return (
    <Animated.View
      style={[
        styles.tile,
        {
          width: cellSize,
          height: cellSize,
          backgroundColor: colorFor(shown),
          transform: [...pos.getTranslateTransform(), { scale }],
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: textColorFor(shown), fontSize: fontSizeFor(shown, cellSize) },
        ]}
        allowFontScaling={false}
      >
        {shown}
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
