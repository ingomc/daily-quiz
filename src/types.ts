export interface Question {
  id: string;
  category: string;
  question: string;
  answers: string[];
  correct: number;
  explanation: string;
}

export interface QuestionResult {
  id: string;
  category: string;
  correct: boolean;
}

export interface DayResult {
  score: number;
  results: QuestionResult[];
}

export type History = Record<string, DayResult>;

export interface Round {
  date: string;
  questionIds: string[];
  /** Per question: display position -> original answer index. */
  answerOrders: number[][];
  /** Chosen answers as original answer indexes, one per answered question. */
  picks: number[];
}

export interface SaveData {
  version: 1;
  current: Round | null;
  history: History;
}
