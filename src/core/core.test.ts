import { describe, expect, it } from 'vitest';
import type { History } from '../types';
import { pickDaily } from './daily';
import { addDays, dateKey, dayNumber, diffDays, EPOCH } from './date';
import { hashString, mulberry32, shuffle } from './rng';
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
    const out = shuffle(items, mulberry32(hashString('x')));
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
    expect(dayNumber(EPOCH)).toBe(0);
    expect(dayNumber('2026-01-02')).toBe(1);
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });
});

describe('pickDaily', () => {
  const ids = Array.from({ length: 57 }, (_, i) => `q-${String(i).padStart(3, '0')}`);

  it('returns ten distinct questions with valid answer orders', () => {
    const pick = pickDaily(ids, '2026-11-11');
    expect(pick.questionIds).toHaveLength(10);
    expect(new Set(pick.questionIds).size).toBe(10);
    for (const order of pick.answerOrders) {
      expect([...order].sort()).toEqual([0, 1, 2, 3]);
    }
  });

  it('is deterministic and independent of input order', () => {
    const reversed = [...ids].reverse();
    expect(pickDaily(reversed, '2026-11-11')).toEqual(pickDaily(ids, '2026-11-11'));
  });

  it('does not repeat a question within a cycle', () => {
    // 57 questions -> 5 days per cycle; epoch day starts a cycle.
    const seen = new Set<string>();
    for (let day = 0; day < 5; day++) {
      for (const id of pickDaily(ids, addDays(EPOCH, day)).questionIds) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
    }
    expect(seen.size).toBe(50);
  });

  it('reshuffles for the next cycle and handles days before the epoch', () => {
    const first = pickDaily(ids, EPOCH).questionIds;
    const nextCycle = pickDaily(ids, addDays(EPOCH, 5)).questionIds;
    expect(nextCycle).not.toEqual(first);
    expect(pickDaily(ids, addDays(EPOCH, -1)).questionIds).toHaveLength(10);
  });

  it('rejects a pool that is too small', () => {
    expect(() => pickDaily(ids.slice(0, 9), EPOCH)).toThrow();
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
    expect(stats.recentDays).toHaveLength(14);
    expect(stats.recentDays.at(-1)).toEqual({ date: '2026-11-11', score: 3 });
    expect(stats.recentDays.at(-2)).toEqual({ date: '2026-11-10', score: 7 });
    expect(stats.recentDays[0]).toEqual({ date: '2026-10-29', score: null });
  });
});
