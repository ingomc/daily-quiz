import { dayNumber } from './date';
import { hashString, mulberry32, shuffle } from './rng';

export const QUESTIONS_PER_DAY = 10;
export const ANSWER_COUNT = 4;

export interface DailyPick {
  questionIds: string[];
  /** Per question: display position -> original answer index. */
  answerOrders: number[][];
}

/**
 * Picks the day's questions without any stored state. The pool is played in
 * cycles: each cycle is its own seeded shuffle of all ids, and each day takes
 * the next window of ten, so no question repeats within a cycle.
 */
export function pickDaily(ids: readonly string[], date: string): DailyPick {
  const sorted = [...ids].sort();
  const daysPerCycle = Math.floor(sorted.length / QUESTIONS_PER_DAY);
  if (daysPerCycle < 1) {
    throw new Error(`Pool needs at least ${QUESTIONS_PER_DAY} questions`);
  }
  const day = dayNumber(date);
  const cycle = Math.floor(day / daysPerCycle);
  const slot = ((day % daysPerCycle) + daysPerCycle) % daysPerCycle;
  const order = shuffle(sorted, mulberry32(hashString(`cycle:${cycle}`)));
  const questionIds = order.slice(slot * QUESTIONS_PER_DAY, (slot + 1) * QUESTIONS_PER_DAY);
  const base = Array.from({ length: ANSWER_COUNT }, (_, i) => i);
  const answerOrders = questionIds.map((id) =>
    shuffle(base, mulberry32(hashString(`${date}:${id}`))),
  );
  return { questionIds, answerOrders };
}
