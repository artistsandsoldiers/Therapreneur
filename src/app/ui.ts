// Shared Tailwind class names, so forms look the same everywhere (docs/design.md).

export const field =
  "w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";

export const label = "mb-1 block text-sm font-medium text-neutral-700";

export const button =
  "rounded-md bg-accent px-4 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60";

export const secondaryButton =
  "rounded-md border border-neutral-200 bg-white px-4 py-2.5 font-medium text-neutral-800 transition-colors hover:bg-neutral-50 disabled:opacity-60";

// Forms and other single-column pages keep a comfortable width, even on a wide screen.
export const narrow = "max-w-2xl";

// Lists are two-line rows on a phone and a table with a header row on desktop. Each list sets its own
// md:grid-cols-[…] on both its header and its rows, and orders its cells as the desktop columns.
export const listHead =
  "hidden gap-x-6 border-b border-neutral-200 py-2 text-xs font-medium tracking-wide text-neutral-400 uppercase md:grid";
export const list = "divide-y divide-neutral-100 border-y border-neutral-100 md:border-t-0";
export const listRow = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-3 md:gap-x-6";

// Where a cell sits on a phone. On desktop each cell simply takes the next column.
export const topRight = "col-start-2 row-start-1 text-right md:col-start-auto md:row-start-auto";
export const bottomLeft = "col-start-1 row-start-2 md:col-start-auto md:row-start-auto";
export const bottomRight = "col-start-2 row-start-2 text-right md:col-start-auto md:row-start-auto";
