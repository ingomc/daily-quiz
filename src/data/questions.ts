import type { Question } from '../types';

export interface Category {
  id: string;
  name: string;
  emoji: string;
}

export const CATEGORIES: readonly Category[] = [
  { id: 'science', name: 'Naturwissenschaft', emoji: '🔬' },
  { id: 'math', name: 'Mathematik', emoji: '📐' },
  { id: 'geography', name: 'Geografie', emoji: '🌍' },
  { id: 'history', name: 'Geschichte', emoji: '🏛️' },
  { id: 'language', name: 'Sprache & Literatur', emoji: '📚' },
  { id: 'arts', name: 'Kunst & Musik', emoji: '🎨' },
  { id: 'sports', name: 'Sport', emoji: '⚽' },
  { id: 'f1', name: 'Formel 1', emoji: '🏎️' },
  { id: 'startrek', name: 'Star Trek', emoji: '🖖' },
  { id: 'tech', name: 'Technik', emoji: '💻' },
];

const FALLBACK: Category = { id: 'other', name: 'Sonstiges', emoji: '❓' };

export function categoryOf(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? FALLBACK;
}

type RawQuestion = Omit<Question, 'category'>;

const files = import.meta.glob<RawQuestion[]>('./questions/*.json', {
  eager: true,
  import: 'default',
});

export const QUESTIONS: readonly Question[] = Object.entries(files).flatMap(([path, list]) => {
  const category = path.slice(path.lastIndexOf('/') + 1, -'.json'.length);
  return list.map((q) => ({ ...q, category }));
});

export const POOL: ReadonlyMap<string, Question> = new Map(QUESTIONS.map((q) => [q.id, q]));
