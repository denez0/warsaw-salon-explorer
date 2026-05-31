import Link from "next/link";

/** Fallback when `notFound()` is called from this segment (server). Client fetch 404 uses SalonNotFoundPanel with return URL. */
export default function SalonNotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/salons"
        className="inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
      >
        ← Back to listing
      </Link>
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-6xl font-light text-zinc-300" aria-hidden>
          404
        </p>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900">
          Salon not found
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          This salon may have been removed or the address is invalid.
        </p>
        <Link
          href="/salons"
          className="mt-6 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Back to salon list
        </Link>
      </div>
    </div>
  );
}
