import { ANSWER_COUNT, QUESTIONS_PER_DAY, pickRound } from './core/daily';
import type { Question, Round, SaveData } from './types';

export type Pool = ReadonlyMap<string, Question>;

export function isFinished(round: Round): boolean {
  return round.picks.length >= round.questionIds.length;
}

function roundFitsPool(round: Round, pool: Pool): boolean {
  return round.questionIds.every((id) => pool.has(id));
}

/**
 * Returns state with a usable round for today: keeps today's round (running or
 * finished), otherwise draws a new one. Rounds from other days are dropped.
 */
export function ensureRound(
  data: SaveData,
  pool: Pool,
  today: string,
  rand: () => number = Math.random,
): SaveData {
  const current = data.current;
  if (current && current.date === today && roundFitsPool(current, pool)) {
    return data;
  }
  if (data.history[today]) {
    // Played today, but the review data is gone or stale: nothing to resume.
    return current ? { ...data, current: null } : data;
  }
  const pick = pickRound([...pool.keys()], data.history, today, rand);
  return { ...data, current: { date: today, ...pick, picks: [] } };
}

/** Records an answer (original answer index) for the next open question. */
export function answer(data: SaveData, pool: Pool, pick: number): SaveData {
  const round = data.current;
  if (!round || isFinished(round)) {
    throw new Error('No open question');
  }
  if (!Number.isInteger(pick) || pick < 0 || pick >= ANSWER_COUNT) {
    throw new Error('Invalid answer');
  }
  const next: Round = { ...round, picks: [...round.picks, pick] };
  if (!isFinished(next)) {
    return { ...data, current: next };
  }
  const results = next.questionIds.map((id, i) => {
    const question = pool.get(id);
    if (!question) throw new Error(`Unknown question ${id}`);
    return { id, category: question.category, correct: next.picks[i] === question.correct };
  });
  const score = results.filter((r) => r.correct).length;
  return {
    ...data,
    current: next,
    history: { ...data.history, [next.date]: { score, results } },
  };
}

export { QUESTIONS_PER_DAY };
