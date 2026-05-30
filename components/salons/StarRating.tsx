type StarRatingProps = {
  rating: number;
  className?: string;
};

export function StarRating({ rating, className = "" }: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
  const roundUp = rating - fullStars >= 0.75;
  const displayFull = roundUp ? Math.min(5, fullStars + 1) : fullStars;

  return (
    <div
      className={`flex items-center gap-0.5 text-amber-500 ${className}`}
      aria-label={`Ocena ${rating.toFixed(1)} z 5`}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < displayFull;
        const half = !filled && hasHalf && i === displayFull;
        return (
          <span
            key={i}
            className={
              filled
                ? "text-amber-500"
                : half
                  ? "text-amber-300"
                  : "text-zinc-200"
            }
            aria-hidden
          >
            ★
          </span>
        );
      })}
    </div>
  );
}
