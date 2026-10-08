import Spinner from './Spinner.jsx';

/**
 * Primary / secondary / ghost button.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'} [props.variant]
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {boolean} [props.loading]
 * @param {boolean} [props.fullWidth]
 * @param {string}  [props.loadingLabel]
 * @param {React.ReactNode} props.children
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  loadingLabel,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary:
      'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm hover:shadow-md',
    secondary:
      'bg-white text-brand-700 border border-brand-300 hover:bg-brand-50 active:bg-brand-100',
    ghost:
      'text-brand-600 hover:bg-brand-50 active:bg-brand-100',
    danger:
      'bg-error-600 text-white hover:bg-error-700 active:bg-error-700 shadow-sm',
  };

  const sizes = {
    sm:  'px-3 py-1.5 text-sm',
    md:  'px-4 py-2.5 text-sm',
    lg:  'px-6 py-3 text-base',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      className={`
        ${base}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `.trim()}
      {...rest}
    >
      {loading && (
        <Spinner
          size="sm"
          label={loadingLabel ?? 'Loading…'}
          className="text-current opacity-80"
        />
      )}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
