import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  score: number;
  best: number;
  canUndo: boolean;
  onNewGame: () => void;
  onUndo: () => void;
};

export default function Header({ score, best, canUndo, onNewGame, onUndo }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.title}>2048</Text>
        <View style={styles.scores}>
          <ScoreBox label="점수" value={score} />
          <ScoreBox label="최고" value={best} />
        </View>
      </View>
      <View style={styles.row}>
        <Pressable
          style={[styles.button, !canUndo && styles.buttonDisabled]}
          onPress={onUndo}
          disabled={!canUndo}
          accessibilityRole="button"
          accessibilityLabel="되돌리기"
          accessibilityState={{ disabled: !canUndo }}
        >
          <Text style={styles.buttonText}>되돌리기</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={onNewGame}
          accessibilityRole="button"
          accessibilityLabel="새 게임"
        >
          <Text style={styles.buttonText}>새 게임</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ScoreBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.scoreBox}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={styles.scoreValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 44, fontWeight: '800', color: '#776e65' },
  scores: { flexDirection: 'row', gap: 8 },
  scoreBox: {
    backgroundColor: '#bbada0',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 76,
  },
  scoreLabel: { color: '#eee4da', fontSize: 12, fontWeight: '700' },
  scoreValue: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  button: {
    backgroundColor: '#8f7a66',
    borderRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  buttonDisabled: { backgroundColor: '#c7b9ab' },
  buttonText: { color: '#f9f6f2', fontWeight: '700' },
});
