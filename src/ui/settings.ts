import { CATEGORIES } from '../data/questions';
import type { App } from './app';
import { h } from './dom';
import { renderReminder } from './reminder';

/** Everything that is not needed for the daily round: reminder and topic overview. */
export function renderSettings(app: App): HTMLElement {
  return h(
    'div',
    { class: 'screen settings' },
    h(
      'header',
      { class: 'q-top' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Zurück zur Startseite', onclick: () => app.go('home') }, '←'),
      h('h1', { tabindex: '-1' }, 'Einstellungen'),
    ),
    renderReminder(app),
    h('h2', null, 'Themen im Quiz'),
    h(
      'ul',
      { class: 'topics', 'aria-label': 'Themen' },
      ...CATEGORIES.map((c) =>
        h('li', { class: 'chip', 'data-category': c.id }, h('span', { 'aria-hidden': 'true' }, c.emoji), ' ', c.name),
      ),
    ),
  );
}
