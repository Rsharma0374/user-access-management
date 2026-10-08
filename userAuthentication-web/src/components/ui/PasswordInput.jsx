import React, { useState } from 'react';
import Input from './Input.jsx';

/**
 * Password input with show/hide toggle.
 * Wraps Input and manages visibility state internally.
 */
const PasswordInput = React.forwardRef(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);

  const toggle = () => setVisible((v) => !v);

  const ShowHideButton = (
    <button
      type="button"
      onClick={toggle}
      aria-label={visible ? 'Hide password' : 'Show password'}
      aria-pressed={visible}
      className="
        flex items-center justify-center w-8 h-8 rounded-lg
        text-neutral-400 hover:text-neutral-700
        hover:bg-neutral-100 active:bg-neutral-200
        transition-colors duration-100
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
      "
      tabIndex={0}
    >
      {visible ? (
        // Eye-off icon
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5">
          <path
            fillRule="evenodd"
            d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.03 10.03 0 0 0 3.3-4.39 1.002 1.002 0 0 0 0-.704 10.47 10.47 0 0 0-9.983-6.91c-1.65 0-3.19.42-4.51 1.13L3.28 2.22Zm7.752 7.75 1.473 1.473a2.5 2.5 0 0 1-2.947-2.947L8.03 6.97a2.5 2.5 0 0 0 2.947 2.947l.055.053Z"
            clipRule="evenodd"
          />
          <path d="M10.5 18c-2.42 0-4.64-.85-6.39-2.25L2.78 14.42A10.46 10.46 0 0 0 .75 10a1 1 0 0 1 0-.69 10.47 10.47 0 0 1 3.34-4.54L5.53 6.2A8.5 8.5 0 0 0 10.5 18Z" />
        </svg>
      ) : (
        // Eye icon
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5">
          <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path
            fillRule="evenodd"
            d="M.664 10.59a1.002 1.002 0 0 1 0-.79c.63-1.52 1.57-2.89 2.75-4.04C4.83 4.4 7.05 3.5 10 3.5c2.95 0 5.17.9 6.587 2.26 1.18 1.15 2.12 2.52 2.75 4.04a1 1 0 0 1 0 .79c-.63 1.52-1.57 2.89-2.75 4.04C15.17 15.6 12.95 16.5 10 16.5c-2.95 0-5.17-.9-6.587-2.26A12.47 12.47 0 0 1 .664 10.59ZM10 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );

  return (
    <Input
      ref={ref}
      type={visible ? 'text' : 'password'}
      autoComplete={props.autoComplete ?? 'current-password'}
      rightAdornment={ShowHideButton}
      {...props}
    />
  );
});

export default PasswordInput;
