import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseSaved, type Saved } from './storage-parse';

const KEY = 'game2048.v1';

export type { Saved };

export async function load(): Promise<Saved | null> {
  try {
    return parseSaved(await AsyncStorage.getItem(KEY));
  } catch {
    return null;
  }
}

/** 저장 실패는 무시한다. 게임이 멈출 이유가 없다. */
export async function save(data: Saved): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 의도적으로 무시
  }
}
