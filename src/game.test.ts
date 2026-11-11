import { describe, expect, it } from 'vitest';
import { answer, ensureRound, isFinished, type Pool } from './game';
import { createStore, emptySave, parseSave } from './storage';
import type { Question, SaveData } from './types';

function makePool(count: number): Pool {
  const questions: Question[] = Array.from({ length: count }, (_, i) => ({
    id: `q-${String(i).padStart(3, '0')}`,
    category: i % 2 ? 'tech' : 'f1',
    question: `Frage ${i}`,
    answers: ['a', 'b', 'c', 'd'],
    correct: i % 4,
    explanation: 'weil',
  }));
  return new Map(questions.map((q) => [q.id, q]));
}

function playAll(data: SaveData, pool: Pool, allCorrect: boolean): SaveData {
  let state = data;
  while (state.current && !isFinished(state.current)) {
    const id = state.current.questionIds[state.current.picks.length]!;
    const correct = pool.get(id)!.correct;
    state = answer(state, pool, allCorrect ? correct : (correct + 1) % 4);
  }
  return state;
}

describe('game', () => {
  const pool = makePool(40);
  const today = '2026-11-11';

  it('starts a round and resumes it on the same day', () => {
    const started = ensureRound(emptySave(), pool, today);
    expect(started.current?.questionIds).toHaveLength(10);
    const afterOne = answer(started, pool, 0);
    expect(afterOne.current?.picks).toEqual([0]);
    expect(ensureRound(afterOne, pool, today)).toBe(afterOne);
  });

  it('drops an unfinished round from another day', () => {
    const yesterday = answer(ensureRound(emptySave(), pool, '2026-11-10'), pool, 1);
    const next = ensureRound(yesterday, pool, today);
    expect(next.current?.date).toBe(today);
    expect(next.current?.picks).toEqual([]);
    expect(next.history).toEqual({});
  });

  it('writes history when the tenth question is answered', () => {
    const done = playAll(ensureRound(emptySave(), pool, today), pool, true);
    expect(done.history[today]?.score).toBe(10);
    expect(done.history[today]?.results).toHaveLength(10);
    expect(done.current && isFinished(done.current)).toBe(true);
    expect(() => answer(done, pool, 0)).toThrow();
  });

  it('scores wrong answers as wrong', () => {
    const done = playAll(ensureRound(emptySave(), pool, today), pool, false);
    expect(done.history[today]?.score).toBe(0);
  });

  it('keeps the finished round for review and never restarts the day', () => {
    const done = playAll(ensureRound(emptySave(), pool, today), pool, true);
    expect(ensureRound(done, pool, today)).toBe(done);
    const withoutReview = { ...done, current: null };
    expect(ensureRound(withoutReview, pool, today).current).toBeNull();
  });

  it('redraws when a saved round references unknown questions', () => {
    const started = ensureRound(emptySave(), pool, today);
    const smaller: Pool = new Map([...pool].filter(([id]) => id !== started.current!.questionIds[0]));
    const redrawn = ensureRound(answer(started, pool, 0), smaller, today);
    expect(redrawn.current?.picks).toEqual([]);
    expect(redrawn.current?.questionIds.every((id) => smaller.has(id))).toBe(true);
  });

  it('rejects invalid answers', () => {
    const started = ensureRound(emptySave(), pool, today);
    expect(() => answer(started, pool, 4)).toThrow();
    expect(() => answer(started, pool, -1)).toThrow();
    expect(() => answer(emptySave(), pool, 0)).toThrow();
  });
});

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

describe('storage', () => {
  const pool = makePool(40);

  it('round-trips a save', () => {
    const storage = memoryStorage();
    const store = createStore(storage, 'k');
    const data = playAll(ensureRound(emptySave(), pool, '2026-11-11'), pool, true);
    store.save(data);
    expect(createStore(storage, 'k').load()).toEqual(data);
    expect(store.persistent).toBe(true);
  });

  it('works in memory without storage', () => {
    const store = createStore(null);
    expect(store.persistent).toBe(false);
    expect(store.load()).toEqual(emptySave());
    expect(() => store.save(emptySave())).not.toThrow();
  });

  it('rejects malformed saves', () => {
    expect(parseSave('not json')).toBeNull();
    expect(parseSave('null')).toBeNull();
    expect(parseSave('{"version":2,"current":null,"history":{}}')).toBeNull();
    expect(parseSave('{"version":1,"current":{"date":"x"},"history":{}}')).toBeNull();
    expect(parseSave('{"version":1,"current":null,"history":{"2026-11-11":{"results":[{}]}}}')).toBeNull();
    const badOrder = {
      version: 1,
      history: {},
      current: { date: '2026-11-11', questionIds: ['a'], answerOrders: [[0, 0, 1, 2]], picks: [] },
    };
    expect(parseSave(JSON.stringify(badOrder))).toBeNull();
  });

  it('leaves unreadable data alone until a round is finished', () => {
    const storage = memoryStorage({ k: '{broken' });
    const store = createStore(storage, 'k');
    const started = ensureRound(store.load(), pool, '2026-11-11');
    store.save(started);
    expect(storage.map.get('k')).toBe('{broken');
    store.save(playAll(started, pool, true));
    expect(parseSave(storage.map.get('k')!)?.history['2026-11-11']?.score).toBe(10);
  });

  it('falls back to memory when writing fails', () => {
    const store = createStore({
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    });
    store.save(emptySave());
    expect(store.persistent).toBe(false);
  });
});
