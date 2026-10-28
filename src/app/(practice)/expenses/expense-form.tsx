"use client";

import { startTransition, useActionState, useState } from "react";
import { saveExpense, type ExpenseFormState } from "./actions";
import { button, field, label } from "@/app/ui";
import { checkReceipt, NEW_CATEGORY, RECEIPT_ACCEPT, RECEIPT_BUCKET, type ExpenseCategory } from "@/lib/expenses";
import { createClient } from "@/lib/supabase/client";

export type EditableExpense = {
  id: string;
  spentOn: string;
  supplier: string;
  amount: string; // e.g. "1250.50"
  categoryId: string;
  note: string;
  receiptUrl: string | null;
};

/** Add or edit an expense. A receipt photo or PDF goes straight from the phone to storage, then the form saves. */
export function ExpenseForm({
  practiceId,
  categories,
  today,
  expense,
}: {
  practiceId: string;
  categories: ExpenseCategory[];
  today: string;
  expense?: EditableExpense;
}) {
  const [state, action, saving] = useActionState<ExpenseFormState, FormData>(saveExpense.bind(null, expense?.id ?? null), {});
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? "");
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const hint = categories.find((c) => c.id === categoryId)?.hint;
  const busy = saving || uploading;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError(null);
    const form = new FormData(event.currentTarget);
    const picked = form.get("receipt");
    form.delete("receipt");

    if (picked instanceof File && picked.size > 0) {
      const file = await shrinkPhoto(picked);
      const checked = checkReceipt(file);
      if (!checked.ok) return setUploadError(checked.error);
      setUploading(true);
      const path = `${practiceId}/${crypto.randomUUID()}.${checked.extension}`;
      const { error } = await createClient().storage.from(RECEIPT_BUCKET).upload(path, file, { contentType: file.type });
      setUploading(false);
      if (error) {
        console.error("Uploading receipt failed", error);
        return setUploadError("Your receipt didn't upload. Please check your signal and try again.");
      }
      form.set("receipt_path", path);
    }
    // Submitting by hand keeps what she typed if there's an error; a form action would clear the fields.
    startTransition(() => action(form));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="amount" className={label}>Amount</label>
          <input id="amount" name="amount" inputMode="decimal" placeholder="R0.00" defaultValue={expense?.amount} autoComplete="off" className={field} />
        </div>
        <div>
          <label htmlFor="spent_on" className={label}>Date paid</label>
          <input id="spent_on" name="spent_on" type="date" defaultValue={expense?.spentOn ?? today} className={field} />
        </div>
      </div>

      <div>
        <label htmlFor="supplier" className={label}>Who you paid</label>
        <input id="supplier" name="supplier" placeholder="e.g. OTASA, Takealot, Vodacom" defaultValue={expense?.supplier} autoComplete="off" className={field} />
      </div>

      <div>
        <label htmlFor="category_id" className={label}>Category</label>
        <select id="category_id" name="category_id" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={field}>
          <option value="" disabled>Choose a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
          <option value={NEW_CATEGORY}>+ New category…</option>
        </select>
        {hint && <p className="mt-1 text-sm text-neutral-500">{hint}</p>}
        {categoryId === NEW_CATEGORY && (
          <input name="new_category" placeholder="Name your category" aria-label="New category name" autoFocus autoComplete="off" className={`${field} mt-2`} />
        )}
        {!categoryId && <p className="mt-1 text-sm text-neutral-500">Not sure? Pick the closest one, or Other. You can change it later.</p>}
      </div>

      <div>
        <label htmlFor="receipt" className={label}>Receipt <span className="font-normal text-neutral-500">(optional)</span></label>
        {expense?.receiptUrl && !removeReceipt && (
          <p className="mb-2 flex items-center gap-3 text-sm">
            <a href={expense.receiptUrl} target="_blank" rel="noreferrer" className="font-medium text-accent">View receipt</a>
            <button type="button" onClick={() => setRemoveReceipt(true)} className="text-neutral-500 underline">Remove</button>
          </p>
        )}
        {removeReceipt && <input type="hidden" name="remove_receipt" value="yes" />}
        <input
          id="receipt"
          name="receipt"
          type="file"
          accept={RECEIPT_ACCEPT}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-neutral-200 file:bg-white file:px-3 file:py-2 file:font-medium"
        />
        <p className="mt-1 text-sm text-neutral-500">
          {expense?.receiptUrl && !removeReceipt ? "Choose a file to replace it. " : ""}Take a photo or choose a PDF. Keep receipts for 5 years for SARS; we keep them for you.
        </p>
      </div>

      <div>
        <label htmlFor="note" className={label}>Note <span className="font-normal text-neutral-500">(optional)</span></label>
        <textarea id="note" name="note" rows={2} defaultValue={expense?.note} className={field} />
      </div>

      <button type="submit" disabled={busy} className={`${button} mt-2`}>
        {uploading ? "Uploading receipt…" : saving ? "Saving…" : expense ? "Save changes" : "Add expense"}
      </button>
      {(uploadError ?? state.error) && <p role="alert" className="text-sm text-red-600">{uploadError ?? state.error}</p>}
    </form>
  );
}

/**
 * Phone photos can be 5 MB or more, which is slow on mobile data. Big JPG, PNG and WebP photos are resized to at most
 * 2000 pixels and saved as JPG. Anything the browser can't draw (a PDF, or HEIC outside Safari) is sent as it is.
 */
async function shrinkPhoto(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const image = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    return blob && blob.size < file.size ? new File([blob], "receipt.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}
