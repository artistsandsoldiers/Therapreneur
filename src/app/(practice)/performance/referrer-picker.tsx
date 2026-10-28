"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { field } from "@/app/ui";

const control = `${field.replace("w-full", "")} py-2 text-sm`;

/** Narrows the Income tab to one referrer's patients. Changes show straight away. */
export function ReferrerPicker({ value, referrers }: { value: string; referrers: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function show(referrer: string) {
    const next = new URLSearchParams(params);
    if (referrer) next.set("referrer", referrer);
    else next.delete("referrer");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }

  return (
    <select value={value} onChange={(event) => show(event.target.value)} aria-label="Referrer" className={control}>
      <option value="">All referrers</option>
      {referrers.map((referrer) => <option key={referrer.id} value={referrer.id}>{referrer.name}</option>)}
      <option value="none">No referrer</option>
    </select>
  );
}
