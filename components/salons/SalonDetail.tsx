"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { SalonDetail } from "@/lib/db/salon-serialize";
import {
  ApiRequestError,
  fetchJsonOrNullOn404,
  isApiRequestError,
  putJson,
} from "@/lib/api/client";
import {
  formatRating,
  formatPriceRangeDisplay,
  PRICE_RANGE_EDIT_OPTIONS,
  PRICE_RANGE_UNKNOWN,
  priceRangeToEditValue,
} from "@/lib/salon-display";
import {
  validateSalonPhone,
  validateSalonServicesInput,
  validateSalonWebsite,
} from "@/lib/salon-form-validation";
import { ApiErrorPanel } from "@/components/ui/ApiErrorPanel";
import { SalonNotFoundPanel } from "./SalonNotFoundPanel";
import { StarRating } from "./StarRating";

type SalonDetailProps = {
  salonId: string;
  returnHref: string;
};

type EditForm = {
  name: string;
  phone: string;
  website: string;
  services: string;
  price_range: string;
};

type FieldErrors = Partial<Record<keyof EditForm, string>>;

type FetchState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error"; error: ApiRequestError }
  | { status: "ready" };

function salonToForm(salon: SalonDetail): EditForm {
  return {
    name: salon.name,
    phone: salon.phone ?? "",
    website: salon.website ?? "",
    services: salon.services.join(", "),
    price_range: priceRangeToEditValue(salon.price_range),
  };
}

function parseServicesInput(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function websiteHref(website: string): string {
  const trimmed = website.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function validateEditForm(form: EditForm): FieldErrors {
  const errors: FieldErrors = {};
  const name = form.name.trim();
  if (!name) {
    errors.name = "Nazwa jest wymagana.";
  }
  const phoneError = validateSalonPhone(form.phone);
  if (phoneError) {
    errors.phone = phoneError;
  }
  const websiteError = validateSalonWebsite(form.website);
  if (websiteError) {
    errors.website = websiteError;
  }
  const servicesError = validateSalonServicesInput(form.services);
  if (servicesError) {
    errors.services = servicesError;
  }
  return errors;
}

function fieldClass(hasError: boolean): string {
  return `w-full rounded-lg border px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20 ${
    hasError
      ? "border-red-300 focus:border-red-500"
      : "border-zinc-200 focus:border-emerald-500"
  }`;
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="h-8 w-2/3 rounded bg-zinc-200" />
      <div className="h-4 w-full rounded bg-zinc-100" />
      <div className="h-4 w-1/2 rounded bg-zinc-100" />
      <div className="h-20 w-full rounded bg-zinc-50" />
    </div>
  );
}

function BackToListingLink({ returnHref }: { returnHref: string }) {
  return (
    <Link
      href={returnHref}
      className="inline-flex text-sm font-medium text-emerald-700 hover:text-emerald-800"
    >
      ← Back to listing
    </Link>
  );
}

function fetchErrorCopy(error: ApiRequestError): { title: string; message: string } {
  if (error.kind === "network") {
    return {
      title: "No connection",
      message: error.message,
    };
  }
  if (error.status && error.status >= 500) {
    return {
      title: "Server error",
      message: error.message,
    };
  }
  return {
    title: "Failed to load salon",
    message: error.message,
  };
}

export function SalonDetailView({ salonId, returnHref }: SalonDetailProps) {
  const [salon, setSalon] = useState<SalonDetail | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>({ status: "loading" });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverValidationErrors, setServerValidationErrors] = useState<
    string[]
  >([]);

  const loadSalon = useCallback(async () => {
    setFetchState({ status: "loading" });
    setServerValidationErrors([]);
    try {
      const data = await fetchJsonOrNullOn404<SalonDetail>(
        `/api/salons/${salonId}`
      );
      if (data === null) {
        setSalon(null);
        setForm(null);
        setFetchState({ status: "not-found" });
        return;
      }
      setSalon(data);
      setForm(salonToForm(data));
      setFetchState({ status: "ready" });
    } catch (e) {
      setSalon(null);
      setForm(null);
      if (isApiRequestError(e)) {
        setFetchState({ status: "error", error: e });
      } else {
        setFetchState({
          status: "error",
          error: new ApiRequestError(
            "An unexpected error occurred.",
            "http"
          ),
        });
      }
    }
  }, [salonId]);

  useEffect(() => {
    void loadSalon();
  }, [loadSalon]);

  const startEdit = () => {
    if (salon) {
      setForm(salonToForm(salon));
      setFieldErrors({});
      setServerValidationErrors([]);
      setEditing(true);
    }
  };

  const cancelEdit = () => {
    if (salon) {
      setForm(salonToForm(salon));
    }
    setFieldErrors({});
    setServerValidationErrors([]);
    setEditing(false);
  };

  const clearFieldError = (field: keyof EditForm) => {
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !salon) {
      return;
    }

    const clientErrors = validateEditForm(form);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setServerValidationErrors([]);
      return;
    }

    const services = parseServicesInput(form.services);

    setSaving(true);
    setFieldErrors({});
    setServerValidationErrors([]);

    const result = await putJson<SalonDetail>(`/api/salons/${salonId}`, {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      services,
      price_range:
        form.price_range === PRICE_RANGE_UNKNOWN ? null : form.price_range,
    });

    setSaving(false);

    if (result.ok) {
      setSalon(result.data);
      setForm(salonToForm(result.data));
      setEditing(false);
      toast.success("Changes saved.");
      return;
    }

    if (result.kind === "network") {
      toast.error(result.message);
      return;
    }

    if (result.status === 404) {
      setSalon(null);
      setForm(null);
      setEditing(false);
      setFetchState({ status: "not-found" });
      toast.error("Salon not found.");
      return;
    }

    if (result.status === 400 && result.details && result.details.length > 0) {
      setServerValidationErrors(result.details);
      return;
    }

    toast.error(result.message);
  };

  if (fetchState.status === "loading") {
    return (
      <div className="space-y-6">
        <BackToListingLink returnHref={returnHref} />
        <DetailSkeleton />
      </div>
    );
  }

  if (fetchState.status === "not-found") {
    return (
      <div className="space-y-6">
        <BackToListingLink returnHref={returnHref} />
        <SalonNotFoundPanel returnHref={returnHref} />
      </div>
    );
  }

  if (fetchState.status === "error") {
    const copy = fetchErrorCopy(fetchState.error);
    return (
      <div className="space-y-6">
        <BackToListingLink returnHref={returnHref} />
        <ApiErrorPanel
          title={copy.title}
          message={copy.message}
          onRetry={() => void loadSalon()}
        />
      </div>
    );
  }

  if (!salon || !form) {
    return null;
  }

  const priceDisplay = formatPriceRangeDisplay(salon.price_range);
  const displayServices =
    salon.services.length > 0 ? salon.services : ["General beauty services"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BackToListingLink returnHref={returnHref} />
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:border-emerald-300 hover:bg-emerald-50"
          >
            Edit
          </button>
        )}
      </div>

      {serverValidationErrors.length > 0 && (
        <ul
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {serverValidationErrors.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}

      {editing ? (
        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
          noValidate
        >
            <h1 className="text-2xl font-semibold text-zinc-900">Edit salon</h1>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">
                Name
              </span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  clearFieldError("name");
                  setForm((f) => f && { ...f, name: e.target.value });
                }}
                className={fieldClass(Boolean(fieldErrors.name))}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
              />
              {fieldErrors.name && (
                <p id="name-error" className="mt-1 text-sm text-red-700">
                  {fieldErrors.name}
                </p>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">
                Phone
              </span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => {
                  clearFieldError("phone");
                  setForm((f) => f && { ...f, phone: e.target.value });
                }}
                placeholder="Add phone number"
                className={fieldClass(Boolean(fieldErrors.phone))}
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
              />
              {fieldErrors.phone && (
                <p id="phone-error" className="mt-1 text-sm text-red-700">
                  {fieldErrors.phone}
                </p>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">
                Website
              </span>
              <input
                type="text"
                inputMode="url"
                value={form.website}
                onChange={(e) => {
                  clearFieldError("website");
                  setForm((f) => f && { ...f, website: e.target.value });
                }}
                placeholder="Add website"
                className={fieldClass(Boolean(fieldErrors.website))}
                aria-invalid={Boolean(fieldErrors.website)}
                aria-describedby={
                  fieldErrors.website ? "website-error" : undefined
                }
              />
              {fieldErrors.website && (
                <p id="website-error" className="mt-1 text-sm text-red-700">
                  {fieldErrors.website}
                </p>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">
                Services (comma separated)
              </span>
              <input
                type="text"
                value={form.services}
                onChange={(e) => {
                  clearFieldError("services");
                  setForm((f) => f && { ...f, services: e.target.value });
                }}
                placeholder="e.g., Haircut, Manicure, Facial"
                className={fieldClass(Boolean(fieldErrors.services))}
                aria-invalid={Boolean(fieldErrors.services)}
                aria-describedby={
                  fieldErrors.services ? "services-error" : undefined
                }
              />
              {fieldErrors.services && (
                <p id="services-error" className="mt-1 text-sm text-red-700">
                  {fieldErrors.services}
                </p>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">
                Price range
              </span>
              <select
                value={form.price_range}
                onChange={(e) =>
                  setForm((f) => f && { ...f, price_range: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                {PRICE_RANGE_EDIT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.value})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-zinc-100 pt-4">
              <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
                {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
                Cancel
            </button>
          </div>
        </form>
      ) : (
        <article className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="text-2xl font-semibold text-zinc-900">{salon.name}</h1>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
              {salon.district}
            </span>
          </header>

          <dl className="space-y-4 text-sm">
            <div>
              <dt className="font-medium text-zinc-500">Address</dt>
                <dd className="mt-0.5 text-zinc-900">{salon.address}</dd>
            </div>
            <div>
                <dt className="font-medium text-zinc-500">Phone</dt>
              <dd className="mt-0.5">
                {salon.phone ? (
                  <a
                    href={`tel:${salon.phone.replace(/\s/g, "")}`}
                    className="text-emerald-700 hover:text-emerald-800"
                  >
                    {salon.phone}
                  </a>
                ) : (
                  <span className="text-zinc-400">No phone number available</span>
                )}
              </dd>
            </div>
            {salon.website && (
              <div>
                <dt className="font-medium text-zinc-500">Website</dt>
                <dd className="mt-0.5">
                  <a
                    href={websiteHref(salon.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 underline-offset-2 hover:text-emerald-800 hover:underline"
                  >
                    {salon.website}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="mb-2 font-medium text-zinc-500">Services</dt>
              <dd className="flex flex-wrap gap-2">
                {displayServices.map((service) => (
                  <span
                    key={service}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      salon.services.length > 0
                        ? "bg-zinc-100 text-zinc-700"
                        : "bg-zinc-50 text-zinc-400 italic"
                    }`}
                  >
                    {service}
                  </span>
                ))}
              </dd>
            </div>

            <div className="flex flex-wrap items-center gap-6 border-t border-zinc-100 pt-4">
              <div>
                <dt className="font-medium text-zinc-500">Prices</dt>
                <dd
                  className={`mt-0.5 ${
                    salon.price_range
                      ? "font-mono text-lg tracking-wider text-zinc-700"
                      : "text-zinc-400"
                  }`}
                  title={salon.price_range ?? undefined}
                >
                  {priceDisplay}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-500">Rating</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-2">
                  <StarRating rating={salon.rating} />
                  <span className="text-sm font-semibold text-zinc-800">
                    {formatRating(salon.rating)}
                  </span>
                  <span className="text-xs text-zinc-400">
                    ({salon.review_count} {salon.review_count === 1 ? "review" : "reviews"})
                  </span>
                </dd>
              </div>
            </div>
          </dl>
        </article>
      )}
    </div>
  );
}
