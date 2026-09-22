import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import Board from './src/components/Board';
import Header from './src/components/Header';
import { useSwipe } from './src/components/useSwipe';
import {
  isGameOver, move, newGame,
  type Direction, type GameState, type Tile,
} from './src/game/board';
import { load, save } from './src/storage';

// 고스트가 목표 칸까지 미끄러진 뒤 사라지기까지. Tile의 MOVE_MS(120)보다 조금 길다.
const GHOST_MS = 150;

export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [best, setBest] = useState(0);
  const [prev, setPrev] = useState<GameState | null>(null);

  // 이번 수에 새로 생긴 타일 id. 등장 팝 대상.
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  // 이번 수에 병합으로 사라진 타일. 목표 칸까지 미끄러진 뒤 비운다.
  const [ghosts, setGhosts] = useState<Tile[]>([]);

  // 최초 1회: 저장된 판을 복원하거나 새 게임을 시작한다
  useEffect(() => {
    let alive = true;
    load().then((saved) => {
      if (!alive) return;
      if (saved) {
        setState({ tiles: saved.tiles, score: saved.score, nextId: saved.nextId });
        setBest(saved.best);
        setNewIds(new Set()); // 복원된 판은 팝 없이 그냥 보인다
      } else {
        const fresh = newGame();
        setState(fresh);
        setNewIds(new Set(fresh.tiles.map((t) => t.id)));
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  // 상태가 바뀔 때마다 저장한다. 실패는 storage가 삼킨다.
  useEffect(() => {
    if (!state) return;
    save({ tiles: state.tiles, score: state.score, nextId: state.nextId, best });
  }, [state, best]);

  // 고스트는 이동이 끝나면 지운다
  useEffect(() => {
    if (ghosts.length === 0) return;
    const t = setTimeout(() => setGhosts([]), GHOST_MS);
    return () => clearTimeout(t);
  }, [ghosts]);

  // setState의 updater 안에서 다른 setState를 부르지 않는다.
  // updater는 순수해야 하며, StrictMode에서는 두 번 호출될 수 있다.
  const handleSwipe = useCallback(
    (dir: Direction) => {
      if (!state) return;
      const next = move(state, dir);
      if (next === state) return; // 막힌 방향 — 아무 일도 없었다

      // move는 이동 후 새 타일을 하나 더한다. 그 id만 골라낸다.
      const before = new Set(state.tiles.map((t) => t.id));
      setNewIds(new Set(next.tiles.filter((t) => !before.has(t.id)).map((t) => t.id)));
      setGhosts(next.ghosts ?? []);
      setPrev(state);
      setState(next);
      setBest((b) => Math.max(b, next.score));
    },
    [state],
  );

  const handleUndo = useCallback(() => {
    if (!prev) return;
    setNewIds(new Set());
    setGhosts([]);
    setState(prev);
    setPrev(null); // 되돌리기는 1회뿐이다
  }, [prev]);

  const handleNewGame = useCallback(() => {
    const fresh = newGame();
    setNewIds(new Set(fresh.tiles.map((t) => t.id)));
    setGhosts([]);
    setPrev(null);
    setState(fresh);
  }, []);

  const swipe = useSwipe(handleSwipe);

  if (!state) {
    return <SafeAreaView style={styles.screen} />;
  }

  const over = isGameOver(state);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#faf8ef" />
      <View style={styles.content} {...swipe}>
        <Header
          score={state.score}
          best={best}
          canUndo={prev !== null}
          onNewGame={handleNewGame}
          onUndo={handleUndo}
        />
        <Board tiles={state.tiles} ghosts={ghosts} newTileIds={newIds} />
        {over && (
          <Text style={styles.gameOver} accessibilityLiveRegion="polite">
            더 이상 움직일 수 없습니다. 새 게임을 눌러주세요.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#faf8ef' },
  content: { flex: 1, padding: 16, justifyContent: 'center' },
  gameOver: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#776e65',
  },
});
