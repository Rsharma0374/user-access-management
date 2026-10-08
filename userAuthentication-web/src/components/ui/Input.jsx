import React from 'react';

/**
 * Accessible text input.
 *
 * Wraps <input> with a persistent <label>, optional helper text, and an
 * accessible error message rendered with aria-describedby.
 *
 * @param {object} props
 * @param {string}  props.id
 * @param {string}  props.label
 * @param {string}  [props.error]
 * @param {string}  [props.hint]
 * @param {boolean} [props.required]
 * @param {React.ReactNode} [props.rightAdornment]  Rendered inside the input wrapper (e.g. show/hide button)
 */
const Input = React.forwardRef(function Input(
  {
    id,
    label,
    error,
    hint,
    required,
    rightAdornment,
    className = '',
    type = 'text',
    ...rest
  },
  ref
) {
  const errorId = `${id}-error`;
  const hintId  = `${id}-hint`;

  const describedBy = [
    hint  ? hintId  : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Persistent label — never use placeholder as substitute */}
      <label
        htmlFor={id}
        className="text-sm font-medium text-neutral-700"
      >
        {label}
        {required && (
          <span className="ml-1 text-error-600" aria-hidden="true">*</span>
        )}
      </label>

      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={type}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`
            w-full rounded-xl border px-4 py-2.5 text-sm text-neutral-900
            placeholder:text-neutral-400
            transition-colors duration-150
            bg-white
            ${rightAdornment ? 'pr-12' : ''}
            ${
              error
                ? 'border-error-500 focus:border-error-500 focus:ring-2 focus:ring-error-500/30'
                : 'border-neutral-300 hover:border-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
            }
            outline-none
          `}
          {...rest}
        />

        {rightAdornment && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightAdornment}
          </div>
        )}
      </div>

      {hint && !error && (
        <p id={hintId} className="text-xs text-neutral-500">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-xs text-error-600"
        >
          {/* Inline error icon */}
          <svg
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 10.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zM7.25 5h1.5v4.5h-1.5V5z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
