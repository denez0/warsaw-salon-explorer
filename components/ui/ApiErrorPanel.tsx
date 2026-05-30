"use client";

type ApiErrorPanelProps = {
  title: string;
  message: string;
  onRetry: () => void;
  retryLabel?: string;
};

export function ApiErrorPanel({
  title,
  message,
  onRetry,
  retryLabel = "Spróbuj ponownie",
}: ApiErrorPanelProps) {
  return (
    <div
      className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center"
      role="alert"
    >
      <p className="text-lg font-medium text-red-900">{title}</p>
      <p className="mt-2 text-sm text-red-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        {retryLabel}
      </button>
    </div>
  );
}
