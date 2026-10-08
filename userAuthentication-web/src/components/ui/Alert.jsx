/**
 * Alert / banner component for form-level feedback.
 *
 * @param {'error'|'success'|'info'|'warning'} variant
 * @param {string} title     Optional bold heading line.
 * @param {string} message   Main message text.
 * @param {boolean} role     Defaults to 'alert' for error, 'status' for others.
 */
export default function Alert({ variant = 'error', title, message, className = '' }) {
  const config = {
    error: {
      wrapper: 'bg-error-50 border-error-200 text-error-700',
      icon: (
        <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-error-600" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
            clipRule="evenodd"
          />
        </svg>
      ),
      role: 'alert',
    },
    success: {
      wrapper: 'bg-success-50 border-success-200 text-success-700',
      icon: (
        <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-success-600" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
            clipRule="evenodd"
          />
        </svg>
      ),
      role: 'status',
    },
    info: {
      wrapper: 'bg-brand-50 border-brand-200 text-brand-700',
      icon: (
        <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-600" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
            clipRule="evenodd"
          />
        </svg>
      ),
      role: 'status',
    },
    warning: {
      wrapper: 'bg-warning-50 border-warning-200 text-warning-700',
      icon: (
        <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-warning-600" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            clipRule="evenodd"
          />
        </svg>
      ),
      role: 'alert',
    },
  };

  const { wrapper, icon, role } = config[variant] ?? config.error;

  return (
    <div
      role={role}
      className={`flex gap-3 rounded-xl border p-4 text-sm animate-fade-in ${wrapper} ${className}`}
    >
      <span className="mt-0.5">{icon}</span>
      <div className="flex flex-col gap-0.5">
        {title && <p className="font-semibold">{title}</p>}
        {message && <p className="leading-relaxed">{message}</p>}
      </div>
    </div>
  );
}
