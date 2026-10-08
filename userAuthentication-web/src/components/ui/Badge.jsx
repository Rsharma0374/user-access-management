/**
 * Status / label badge.
 *
 * @param {'success'|'error'|'warning'|'info'|'neutral'|'purple'} variant
 * @param {'sm'|'md'} size
 * @param {boolean} dot  Show a colored dot before the label
 */
export default function Badge({
  variant = 'neutral',
  size    = 'sm',
  dot     = false,
  children,
  className = '',
}) {
  const base = 'inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap';

  const variants = {
    success: 'bg-success-50  text-success-700  ring-1 ring-success-200',
    error:   'bg-error-50    text-error-700    ring-1 ring-error-200',
    warning: 'bg-warning-50  text-warning-700  ring-1 ring-warning-200',
    info:    'bg-brand-50    text-brand-700    ring-1 ring-brand-200',
    neutral: 'bg-neutral-100 text-neutral-600  ring-1 ring-neutral-200',
    purple:  'bg-purple-50   text-purple-700   ring-1 ring-purple-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const dotColors = {
    success: 'bg-success-600',
    error:   'bg-error-600',
    warning: 'bg-warning-600',
    info:    'bg-brand-600',
    neutral: 'bg-neutral-400',
    purple:  'bg-purple-600',
  };

  return (
    <span className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {dot && (
        <span
          aria-hidden="true"
          className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${dotColors[variant]}`}
        />
      )}
      {children}
    </span>
  );
}
