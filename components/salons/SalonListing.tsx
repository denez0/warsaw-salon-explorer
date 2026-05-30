"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SalonListItem } from "@/lib/db/salon-serialize";
import { DISTRICTS } from "@/lib/districts";
import {
  buildSalonsListingHref,
  districtsFromSearchParams,
} from "@/lib/salons-listing-url";
import {
  ApiRequestError,
  fetchJson,
  isApiRequestError,
} from "@/lib/api/client";
import { ApiErrorPanel } from "@/components/ui/ApiErrorPanel";
import { SalonCard } from "./SalonCard";

const SEARCH_DEBOUNCE_MS = 300;

function SalonCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-3 h-5 w-3/4 rounded bg-zinc-200" />
      <div className="mb-6 ml-auto h-5 w-20 rounded-full bg-zinc-100" />
      <div className="border-t border-zinc-100 pt-4">
        <div className="h-4 w-1/2 rounded bg-zinc-100" />
      </div>
    </div>
  );
}

function loadErrorCopy(error: ApiRequestError): { title: string; message: string } {
  if (error.kind === "network") {
    return {
      title: "Brak połączenia",
      message: error.message,
    };
  }
  if (error.status && error.status >= 500) {
    return {
      title: "Błąd serwera",
      message: error.message,
    };
  }
  return {
    title: "Nie udało się załadować salonów",
    message: error.message,
  };
}

export function SalonListing() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("search") ?? ""
  );
  const [debouncedSearch, setDebouncedSearch] = useState(
    () => (searchParams.get("search") ?? "").trim()
  );
  const [selectedDistricts, setSelectedDistricts] = useState<Set<string>>(
    () => districtsFromSearchParams(searchParams)
  );
  const [salons, setSalons] = useState<SalonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiRequestError | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const fromUrl = searchParams.get("search") ?? "";
    setSearchInput(fromUrl);
    setDebouncedSearch(fromUrl.trim());
    setSelectedDistricts(districtsFromSearchParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    const nextHref = buildSalonsListingHref({
      search: debouncedSearch,
      districts: selectedDistricts,
    });
    const currentQuery = searchParams.toString();
    const nextQuery = nextHref.includes("?")
      ? nextHref.slice(nextHref.indexOf("?") + 1)
      : "";
    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    }
  }, [
    debouncedSearch,
    selectedDistricts,
    pathname,
    router,
    searchParams,
  ]);

  const listingHref = useMemo(
    () =>
      buildSalonsListingHref({
        search: debouncedSearch,
        districts: selectedDistricts,
      }),
    [debouncedSearch, selectedDistricts]
  );

  const fetchDistrict =
    selectedDistricts.size === 1
      ? Array.from(selectedDistricts)[0]
      : undefined;

  const loadSalons = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }
      if (fetchDistrict) {
        params.set("district", fetchDistrict);
      }
      const query = params.toString();
      const url = query ? `/api/salons?${query}` : "/api/salons";
      const data = await fetchJson<SalonListItem[]>(url);
      setSalons(data);
    } catch (e) {
      setSalons([]);
      if (isApiRequestError(e)) {
        setLoadError(e);
      } else {
        setLoadError(
          new ApiRequestError(
            "Wystąpił nieoczekiwany błąd.",
            "http"
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, fetchDistrict]);

  useEffect(() => {
    void loadSalons();
  }, [loadSalons]);

  const filteredSalons = useMemo(() => {
    if (selectedDistricts.size <= 1) {
      return salons;
    }
    return salons.filter((s) => selectedDistricts.has(s.district));
  }, [salons, selectedDistricts]);

  const toggleDistrict = (district: string) => {
    setSelectedDistricts((prev) => {
      const next = new Set(prev);
      if (next.has(district)) {
        next.delete(district);
      } else {
        next.add(district);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedDistricts(new Set());
  };

  const hasActiveFilters =
    searchInput.trim().length > 0 || selectedDistricts.size > 0;

  const errorCopy = loadError ? loadErrorCopy(loadError) : null;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <label className="block">
          <span className="sr-only">Szukaj salonów</span>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Szukaj po nazwie lub usługach…"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 shadow-sm outline-none ring-emerald-500/0 transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700">Dzielnica</p>
          <div className="flex flex-wrap gap-2">
            {DISTRICTS.map((district) => {
              const active = selectedDistricts.has(district);
              return (
                <button
                  key={district}
                  type="button"
                  onClick={() => toggleDistrict(district)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50"
                  }`}
                >
                  {district}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SalonCardSkeleton key={i} />
          ))}
        </div>
      ) : loadError && errorCopy ? (
        <ApiErrorPanel
          title={errorCopy.title}
          message={errorCopy.message}
          onRetry={() => void loadSalons()}
        />
      ) : filteredSalons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
          <p className="text-lg font-medium text-zinc-800">
            Brak salonów spełniających kryteria
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Spróbuj zmienić wyszukiwanie lub wybrane dzielnice.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Wyczyść filtry
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            {filteredSalons.length}{" "}
            {filteredSalons.length === 1 ? "salon" : "salonów"}
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSalons.map((salon) => (
              <SalonCard
                key={salon.id}
                salon={salon}
                listingHref={listingHref}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
