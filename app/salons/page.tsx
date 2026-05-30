import { Suspense } from "react";
import { SalonListing } from "@/components/salons/SalonListing";

export const metadata = {
  title: "Salony — Warsaw Beauty Salon Explorer",
  description:
    "Przeglądaj salony beauty w Warszawie z filtrami dzielnic i wyszukiwaniem.",
};

function ListingFallback() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-zinc-200 bg-white p-5"
        >
          <div className="mb-3 h-5 w-3/4 rounded bg-zinc-200" />
          <div className="h-4 w-1/2 rounded bg-zinc-100" />
        </div>
      ))}
    </div>
  );
}

export default function SalonsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8 space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Warszawa
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Salony beauty
        </h1>
        <p className="max-w-2xl text-balance text-zinc-600">
          Przeglądaj salony według dzielnicy, ocen i przedziału cenowego. Wyszukaj
          po nazwie lub usługach.
        </p>
      </header>

      <Suspense fallback={<ListingFallback />}>
        <SalonListing />
      </Suspense>
    </div>
  );
}
