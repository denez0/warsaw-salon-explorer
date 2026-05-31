/** Polish-friendly phone: optional +48, digits, spaces, dashes, parentheses. */
const PHONE_PATTERN =
  /^(\+48[\s\-]?)?(\(?\d{2,3}\)?[\s\-]?)?[\d\s\-().]{7,20}$/;

export function validateSalonPhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) {
    return null;
  }
  if (!PHONE_PATTERN.test(trimmed)) {
    return "Please provide a valid phone number (e.g. +48 123 456 789).";
  }
  const digits = trimmed.replace(/\D/g, "");
  const national =
    digits.startsWith("48") && digits.length > 9
      ? digits.slice(2)
      : digits;
  if (national.length < 9 || national.length > 11) {
    return "Phone number must contain 9–11 digits.";
  }
  return null;
}

export function validateSalonWebsite(website: string): string | null {
  const trimmed = website.trim();
  if (!trimmed) {
    return null;
  }
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname || !url.hostname.includes(".")) {
      return "Please provide a valid website URL or leave blank.";
    }
    return null;
  } catch {
    return "Please provide a valid website URL or leave blank.";
  }
}

export function validateSalonServicesInput(servicesInput: string): string | null {
  return null;
}
