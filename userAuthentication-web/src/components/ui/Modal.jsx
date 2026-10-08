import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Accessible modal dialog.
 *
 * - Traps focus inside while open.
 * - Closes on Escape key and on backdrop click.
 * - Uses a portal so z-index stacking is never an issue.
 *
 * @param {object}  props
 * @param {boolean} props.open
 * @param {function} props.onClose
 * @param {string}  props.title
 * @param {'sm'|'md'|'lg'|'xl'} props.size
 * @param {React.ReactNode} props.children
 */
export default function Modal({
  open,
  onClose,
  title,
  size     = 'md',
  children,
  className = '',
}) {
  const overlayRef = useRef(null);
  const panelRef   = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [open]);

  // Focus the panel when opened
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const widths = {
    sm:  'max-w-sm',
    md:  'max-w-md',
    lg:  'max-w-lg',
    xl:  'max-w-2xl',
  };

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm animate-fade-in" />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`
          relative w-full ${widths[size]} bg-white rounded-2xl shadow-card-lg
          outline-none animate-slide-up max-h-[90dvh] flex flex-col
          ${className}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 flex-shrink-0">
          <h2 id="modal-title" className="text-base font-semibold text-neutral-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="
              h-8 w-8 rounded-lg flex items-center justify-center
              text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100
              transition-colors focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-brand-500
            "
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
