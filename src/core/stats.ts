import type { History } from '../types';
import { lastAttempts } from './daily';
import { addDays, diffDays } from './date';

export interface Stats {
  daysPlayed: number;
  currentStreak: number;
  longestStreak: number;
  totalCorrect: number;
  totalAnswered: number;
  /** Oldest first; score is null for days without a finished round. */
  recentDays: { date: string; score: number | null }[];
  byCategory: Record<string, { correct: number; total: number }>;
  /** Questions whose most recent attempt was wrong. */
  openReviews: number;
}

export const RECENT_DAYS = 14;

/** Consecutive played days ending today, or yesterday if today is still open. */
export function currentStreak(history: History, today: string): number {
  let day = history[today] ? today : addDays(today, -1);
  let streak = 0;
  while (history[day]) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}

export function longestStreak(history: History): number {
  const days = Object.keys(history).sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of days) {
    run = previous !== null && diffDays(previous, day) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

export function computeStats(history: History, today: string): Stats {
  const byCategory: Stats['byCategory'] = {};
  let totalCorrect = 0;
  let totalAnswered = 0;
  for (const day of Object.values(history)) {
    for (const result of day.results) {
      const entry = (byCategory[result.category] ??= { correct: 0, total: 0 });
      entry.total++;
      totalAnswered++;
      if (result.correct) {
        entry.correct++;
        totalCorrect++;
      }
    }
  }
  const recentDays = Array.from({ length: RECENT_DAYS }, (_, i) => {
    const date = addDays(today, i - (RECENT_DAYS - 1));
    return { date, score: history[date]?.score ?? null };
  });
  return {
    daysPlayed: Object.keys(history).length,
    currentStreak: currentStreak(history, today),
    longestStreak: longestStreak(history),
    totalCorrect,
    totalAnswered,
    recentDays,
    byCategory,
    openReviews: [...lastAttempts(history).values()].filter((a) => !a.correct).length,
  };
}
