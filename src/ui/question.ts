import { lastAttempts } from '../core/daily';
import { categoryOf, POOL } from '../data/questions';
import { answer, isFinished } from '../game';
import type { Round } from '../types';
import type { App } from './app';
import { h } from './dom';

const LETTERS = ['A', 'B', 'C', 'D'];

function progress(round: Round, index: number): HTMLElement {
  return h(
    'ol',
    { class: 'progress', 'aria-label': `Frage ${index + 1} von ${round.questionIds.length}` },
    ...round.questionIds.map((id, i) => {
      const state =
        i < round.picks.length
          ? round.picks[i] === POOL.get(id)?.correct
            ? 'right'
            : 'wrong'
          : i === index
            ? 'now'
            : 'todo';
      return h('li', { 'data-state': state });
    }),
  );
}

export function renderQuestion(app: App): HTMLElement {
  const round = app.data.current;
  if (!round || isFinished(round)) {
    throw new Error('No open question to show');
  }
  const index = round.picks.length;
  const id = round.questionIds[index]!;
  const question = POOL.get(id)!;
  const order = round.answerOrders[index]!;
  const category = categoryOf(question.category);
  const last = index === round.questionIds.length - 1;
  const isReview = lastAttempts(app.data.history, round.date).get(id)?.correct === false;

  const feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });
  const progressSlot = h('div', null, progress(round, index));

  const buttons = order.map((original, position) =>
    h(
      'button',
      {
        class: 'answer pop',
        type: 'button',
        onclick: () => choose(original),
      },
      h('span', { class: 'letter', 'data-letter': LETTERS[position] }, LETTERS[position]),
      h('span', { class: 'answer-text' }, question.answers[original]),
      h('span', { class: 'mark', 'aria-hidden': 'true' }),
    ),
  );

  function choose(original: number): void {
    const next = answer(app.data, POOL, original);
    app.commit(next);
    const correct = original === question.correct;

    order.forEach((value, position) => {
      const button = buttons[position]!;
      button.disabled = true;
      if (value === question.correct) button.dataset.result = 'right';
      else if (value === original) button.dataset.result = 'wrong';
      else button.dataset.result = 'other';
    });
    progressSlot.replaceChildren(progress(next.current!, -1));

    const nextButton = h(
      'button',
      {
        class: 'btn btn-primary btn-big',
        type: 'button',
        onclick: () => (last ? app.go('result', { celebrate: true }) : app.go('question')),
      },
      last ? 'Ergebnis ansehen' : 'Weiter',
    );
    feedback.replaceChildren(
      h(
        'div',
        { class: 'card explain pop', 'data-result': correct ? 'right' : 'wrong' },
        h('p', { class: 'verdict' }, correct ? 'Richtig! 🎉' : 'Leider falsch'),
        correct
          ? null
          : h('p', null, 'Richtig ist: ', h('strong', null, question.answers[question.correct])),
        h('p', null, question.explanation),
      ),
      nextButton,
    );
    nextButton.focus({ preventScroll: true });
    nextButton.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }

  return h(
    'div',
    { class: 'screen question' },
    h(
      'header',
      { class: 'q-top' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Zur Startseite', onclick: () => app.go('home') }, '✕'),
      progressSlot,
      h('span', { class: 'counter', 'aria-hidden': 'true' }, `${index + 1}/10`),
    ),
    h(
      'p',
      { class: 'chips' },
      h(
        'span',
        { class: 'chip', 'data-category': category.id },
        h('span', { 'aria-hidden': 'true' }, category.emoji),
        ' ',
        category.name,
      ),
      isReview
        ? h('span', { class: 'chip chip-review' }, h('span', { 'aria-hidden': 'true' }, '🔁'), ' Wiederholung')
        : null,
    ),
    h('h1', { class: 'q-text', tabindex: '-1' }, question.question),
    h('div', { class: 'answers' }, ...buttons),
    feedback,
  );
}
