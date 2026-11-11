type Child = Node | string | number | null | false | undefined;
type Attrs = Record<string, string | boolean | ((event: Event) => void) | undefined>;

/**
 * Creates an element. Attribute keys starting with "on" attach listeners,
 * everything else is set as an attribute. Children are added as text nodes,
 * never parsed as HTML.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === undefined || value === false) continue;
    if (typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value === true ? '' : value);
    }
  }
  for (const child of children) {
    if (child === null || child === false || child === undefined) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

const longDate = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/** "Mittwoch, 11. November" for a YYYY-MM-DD key. */
export function formatDate(key: string): string {
  return longDate.format(new Date(`${key}T00:00:00Z`));
}
