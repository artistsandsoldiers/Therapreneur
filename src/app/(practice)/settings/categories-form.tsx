"use client";

import { useActionState } from "react";
import { renameCategory, type CategoryState } from "@/app/(practice)/expenses/actions";
import { field, secondaryButton } from "@/app/ui";

/** The practice's own expense categories, which it can rename. The central ones stay as they are. */
export function CategoriesForm({ categories }: { categories: { id: string; name: string }[] }) {
  return (
    <section className="mt-12 border-t border-neutral-100 pt-8">
      <h2 className="mb-1 text-lg font-semibold">Your expense categories</h2>
      <p className="mb-4 text-sm text-neutral-500">
        {categories.length === 0
          ? "None yet. Add one with “+ New category” when you add an expense."
          : "Categories you added yourself. Renaming one changes it on every expense in it."}
      </p>
      <div className="flex flex-col gap-2">
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}

function CategoryRow({ category }: { category: { id: string; name: string } }) {
  const [state, action, saving] = useActionState<CategoryState, FormData>(renameCategory.bind(null, category.id), {});
  return (
    <form action={action}>
      <div className="flex gap-2">
        <input name="name" defaultValue={category.name} aria-label="Category name" autoComplete="off" className={field} />
        <button type="submit" disabled={saving} className={`${secondaryButton} shrink-0`}>{saving ? "Saving…" : "Rename"}</button>
      </div>
      {state.error && <p role="alert" className="mt-1 text-sm text-red-600">{state.error}</p>}
      {state.saved && <p className="mt-1 text-sm text-neutral-500">Saved.</p>}
    </form>
  );
}
