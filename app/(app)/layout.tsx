import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { signOut } from "@/app/actions/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-parchment">
      <header className="flex items-center justify-between border-b border-border-warm px-8 py-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 text-near-black"
        >
          <span className="w-5 h-5 rounded-full bg-terracotta" />
          <span className="font-serif text-[15px]">FirstCV · 札记</span>
        </Link>

        <div className="flex items-center gap-5 text-[13px]">
          <span className="text-olive-gray">
            {user.displayName ?? user.email}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg bg-warm-sand px-3 py-1.5 text-charcoal-warm hover:bg-border-cream transition"
            >
              退出
            </button>
          </form>
        </div>
      </header>

      <main className="px-8 py-10">{children}</main>
    </div>
  );
}
