import Link from "next/link";
import { countSalons, listSalons } from "@/lib/db";
import { formatPriceRangeDisplay } from "@/lib/salon-display";

export const dynamic = "force-dynamic";

export default function Home() {
  const total = countSalons();
  const topSalons = listSalons(5);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Warsaw
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Welcome to the Salon Explorer
        </h1>
        <p className="text-zinc-600">
          {total} salon{total === 1 ? "" : "s"} in the database — browse, filter, and
          edit salon profiles.
        </p>
      </header>

      <Link
        href="/salons"
        className="inline-flex w-fit rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
      >
        Browse all salons →
      </Link>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-zinc-900">
          Top rated
        </h2>
        <ul className="space-y-4">
          {topSalons.map((salon) => (
            <li
              key={salon.id}
              className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0"
            >
              <Link
                href={`/salon/${salon.id}?return=${encodeURIComponent("/salons")}`}
                className="flex items-start justify-between gap-4 rounded-lg -mx-2 px-2 py-1 transition hover:bg-emerald-50/60"
              >
                <div>
                  <p className="font-medium text-zinc-900">{salon.name}</p>
                  <p className="text-sm text-zinc-500">{salon.address}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {salon.district} · {formatPriceRangeDisplay(salon.price_range)}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-amber-600">
                    {salon.rating.toFixed(1)}
                  </p>
                  <p className="text-zinc-400">{salon.review_count} reviews</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-sm text-zinc-500">
        Run <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">npm run db:seed</code>{" "}
        to populate the database with sample salons.
      </p>
    </div>
  );
}
