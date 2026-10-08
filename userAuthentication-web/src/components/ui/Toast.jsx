import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * Lightweight toast notification system.
 *
 * Wrap the app in <ToastProvider> once, then call `useToast()` anywhere:
 *   const toast = useToast();
 *   toast.success('User created successfully');
 *   toast.error('Something went wrong');
 *
 * Toasts auto-dismiss after `duration` ms (default 5s) and can be dismissed
 * manually. Rendered in a portal, bottom-right, stacked, accessible via
 * role="status" / aria-live.
 */

const ToastContext = createContext(null);

let _id = 0;
const nextId = () => `toast-${++_id}`;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (variant, message, { title, duration = 5000 } = {}) => {
      const id = nextId();
      setToasts((list) => [...list, { id, variant, message, title }]);
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  // Clear any pending timers on unmount
  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  const api = {
    push,
    dismiss,
    success: (message, opts) => push('success', message, opts),
    error:   (message, opts) => push('error', message, opts),
    info:    (message, opts) => push('info', message, opts),
    warning: (message, opts) => push('warning', message, opts),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ─── Presentation ───────────────────────────────────────────────────────────

const VARIANT_STYLES = {
  success: {
    wrapper: 'bg-white border-success-200',
    accent:  'bg-success-600',
    icon:    'text-success-600',
    path:    'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z',
  },
  error: {
    wrapper: 'bg-white border-error-200',
    accent:  'bg-error-600',
    icon:    'text-error-600',
    path:    'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z',
  },
  info: {
    wrapper: 'bg-white border-brand-200',
    accent:  'bg-brand-600',
    icon:    'text-brand-600',
    path:    'M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z',
  },
  warning: {
    wrapper: 'bg-white border-warning-200',
    accent:  'bg-warning-600',
    icon:    'text-warning-600',
    path:    'M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  },
};

function ToastViewport({ toasts, onDismiss }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed bottom-4 right-4 z-[60] flex flex-col gap-3 w-[calc(100vw-2rem)] max-w-sm"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => {
        const s = VARIANT_STYLES[t.variant] ?? VARIANT_STYLES.info;
        return (
          <div
            key={t.id}
            role={t.variant === 'error' ? 'alert' : 'status'}
            className={`relative flex gap-3 overflow-hidden rounded-xl border shadow-card-lg p-4 pr-10 animate-slide-up ${s.wrapper}`}
          >
            <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${s.accent}`} />
            <svg aria-hidden="true" className={`h-5 w-5 shrink-0 mt-0.5 ${s.icon}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d={s.path} />
            </svg>
            <div className="flex flex-col gap-0.5 min-w-0">
              {t.title && <p className="text-sm font-semibold text-neutral-900">{t.title}</p>}
              <p className="text-sm text-neutral-600 break-words">{t.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="absolute top-2.5 right-2.5 h-6 w-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
