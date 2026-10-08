/**
 * Accessible loading spinner.
 *
 * @param {{ size?: 'sm'|'md'|'lg', label?: string, className?: string }} props
 */
export default function Spinner({ size = 'md', label = 'Loading…', className = '' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-5 w-5 border-2',
    lg: 'h-8 w-8 border-[3px]',
  };

  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block rounded-full border-current border-t-transparent animate-spin-slow ${sizeClasses[size]} ${className}`}
    />
  );
}
