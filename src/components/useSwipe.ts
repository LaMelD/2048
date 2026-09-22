import { useMemo, useRef } from 'react';
import { PanResponder } from 'react-native';
import type { Direction } from '../game/board';

const SWIPE_MIN = 20; // 이보다 적게 움직이면 스와이프로 보지 않는다 (dp)

/**
 * 스와이프를 방향으로 바꿔 준다. 반환값을 화면 전체 View에 {...}로 펼친다.
 * onSwipe가 매 렌더 바뀌어도 responder를 새로 만들지 않도록 ref로 우회한다.
 */
export function useSwipe(onSwipe: (dir: Direction) => void) {
  const swipeRef = useRef(onSwipe);
  swipeRef.current = onSwipe;

  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
        onPanResponderRelease: (_, g) => {
          const { dx, dy } = g;
          if (Math.abs(dx) < SWIPE_MIN && Math.abs(dy) < SWIPE_MIN) return;
          if (Math.abs(dx) > Math.abs(dy)) {
            swipeRef.current(dx > 0 ? 'right' : 'left');
          } else {
            swipeRef.current(dy > 0 ? 'down' : 'up');
          }
        },
      }).panHandlers,
    [],
  );
}
