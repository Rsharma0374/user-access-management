/**
 * Loading skeleton shimmer.
 *
 * @param {'text'|'rect'|'circle'} variant
 */
export function Skeleton({ className = '', variant = 'rect' }) {
  const base =
    'animate-pulse bg-neutral-200 rounded';
  const variants = {
    text:   'h-4 rounded',
    rect:   'rounded-xl',
    circle: 'rounded-full',
  };
  return <div aria-hidden="true" className={`${base} ${variants[variant]} ${className}`} />;
}

/** A card-shaped skeleton for product overview cards */
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-4 w-48" />
      <div className="flex gap-4 pt-1">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-9 w-full rounded-xl" />
    </div>
  );
}

/** A row-shaped skeleton for table rows */
export function TableRowSkeleton({ cols = 6 }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}
