import React from 'react';

/**
 * Accessible toggle switch (role="switch").
 *
 * @param {object}   props
 * @param {boolean}  props.checked
 * @param {function} props.onChange   Called with the next boolean value.
 * @param {boolean}  [props.disabled]
 * @param {boolean}  [props.loading]  Shows a busy state and blocks interaction.
 * @param {string}   props.label      Accessible label (required).
 * @param {string}   [props.title]    Native tooltip (e.g. permission hint when disabled).
 * @param {'sm'|'md'} [props.size]
 */
export default function Toggle({
  checked = false,
  onChange,
  disabled = false,
  loading = false,
  label,
  title,
  size = 'md',
  className = '',
}) {
  const isBlocked = disabled || loading;

  const dims = {
    sm: { track: 'h-5 w-9', knob: 'h-3.5 w-3.5', on: 'translate-x-4', off: 'translate-x-0.5' },
    md: { track: 'h-6 w-11', knob: 'h-4 w-4', on: 'translate-x-5', off: 'translate-x-1' },
  }[size];

  function handleClick() {
    if (isBlocked) return;
    onChange?.(!checked);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-disabled={isBlocked}
      aria-busy={loading}
      disabled={isBlocked}
      title={title}
      onClick={handleClick}
      className={`
        relative inline-flex ${dims.track} shrink-0 items-center rounded-full
        transition-colors duration-200 outline-none
        focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
        ${checked ? 'bg-brand-600' : 'bg-neutral-300'}
        ${isBlocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `.trim()}
    >
      <span
        aria-hidden="true"
        className={`
          inline-block ${dims.knob} transform rounded-full bg-white shadow
          transition-transform duration-200
          ${checked ? dims.on : dims.off}
          ${loading ? 'animate-pulse' : ''}
        `}
      />
    </button>
  );
}
