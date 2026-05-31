import Link from "next/link";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-zinc-900 transition hover:text-emerald-800 sm:text-lg"
        >
          Warsaw Beauty Salon Explorer
        </Link>
      </div>
    </header>
  );
}
