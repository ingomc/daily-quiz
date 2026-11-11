import { describe, expect, it } from 'vitest';
import type { History } from '../types';
import { pickRound } from './daily';
import { addDays, dateKey, diffDays } from './date';
import { mulberry32, shuffle } from './rng';
import { computeStats, currentStreak, longestStreak } from './stats';

describe('rng', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('shuffles without losing or changing items', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(items, mulberry32(5));
    expect(out).not.toBe(items);
    expect([...out].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('date', () => {
  it('formats the local day', () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dateKey(new Date(2026, 10, 11, 0, 0))).toBe('2026-11-11');
  });

  it('counts days across month, year and DST boundaries', () => {
    expect(diffDays('2026-01-01', '2026-01-02')).toBe(1);
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });
});

describe('pickRound', () => {
  const ids = Array.from({ length: 57 }, (_, i) => `q-${String(i).padStart(3, '0')}`);
  const today = '2026-11-11';
  const seeded = (seed: number) => mulberry32(seed);
  const played = (entries: Record<string, [id: string, correct: boolean][]>): History =>
    Object.fromEntries(
      Object.entries(entries).map(([date, list]) => [
        date,
        {
          score: list.filter(([, c]) => c).length,
          results: list.map(([id, correct]) => ({ id, category: 'x', correct })),
        },
      ]),
    );

  it('returns ten distinct questions with valid answer orders', () => {
    const pick = pickRound(ids, {}, today, seeded(1));
    expect(pick.questionIds).toHaveLength(10);
    expect(new Set(pick.questionIds).size).toBe(10);
    expect(pick.answerOrders).toHaveLength(10);
    for (const order of pick.answerOrders) {
      expect([...order].sort()).toEqual([0, 1, 2, 3]);
    }
  });

  it('is random: same source repeats, different sources differ', () => {
    expect(pickRound(ids, {}, today, seeded(7))).toEqual(pickRound(ids, {}, today, seeded(7)));
    expect(pickRound(ids, {}, today, seeded(7)).questionIds).not.toEqual(
      pickRound(ids, {}, today, seeded(8)).questionIds,
    );
    expect(pickRound(ids, {}, today).questionIds).toHaveLength(10);
  });

  it('never repeats a seen question while unseen ones remain', () => {
    let history: History = {};
    const seen = new Set<string>();
    for (let day = 0; day < 5; day++) {
      const date = addDays('2026-01-01', day);
      const pick = pickRound(ids, history, date, seeded(day));
      for (const id of pick.questionIds) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
      history = { ...history, ...played({ [date]: pick.questionIds.map((id) => [id, true]) }) };
    }
    expect(seen.size).toBe(50);
  });

  it('brings a missed question back after seven days, not earlier', () => {
    const history = played({ '2026-11-04': [['q-000', false]] });
    for (let offset = 1; offset <= 6; offset++) {
      const pick = pickRound(ids, history, addDays('2026-11-04', offset), seeded(offset));
      expect(pick.questionIds).not.toContain('q-000');
    }
    for (let seed = 0; seed < 20; seed++) {
      expect(pickRound(ids, history, today, seeded(seed)).questionIds).toContain('q-000');
    }
  });

  it('caps reviews at three per round and takes the oldest first', () => {
    const history = played({
      '2026-10-01': [['q-001', false]],
      '2026-10-02': [['q-002', false]],
      '2026-10-03': [['q-003', false]],
      '2026-10-04': [['q-004', false]],
      '2026-10-05': [['q-005', false]],
    });
    const pick = pickRound(ids, history, today, seeded(3)).questionIds;
    const reviews = pick.filter((id) => ['q-001', 'q-002', 'q-003', 'q-004', 'q-005'].includes(id));
    expect(reviews.sort()).toEqual(['q-001', 'q-002', 'q-003']);
  });

  it('treats a question as learned once the review was answered correctly', () => {
    const history = played({
      '2026-10-01': [['q-000', false]],
      '2026-10-20': [['q-000', true]],
    });
    expect(pickRound(ids, history, today, seeded(1)).questionIds).not.toContain('q-000');
  });

  it('waits another seven days after a failed review', () => {
    const history = played({
      '2026-10-01': [['q-000', false]],
      '2026-11-08': [['q-000', false]],
    });
    expect(pickRound(ids, history, today, seeded(1)).questionIds).not.toContain('q-000');
    expect(pickRound(ids, history, '2026-11-15', seeded(1)).questionIds).toContain('q-000');
  });

  it('ignores a round already recorded for today', () => {
    const history = played({ [today]: ids.slice(0, 10).map((id) => [id, true]) });
    expect(pickRound(ids, history, today, seeded(2))).toEqual(pickRound(ids, {}, today, seeded(2)));
  });

  it('falls back to the longest-unseen questions when the pool is used up', () => {
    const small = ids.slice(0, 12);
    const history = played({
      '2026-11-01': small.slice(0, 6).map((id) => [id, true]),
      '2026-11-09': small.slice(6, 12).map((id) => [id, true]),
    });
    const pick = pickRound(small, history, today, seeded(4)).questionIds;
    expect(new Set(pick).size).toBe(10);
    for (const id of small.slice(0, 6)) expect(pick).toContain(id);
  });

  it('rejects a pool that is too small', () => {
    expect(() => pickRound(ids.slice(0, 9), {}, today)).toThrow();
  });
});

describe('stats', () => {
  const day = (correct: number): History[string] => ({
    score: correct,
    results: Array.from({ length: 10 }, (_, i) => ({
      id: `q${i}`,
      category: i < 5 ? 'f1' : 'tech',
      correct: i < correct,
    })),
  });

  it('counts the streak up to today', () => {
    const history = { '2026-11-09': day(5), '2026-11-10': day(5), '2026-11-11': day(5) };
    expect(currentStreak(history, '2026-11-11')).toBe(3);
  });

  it('keeps the streak alive while today is still open', () => {
    const history = { '2026-11-09': day(5), '2026-11-10': day(5) };
    expect(currentStreak(history, '2026-11-11')).toBe(2);
  });

  it('resets the streak after a missed day', () => {
    const history = { '2026-11-08': day(5), '2026-11-09': day(5) };
    expect(currentStreak(history, '2026-11-11')).toBe(0);
    expect(currentStreak({}, '2026-11-11')).toBe(0);
  });

  it('finds the longest streak', () => {
    const history = {
      '2026-10-30': day(1),
      '2026-10-31': day(1),
      '2026-11-01': day(1),
      '2026-11-05': day(1),
      '2026-11-06': day(1),
    };
    expect(longestStreak(history)).toBe(3);
    expect(longestStreak({})).toBe(0);
  });

  it('aggregates totals, categories and recent days', () => {
    const stats = computeStats({ '2026-11-10': day(7), '2026-11-11': day(3) }, '2026-11-11');
    expect(stats.daysPlayed).toBe(2);
    expect(stats.totalAnswered).toBe(20);
    expect(stats.totalCorrect).toBe(10);
    expect(stats.byCategory).toEqual({
      f1: { correct: 8, total: 10 },
      tech: { correct: 2, total: 10 },
    });
    // Same ten ids on both days; the later day (3 correct) decides.
    expect(stats.openReviews).toBe(7);
    expect(stats.recentDays).toHaveLength(14);
    expect(stats.recentDays.at(-1)).toEqual({ date: '2026-11-11', score: 3 });
    expect(stats.recentDays.at(-2)).toEqual({ date: '2026-11-10', score: 7 });
    expect(stats.recentDays[0]).toEqual({ date: '2026-10-29', score: null });
  });
});
