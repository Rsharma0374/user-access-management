import React from 'react';

/**
 * Accessible native <select> wrapped with a persistent label, hint and error.
 * Mirrors the Input primitive's API so forms stay consistent.
 *
 * @param {object} props
 * @param {string}  props.id
 * @param {string}  props.label
 * @param {{ value: string, label: string, disabled?: boolean }[]} props.options
 * @param {string}  [props.error]
 * @param {string}  [props.hint]
 * @param {boolean} [props.required]
 * @param {boolean} [props.hideLabel]  Visually hide the label (still read by AT)
 */
const Select = React.forwardRef(function Select(
  {
    id,
    label,
    options = [],
    error,
    hint,
    required,
    hideLabel = false,
    placeholder,
    className = '',
    ...rest
  },
  ref,
) {
  const errorId = `${id}-error`;
  const hintId  = `${id}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className={hideLabel ? 'sr-only' : 'text-sm font-medium text-neutral-700'}
      >
        {label}
        {required && !hideLabel && (
          <span className="ml-1 text-error-600" aria-hidden="true">*</span>
        )}
      </label>

      <div className="relative">
        <select
          ref={ref}
          id={id}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`
            w-full appearance-none rounded-xl border bg-white px-4 py-2.5 pr-10 text-sm text-neutral-900
            transition-colors duration-150 outline-none cursor-pointer
            ${
              error
                ? 'border-error-500 focus:border-error-500 focus:ring-2 focus:ring-error-500/30'
                : 'border-neutral-300 hover:border-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
            }
          `}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Chevron */}
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </span>
      </div>

      {hint && !error && (
        <p id={hintId} className="text-xs text-neutral-500">{hint}</p>
      )}

      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-xs text-error-600">
          <svg aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 10.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zM7.25 5h1.5v4.5h-1.5V5z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
});

export default Select;
