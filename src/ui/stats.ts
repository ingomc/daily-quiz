import { computeStats } from '../core/stats';
import { CATEGORIES } from '../data/questions';
import type { App } from './app';
import { h } from './dom';

function percent(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

function tile(value: string, label: string): HTMLElement {
  return h('div', { class: 'tile pop' }, h('span', { class: 'tile-value' }, value), h('span', { class: 'tile-label' }, label));
}

export function renderStats(app: App): HTMLElement {
  const stats = computeStats(app.data.history, app.today);

  const bars = stats.recentDays.map(({ date, score }) => {
    const bar = h('span', { class: 'bar', 'data-empty': score === null ? 'true' : 'false' });
    bar.style.setProperty('--h', `${score === null ? 0 : Math.max(score, 0.4) * 10}%`);
    const day = Number(date.slice(8));
    return h(
      'li',
      { 'aria-label': `${day}.: ${score === null ? 'nicht gespielt' : `${score} von 10`}` },
      h('span', { class: 'bar-value', 'aria-hidden': 'true' }, score === null ? '' : String(score)),
      bar,
      h('span', { class: 'bar-day', 'aria-hidden': 'true' }, String(day)),
    );
  });

  const categories = CATEGORIES.filter((c) => stats.byCategory[c.id]).map((c) => {
    const { correct, total } = stats.byCategory[c.id]!;
    const value = percent(correct, total);
    const fill = h('span', { class: 'meter-fill' });
    fill.style.setProperty('--w', `${value}%`);
    return h(
      'li',
      { class: 'cat-row', 'data-category': c.id },
      h('span', { class: 'cat-name' }, h('span', { 'aria-hidden': 'true' }, c.emoji), ' ', c.name),
      h('span', { class: 'cat-value' }, `${value} % `, h('small', null, `(${correct}/${total})`)),
      h('span', { class: 'meter', 'aria-hidden': 'true' }, fill),
    );
  });

  const body =
    stats.daysPlayed === 0
      ? [h('p', { class: 'card muted' }, 'Noch keine Runde gespielt. Nach deinem ersten Quiz erscheint hier deine Statistik.')]
      : [
          h(
            'div',
            { class: 'tiles' },
            tile(String(stats.currentStreak), 'Serie aktuell'),
            tile(String(stats.longestStreak), 'Längste Serie'),
            tile(String(stats.daysPlayed), 'Gespielte Tage'),
            tile(`${percent(stats.totalCorrect, stats.totalAnswered)} %`, 'Trefferquote'),
          ),
          h('h2', null, 'Letzte 14 Tage'),
          h('ol', { class: 'card bars' }, ...bars),
          h('h2', null, 'Nach Thema'),
          h('ul', { class: 'card cats' }, ...categories),
        ];

  return h(
    'div',
    { class: 'screen stats' },
    h(
      'header',
      { class: 'q-top' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Zurück zur Startseite', onclick: () => app.go('home') }, '←'),
      h('h1', { tabindex: '-1' }, 'Statistik'),
    ),
    ...body,
  );
}
