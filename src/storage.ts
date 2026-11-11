import { ANSWER_COUNT } from './core/daily';
import { isDateKey } from './core/date';
import type { DayResult, History, Round, SaveData } from './types';

export const STORAGE_KEY = 'daily-quiz:v1';

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface Store {
  load(): SaveData;
  save(data: SaveData): void;
  /** False once reading or writing has failed; progress is then in memory only. */
  readonly persistent: boolean;
}

export function emptySave(): SaveData {
  return { version: 1, current: null, history: {} };
}

function isIndex(value: unknown, limit: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < limit;
}

function parseRound(value: unknown): Round | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const { date, questionIds, answerOrders, picks } = v;
  if (!isDateKey(date)) return null;
  if (!Array.isArray(questionIds) || !questionIds.every((id) => typeof id === 'string')) return null;
  if (!Array.isArray(answerOrders) || answerOrders.length !== questionIds.length) return null;
  for (const order of answerOrders) {
    if (!Array.isArray(order) || order.length !== ANSWER_COUNT) return null;
    if (!order.every((i) => isIndex(i, ANSWER_COUNT))) return null;
    if (new Set(order).size !== ANSWER_COUNT) return null;
  }
  if (!Array.isArray(picks) || picks.length > questionIds.length) return null;
  if (!picks.every((p) => isIndex(p, ANSWER_COUNT))) return null;
  return { date, questionIds, answerOrders, picks };
}

function parseDay(value: unknown): DayResult | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.results)) return null;
  const results = [];
  for (const r of v.results) {
    if (typeof r !== 'object' || r === null) return null;
    const { id, category, correct } = r as Record<string, unknown>;
    if (typeof id !== 'string' || typeof category !== 'string' || typeof correct !== 'boolean') {
      return null;
    }
    results.push({ id, category, correct });
  }
  return { score: results.filter((r) => r.correct).length, results };
}

/** Returns null if the stored value is not a usable save. */
export function parseSave(raw: string): SaveData | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || typeof v.history !== 'object' || v.history === null) return null;
  const history: History = {};
  for (const [date, day] of Object.entries(v.history)) {
    const parsed = isDateKey(date) ? parseDay(day) : null;
    if (!parsed) return null;
    history[date] = parsed;
  }
  const current = v.current == null ? null : parseRound(v.current);
  if (v.current != null && !current) return null;
  return { version: 1, current, history };
}

export function createStore(storage: KeyValueStorage | null, key = STORAGE_KEY): Store {
  let persistent = storage !== null;
  // Unreadable data stays untouched until there is a finished round worth more.
  let holdWrites = false;

  return {
    get persistent() {
      return persistent;
    },
    load() {
      if (!storage) return emptySave();
      let raw: string | null;
      try {
        raw = storage.getItem(key);
      } catch {
        persistent = false;
        return emptySave();
      }
      if (raw === null) return emptySave();
      const parsed = parseSave(raw);
      if (!parsed) {
        holdWrites = true;
        return emptySave();
      }
      return parsed;
    },
    save(data) {
      if (!storage || !persistent) return;
      if (holdWrites) {
        if (Object.keys(data.history).length === 0) return;
        holdWrites = false;
      }
      try {
        storage.setItem(key, JSON.stringify(data));
      } catch {
        persistent = false;
      }
    },
  };
}

/** localStorage, or null where it is blocked (private mode, disabled storage). */
export function browserStorage(): KeyValueStorage | null {
  try {
    const storage = window.localStorage;
    const probe = `${STORAGE_KEY}:probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}
