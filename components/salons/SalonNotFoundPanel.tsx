"use client";

import Link from "next/link";

type SalonNotFoundPanelProps = {
  returnHref: string;
};

export function SalonNotFoundPanel({ returnHref }: SalonNotFoundPanelProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm">
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
        href={returnHref}
        className="mt-6 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Back to salon list
      </Link>
    </div>
  );
}
