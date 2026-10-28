// Filtering for list pages. Lists are small, so pages filter in the browser as the practitioner types or picks.

/** True when every word of the query appears somewhere in the text, ignoring case. */
export function matchesSearch(text: string, query: string): boolean {
  const haystack = text.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/** True when a YYYY-MM-DD day falls within from and to, inclusive. An empty end leaves that side open. */
export function inDateRange(day: string, from: string, to: string): boolean {
  return (!from || day >= from) && (!to || day <= to);
}
