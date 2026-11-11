import type { History } from '../types';
import { diffDays } from './date';
import { shuffle } from './rng';

export const QUESTIONS_PER_DAY = 10;
export const ANSWER_COUNT = 4;
/** A missed question comes back no sooner than this many days later. */
export const REVIEW_AFTER_DAYS = 7;
export const MAX_REVIEWS_PER_DAY = 3;

export interface DailyPick {
  questionIds: string[];
  /** Per question: display position -> original answer index. */
  answerOrders: number[][];
}

export interface Attempt {
  /** Day of the most recent attempt. */
  date: string;
  correct: boolean;
}

/** Most recent attempt per question; days before `before` only, if given. */
export function lastAttempts(history: History, before?: string): Map<string, Attempt> {
  const latest = new Map<string, Attempt>();
  for (const date of Object.keys(history).sort()) {
    if (before !== undefined && date >= before) break;
    for (const result of history[date]!.results) {
      latest.set(result.id, { date, correct: result.correct });
    }
  }
  return latest;
}

/** Longest-unseen first; ties in random order. */
function oldestFirst(ids: string[], attempts: Map<string, Attempt>, rand: () => number): string[] {
  return shuffle(ids, rand).sort((a, b) =>
    attempts.get(a)!.date.localeCompare(attempts.get(b)!.date),
  );
}

/**
 * Draws a round from the player's history: due reviews first (missed at least
 * REVIEW_AFTER_DAYS ago, capped), then unseen questions at random, then the
 * ones not seen for the longest time. The result is shuffled.
 */
export function pickRound(
  ids: readonly string[],
  history: History,
  today: string,
  rand: () => number = Math.random,
): DailyPick {
  if (ids.length < QUESTIONS_PER_DAY) {
    throw new Error(`Pool needs at least ${QUESTIONS_PER_DAY} questions`);
  }
  const attempts = lastAttempts(history, today);
  const unseen: string[] = [];
  const due: string[] = [];
  const known: string[] = [];
  const waiting: string[] = [];
  for (const id of [...ids].sort()) {
    const attempt = attempts.get(id);
    if (!attempt) unseen.push(id);
    else if (attempt.correct) known.push(id);
    else if (diffDays(attempt.date, today) >= REVIEW_AFTER_DAYS) due.push(id);
    else waiting.push(id);
  }

  const reviews = oldestFirst(due, attempts, rand).slice(0, MAX_REVIEWS_PER_DAY);
  const candidates = [
    ...reviews,
    ...shuffle(unseen, rand),
    ...oldestFirst(known, attempts, rand),
    // Only when everything else is used up: reviews beyond the cap, then early ones.
    ...oldestFirst(due, attempts, rand).filter((id) => !reviews.includes(id)),
    ...oldestFirst(waiting, attempts, rand),
  ];
  const questionIds = shuffle(candidates.slice(0, QUESTIONS_PER_DAY), rand);
  const base = Array.from({ length: ANSWER_COUNT }, (_, i) => i);
  return { questionIds, answerOrders: questionIds.map(() => shuffle(base, rand)) };
}
