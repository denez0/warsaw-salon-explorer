export type ApiFailureKind = "network" | "http";

export class ApiRequestError extends Error {
  readonly kind: ApiFailureKind;
  readonly status?: number;

  constructor(message: string, kind: ApiFailureKind, status?: number) {
    super(message);
    this.name = "ApiRequestError";
    this.kind = kind;
    this.status = status;
  }
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError;
}

function networkMessage(): string {
  return "Brak połączenia z internetem. Sprawdź sieć i spróbuj ponownie.";
}

function httpMessage(status: number, fallback?: string): string {
  if (status === 404) {
    return "Nie znaleziono zasobu.";
  }
  if (status >= 500) {
    return "Błąd serwera. Spróbuj ponownie później.";
  }
  return fallback ?? "Wystąpił błąd podczas żądania.";
}

type ErrorBody = { error?: string; details?: unknown };

async function parseErrorBody(res: Response): Promise<ErrorBody | null> {
  try {
    return (await res.json()) as ErrorBody;
  } catch {
    return null;
  }
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiRequestError(networkMessage(), "network");
  }

  if (res.ok) {
    return (await res.json()) as T;
  }

  const body = await parseErrorBody(res);
  const message =
    typeof body?.error === "string"
      ? body.error
      : httpMessage(res.status);

  throw new ApiRequestError(message, "http", res.status);
}

export async function fetchJsonOrNullOn404<T>(
  url: string,
  init?: RequestInit
): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiRequestError(networkMessage(), "network");
  }

  if (res.status === 404) {
    return null;
  }

  if (res.ok) {
    return (await res.json()) as T;
  }

  const body = await parseErrorBody(res);
  const message =
    typeof body?.error === "string"
      ? body.error
      : httpMessage(res.status);

  throw new ApiRequestError(message, "http", res.status);
}

export type PutJsonResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      kind: "network";
      message: string;
    }
  | {
      ok: false;
      kind: "http";
      status: number;
      message: string;
      details?: string[];
    };

export async function putJson<T>(
  url: string,
  body: unknown
): Promise<PutJsonResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      kind: "network",
      message: networkMessage(),
    };
  }

  let payload: T | ErrorBody;
  try {
    payload = (await res.json()) as T | ErrorBody;
  } catch {
    payload = {};
  }

  if (res.ok) {
    return { ok: true, data: payload as T };
  }

  const errorBody = payload as ErrorBody;
  const message =
    typeof errorBody.error === "string"
      ? errorBody.error
      : httpMessage(res.status, "Nie udało się zapisać zmian");

  const details = Array.isArray(errorBody.details)
    ? errorBody.details.filter((d): d is string => typeof d === "string")
    : undefined;

  return {
    ok: false,
    kind: "http",
    status: res.status,
    message,
    details,
  };
}
