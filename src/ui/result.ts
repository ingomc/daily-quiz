import { currentStreak } from '../core/stats';
import { categoryOf, POOL } from '../data/questions';
import { streakLabel, type App } from './app';
import { h } from './dom';

function comment(score: number): string {
  if (score === 10) return 'Perfekt! Makellose Runde.';
  if (score >= 8) return 'Stark gespielt!';
  if (score >= 5) return 'Solide Runde.';
  if (score >= 3) return 'Da geht noch was.';
  return 'Morgen wird es besser.';
}

const CONFETTI_COLORS = ['#ffc83d', '#ff8fb8', '#6fd3ff', '#9be37a', '#6b4cf5', '#ff7a3d'];

function confetti(): HTMLElement {
  const layer = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  for (let i = 0; i < 70; i++) {
    const piece = h('i');
    piece.style.setProperty('--x', `${Math.random() * 100}%`);
    piece.style.setProperty('--drift', `${(Math.random() - 0.5) * 30}vw`);
    piece.style.setProperty('--spin', `${Math.random() * 900 - 450}deg`);
    piece.style.setProperty('--delay', `${Math.random() * 0.6}s`);
    piece.style.setProperty('--time', `${2.2 + Math.random() * 1.6}s`);
    piece.style.setProperty('--color', CONFETTI_COLORS[i % CONFETTI_COLORS.length]!);
    layer.append(piece);
  }
  layer.addEventListener('animationend', (event) => (event.target as Element).remove());
  return layer;
}

export function renderResult(app: App, celebrate: boolean): HTMLElement {
  const round = app.data.current;
  const day = app.data.history[app.today];
  if (!round || !day || round.date !== app.today) {
    throw new Error('No finished round to show');
  }
  const streak = currentStreak(app.data.history, app.today);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const review = round.questionIds.map((id, i) => {
    const question = POOL.get(id)!;
    const pick = round.picks[i]!;
    const correct = pick === question.correct;
    const category = categoryOf(question.category);
    return h(
      'li',
      { class: 'review-item', 'data-result': correct ? 'right' : 'wrong' },
      h('span', { class: 'review-mark', 'aria-hidden': 'true' }, correct ? '✓' : '✗'),
      h(
        'div',
        null,
        h('p', { class: 'review-cat' }, `${category.emoji} ${category.name}`),
        h('p', { class: 'review-q' }, question.question),
        correct
          ? h('p', { class: 'review-a' }, 'Richtig: ', h('strong', null, question.answers[pick]))
          : h(
              'p',
              { class: 'review-a' },
              'Deine Antwort: ',
              h('s', null, question.answers[pick]),
              h('br'),
              'Richtig: ',
              h('strong', null, question.answers[question.correct]),
            ),
      ),
    );
  });

  return h(
    'div',
    { class: 'screen result' },
    celebrate && day.score >= 8 && !reducedMotion ? confetti() : null,
    h(
      'header',
      { class: 'hero' },
      h('p', { class: 'eyebrow' }, 'Dein Ergebnis'),
      h(
        'div',
        { class: 'score-badge pop' },
        h('span', { class: 'score-num' }, String(day.score)),
        h('span', { class: 'score-of' }, 'von 10'),
      ),
      h('h1', { tabindex: '-1' }, comment(day.score)),
    ),
    h(
      'div',
      { class: 'streak pop', 'data-active': 'true' },
      h('span', { class: 'streak-flame', 'aria-hidden': 'true' }, '🔥'),
      h('span', null, streakLabel(streak)),
    ),
    h('h2', null, 'Rückblick'),
    h('ol', { class: 'review' }, ...review),
    h(
      'div',
      { class: 'row' },
      h('button', { class: 'btn', type: 'button', onclick: () => app.go('stats') }, 'Statistik'),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => app.go('home') }, 'Fertig'),
    ),
  );
}
