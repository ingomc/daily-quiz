import { disablePush, enablePush, pushState, sendTestPush } from '../push';
import type { App } from './app';
import { h } from './dom';

const TEXT = {
  on: 'Du bekommst eine Benachrichtigung, wenn das Quiz um 22 Uhr noch offen ist.',
  off: 'Lass dich benachrichtigen, wenn das Quiz um 22 Uhr noch offen ist.',
  denied:
    'Benachrichtigungen sind für diese App blockiert. Erlaube sie in den Einstellungen deines Geräts.',
  unsupported:
    'Hier nicht verfügbar. Auf dem iPhone musst du die App zuerst zum Home-Bildschirm hinzufügen.',
} as const;

/** Card with the switch for the 22:00 reminder. */
export function renderReminder(app: App): HTMLElement {
  const box = h('section', { class: 'card reminder' });
  let busy = false;

  const draw = (note = ''): void => {
    const state = pushState();
    const canToggle = state === 'on' || state === 'off';

    const run = async (action: () => Promise<string>): Promise<void> => {
      if (busy) return;
      busy = true;
      box.setAttribute('aria-busy', 'true');
      let message = '';
      try {
        message = await action();
      } catch {
        message = 'Das hat nicht geklappt. Bitte versuche es später noch einmal.';
      }
      busy = false;
      box.removeAttribute('aria-busy');
      draw(message);
    };

    const toggle = () =>
      run(async () => {
        if (state === 'on') {
          await disablePush();
          return 'Erinnerung ausgeschaltet.';
        }
        const done = app.data.history[app.today] ? app.today : null;
        const result = await enablePush(done);
        return result === 'on' ? 'Erinnerung eingeschaltet.' : '';
      });

    const test = () =>
      run(async () => {
        const result = await sendTestPush();
        if (result === 'sent') return 'Test gesendet. Die Benachrichtigung sollte gleich erscheinen.';
        if (result === 'wait') return 'Bitte warte ein paar Sekunden bis zum nächsten Test.';
        return 'Der Test konnte nicht gesendet werden.';
      });

    const parts = [
      h(
        'div',
        { class: 'reminder-head' },
        h('span', { class: 'reminder-title', id: 'reminder-title' }, '🔔 Erinnerung um 22 Uhr'),
        canToggle
          ? h(
              'button',
              {
                class: 'switch',
                type: 'button',
                role: 'switch',
                'aria-checked': state === 'on' ? 'true' : 'false',
                'aria-labelledby': 'reminder-title',
                onclick: toggle,
              },
              h('span', { class: 'switch-knob' }),
            )
          : null,
      ),
      h('p', { class: 'muted' }, TEXT[state]),
      state === 'on' ? h('button', { class: 'btn btn-small', type: 'button', onclick: test }, 'Test senden') : null,
      h('p', { class: 'reminder-note', role: 'status' }, note),
    ];
    box.replaceChildren(...parts.filter((part) => part !== null));
  };

  draw();
  return box;
}
