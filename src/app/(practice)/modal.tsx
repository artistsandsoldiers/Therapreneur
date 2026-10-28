"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A button that opens its content in a pop-up over the page: centred on a wide screen, full screen on a phone.
 * The content only mounts while open, so each opening starts fresh. Saving moves to another page, which closes it.
 */
export function ModalButton({
  label,
  title,
  className,
  children,
}: {
  label: string;
  title: string;
  className: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      <dialog
        ref={dialog}
        aria-label={title}
        onClose={() => setOpen(false)}
        // A click on the dimmed backdrop lands on the dialog itself, not its content.
        onClick={(event) => event.target === event.currentTarget && setOpen(false)}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-white p-0 backdrop:bg-neutral-900/30 md:m-auto md:h-fit md:max-h-[calc(100dvh-4rem)] md:max-w-2xl md:rounded-xl md:shadow-xl"
      >
        {open && (
          <div className="px-4 pt-4 md:px-6 md:pt-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="size-5" aria-hidden>
                  <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {children}
            <div className="h-4 md:h-6" />
          </div>
        )}
      </dialog>
    </>
  );
}
