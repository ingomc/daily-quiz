import { currentStreak } from '../core/stats';
import { CATEGORIES, POOL } from '../data/questions';
import { ensureRound, isFinished } from '../game';
import { streakLabel, type App } from './app';
import { formatDate, h } from './dom';

export function renderHome(app: App): HTMLElement {
  const { today, data } = app;
  const played = data.history[today];
  const round = data.current?.date === today ? data.current : null;
  const answered = round && !isFinished(round) ? round.picks.length : 0;
  const streak = currentStreak(data.history, today);

  const play = () => {
    app.commit(ensureRound(app.data, POOL, app.today));
    app.go('question');
  };

  const main = played
    ? h(
        'section',
        { class: 'card today-done pop' },
        h('p', { class: 'eyebrow' }, 'Heute geschafft'),
        h('p', { class: 'big-score' }, String(played.score), h('span', null, ' / 10')),
        h('p', { class: 'muted' }, 'Morgen warten 10 neue Fragen auf dich.'),
        round && isFinished(round)
          ? h('button', { class: 'btn', type: 'button', onclick: () => app.go('result') }, 'Rückblick ansehen')
          : null,
      )
    : h(
        'section',
        { class: 'card today-open pop' },
        h('p', { class: 'eyebrow' }, 'Deine Runde für heute'),
        h('p', { class: 'lead' }, answered > 0 ? `Weiter mit Frage ${answered + 1} von 10` : '10 Fragen, bunt gemischt'),
        h(
          'button',
          { class: 'btn btn-primary btn-big', type: 'button', onclick: play },
          answered > 0 ? 'Weiterspielen' : 'Heute spielen',
        ),
      );

  return h(
    'div',
    { class: 'screen home' },
    h(
      'header',
      { class: 'hero' },
      h('div', { class: 'logo', 'aria-hidden': 'true' }, '?'),
      h('h1', { tabindex: '-1' }, 'Daily Quiz'),
      h('p', { class: 'muted' }, formatDate(today)),
    ),
    h(
      'div',
      { class: 'streak pop', 'data-active': streak > 0 ? 'true' : 'false' },
      h('span', { class: 'streak-flame', 'aria-hidden': 'true' }, '🔥'),
      h('span', null, streak > 0 ? streakLabel(streak) : 'Starte heute deine Serie'),
    ),
    main,
    app.persistent
      ? null
      : h(
          'p',
          { class: 'notice', role: 'status' },
          'Dein Browser erlaubt kein Speichern. Der Fortschritt geht beim Schließen verloren.',
        ),
    h('button', { class: 'btn', type: 'button', onclick: () => app.go('stats') }, 'Statistik'),
    h(
      'ul',
      { class: 'topics', 'aria-label': 'Themen' },
      ...CATEGORIES.map((c) =>
        h('li', { class: 'chip', 'data-category': c.id }, h('span', { 'aria-hidden': 'true' }, c.emoji), ' ', c.name),
      ),
    ),
  );
}
