import { logoUrl } from "@/lib/logo";
import { requireSetUpPractice } from "@/lib/practice";
import { Nav } from "./nav";

export default async function PracticeLayout({ children }: { children: React.ReactNode }) {
  const { supabase, practice } = await requireSetUpPractice();

  return (
    <div className="min-h-dvh md:flex">
      <Nav practiceName={practice.name ?? "Your practice"} logoUrl={await logoUrl(supabase, practice)} />
      {/* Full width beside the sidebar on desktop, capped only on very large screens (docs/design.md). */}
      <div className="mx-auto w-full max-w-[90rem] min-w-0 px-4 pb-16 md:px-10">{children}</div>
    </div>
  );
}
