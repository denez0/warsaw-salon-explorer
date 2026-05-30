import { SalonDetailView } from "@/components/salons/SalonDetail";
import { sanitizeListingReturnHref } from "@/lib/salons-listing-url";

export const metadata = {
  title: "Salon — Warsaw Beauty Salon Explorer",
};

type SalonDetailPageProps = {
  params: { id: string };
  searchParams: { return?: string };
};

export default function SalonDetailPage({
  params,
  searchParams,
}: SalonDetailPageProps) {
  const returnHref = sanitizeListingReturnHref(searchParams.return);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <SalonDetailView salonId={params.id} returnHref={returnHref} />
    </div>
  );
}
