export type SalonUpdateInput = {
  name?: string;
  phone?: string;
  website?: string | null;
  services?: string[];
  price_range?: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeServices(value: unknown): string[] | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    try {
      value = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const services: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      return null;
    }
    const service = item.trim();
    if (!service) {
      return null;
    }
    services.push(service);
  }

  if (services.length === 0) {
    return null;
  }

  return services;
}

export function validateSalonUpdate(
  body: unknown
):
  | { ok: true; data: SalonUpdateInput }
  | { ok: false; errors: string[] } {
  if (!isPlainObject(body)) {
    return { ok: false, errors: ["Request body must be a JSON object"] };
  }

  const allowed = new Set([
    "name",
    "phone",
    "website",
    "services",
    "price_range",
  ]);
  const keys = Object.keys(body);
  const unknown = keys.filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    return {
      ok: false,
      errors: [`Unknown fields: ${unknown.join(", ")}`],
    };
  }

  if (keys.length === 0) {
    return { ok: false, errors: ["At least one field must be provided"] };
  }

  const data: SalonUpdateInput = {};
  const errors: string[] = [];

  if ("name" in body) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      errors.push("name must be a non-empty string");
    } else {
      data.name = body.name.trim();
    }
  }

  if ("phone" in body) {
    if (typeof body.phone !== "string" || !body.phone.trim()) {
      errors.push("phone must be a non-empty string");
    } else {
      data.phone = body.phone.trim();
    }
  }

  if ("website" in body) {
    const website = body.website;
    if (website === null) {
      data.website = null;
    } else if (typeof website === "string") {
      const trimmed = website.trim();
      data.website = trimmed.length > 0 ? trimmed : null;
    } else {
      errors.push("website must be a string or null");
    }
  }

  if ("price_range" in body) {
    if (typeof body.price_range !== "string" || !body.price_range.trim()) {
      errors.push("price_range must be a non-empty string");
    } else {
      data.price_range = body.price_range.trim();
    }
  }

  if ("services" in body) {
    const services = normalizeServices(body.services);
    if (!services) {
      errors.push(
        "services must be a non-empty array of strings or a JSON array string"
      );
    } else {
      data.services = services;
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data };
}
