import { describe, expect, it } from 'vitest';
import { CATEGORIES, QUESTIONS } from './questions';

describe('question pool', () => {
  it('has enough questions in every category', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(300);
    for (const category of CATEGORIES) {
      const count = QUESTIONS.filter((q) => q.category === category.id).length;
      expect(count, category.id).toBeGreaterThanOrEqual(20);
    }
  });

  it('only uses known categories', () => {
    const known = new Set(CATEGORIES.map((c) => c.id));
    for (const q of QUESTIONS) expect(known.has(q.category), q.id).toBe(true);
  });

  it('has unique ids that match their category', () => {
    const ids = new Set<string>();
    for (const q of QUESTIONS) {
      expect(q.id, q.id).toMatch(new RegExp(`^${q.category}-\\d{3}$`));
      expect(ids.has(q.id), `duplicate id ${q.id}`).toBe(false);
      ids.add(q.id);
    }
  });

  it('has well-formed questions', () => {
    for (const q of QUESTIONS) {
      expect(typeof q.question === 'string' && q.question.trim().length > 0, q.id).toBe(true);
      expect(Array.isArray(q.answers) && q.answers.length === 4, q.id).toBe(true);
      for (const a of q.answers) {
        expect(typeof a === 'string' && a.trim().length > 0, q.id).toBe(true);
      }
      const normalized = q.answers.map((a) => a.trim().toLowerCase());
      expect(new Set(normalized).size, `duplicate answers in ${q.id}`).toBe(4);
      expect(Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3, q.id).toBe(true);
      expect(typeof q.explanation === 'string' && q.explanation.trim().length > 0, q.id).toBe(true);
    }
  });

  it('has no duplicate question texts', () => {
    const seen = new Map<string, string>();
    for (const q of QUESTIONS) {
      const key = q.question.trim().toLowerCase();
      expect(seen.get(key), `${q.id} duplicates ${seen.get(key)}`).toBeUndefined();
      seen.set(key, q.id);
    }
  });
});
