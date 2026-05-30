/** Polish-friendly phone: optional +48, digits, spaces, dashes, parentheses. */
const PHONE_PATTERN =
  /^(\+48[\s\-]?)?(\(?\d{2,3}\)?[\s\-]?)?[\d\s\-().]{7,20}$/;

export function validateSalonPhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) {
    return "Telefon jest wymagany.";
  }
  if (!PHONE_PATTERN.test(trimmed)) {
    return "Podaj poprawny numer telefonu (np. +48 123 456 789).";
  }
  const digits = trimmed.replace(/\D/g, "");
  const national =
    digits.startsWith("48") && digits.length > 9
      ? digits.slice(2)
      : digits;
  if (national.length < 9 || national.length > 11) {
    return "Numer telefonu musi mieć 9–11 cyfr.";
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
      return "Podaj poprawny adres strony WWW lub zostaw pole puste.";
    }
    return null;
  } catch {
    return "Podaj poprawny adres strony WWW lub zostaw pole puste.";
  }
}

export function validateSalonServicesInput(servicesInput: string): string | null {
  const services = servicesInput
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (services.length === 0) {
    return "Podaj co najmniej jedną usługę (oddzielone przecinkami).";
  }
  return null;
}
