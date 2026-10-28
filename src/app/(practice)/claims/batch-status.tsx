/** A batch is Sent until its reference number is recorded, then Received. */
export function BatchStatus({ referenceNumber }: { referenceNumber: string | null }) {
  return referenceNumber ? (
    <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-sm text-accent">Received</span>
  ) : (
    <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-0.5 text-sm text-neutral-600">Sent</span>
  );
}
