import Link from "next/link";
import type { SalonListItem } from "@/lib/db/salon-serialize";
import { buildSalonDetailHref } from "@/lib/salons-listing-url";
import { formatRating, priceRangeToDollars } from "@/lib/salon-display";
import { StarRating } from "./StarRating";

type SalonCardProps = {
  salon: SalonListItem;
  listingHref: string;
};

export function SalonCard({ salon, listingHref }: SalonCardProps) {
  const dollars = priceRangeToDollars(salon.price_range);

  return (
    <Link
      href={buildSalonDetailHref(salon.id, listingHref)}
      className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:border-emerald-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold leading-snug text-zinc-900">
          {salon.name}
        </h2>
        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
          {salon.district}
        </span>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
        <div className="flex items-center gap-2">
          <StarRating rating={salon.rating} />
          <span className="text-sm font-semibold text-zinc-800">
            {formatRating(salon.rating)}
          </span>
          <span className="text-xs text-zinc-400">
            ({salon.review_count})
          </span>
        </div>
        <span
          className="font-mono text-sm tracking-wider text-zinc-600"
          title={salon.price_range}
        >
          {dollars}
        </span>
      </div>
    </Link>
  );
}
