import './style.css';
import { dateKey } from './core/date';
import { POOL } from './data/questions';
import { isFinished } from './game';
import { reportDone, syncPush } from './push';
import { browserStorage, createStore } from './storage';
import type { SaveData } from './types';
import type { App, ScreenName } from './ui/app';
import { renderHome } from './ui/home';
import { renderQuestion } from './ui/question';
import { renderResult } from './ui/result';
import { renderStats } from './ui/stats';

const root = document.getElementById('app')!;
const store = createStore(browserStorage());

let data: SaveData = store.load();
let today = dateKey();
let screen: ScreenName = 'home';

const app: App = {
  get today() {
    return today;
  },
  get data() {
    return data;
  },
  get persistent() {
    return store.persistent;
  },
  commit(next) {
    data = next;
    store.save(next);
    const round = next.current;
    if (round && isFinished(round) && next.history[round.date]) void reportDone(round.date);
  },
  go(name, options) {
    show(name, options?.celebrate ?? false);
  },
};

function canShow(name: ScreenName): boolean {
  const round = data.current;
  const usable = round !== null && round.questionIds.every((id) => POOL.has(id));
  if (name === 'question') return usable && !isFinished(round);
  if (name === 'result') {
    return usable && round.date === today && isFinished(round) && data.history[today] !== undefined;
  }
  return true;
}

function show(name: ScreenName, celebrate = false): void {
  // A running round keeps its own day; everything else follows the clock.
  if (name !== 'question') today = dateKey();
  screen = canShow(name) ? name : 'home';
  const view =
    screen === 'question'
      ? renderQuestion(app)
      : screen === 'result'
        ? renderResult(app, celebrate)
        : screen === 'stats'
          ? renderStats(app)
          : renderHome(app);
  root.replaceChildren(view);
  window.scrollTo(0, 0);
  view.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
}

// Left open overnight: refresh once the day has changed, but not mid-question.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && screen !== 'question' && dateKey() !== today) {
    show(screen);
  }
});

show('home');
void syncPush(data.history[today] ? today : null);
