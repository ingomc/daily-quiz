import type { SaveData } from '../types';

export type ScreenName = 'home' | 'question' | 'result' | 'stats';

/** What a screen may read and do; implemented in main.ts. */
export interface App {
  readonly today: string;
  readonly data: SaveData;
  readonly persistent: boolean;
  /** Stores new state (in memory and, where possible, on the device). */
  commit(data: SaveData): void;
  go(screen: ScreenName, options?: { celebrate?: boolean }): void;
}

export function streakLabel(days: number): string {
  return days === 1 ? '1 Tag in Folge' : `${days} Tage in Folge`;
}
