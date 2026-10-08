import React, { useEffect, useRef, useState } from 'react';
import { useProduct, ALL_PRODUCTS } from '../context/ProductContext.jsx';

/**
 * Top-bar product context switcher.
 *
 * A custom accessible dropdown (combobox pattern) listing "All Products" plus
 * every product. Selecting one updates the global product context, which
 * re-scopes the overview grid and the user table.
 */
export default function ProductSwitcher() {
  const { products, activeProduct, selectProduct, loading } = useProduct();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  const options = [
    { id: ALL_PRODUCTS, name: 'All Products' },
    ...products.map((p) => ({ id: p.id, name: p.name })),
  ];
  const current = options.find((o) => o.id === activeProduct) ?? options[0];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function choose(id) {
    selectProduct(id);
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select active product"
        className="
          inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white
          px-3 py-2 text-sm font-medium text-neutral-800 shadow-sm
          hover:border-neutral-400 hover:bg-neutral-50 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1
          min-w-[11rem] justify-between
        "
      >
        <span className="flex items-center gap-2 min-w-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-brand-600 shrink-0" aria-hidden="true">
            <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h4A1.5 1.5 0 0 1 10 4.5v4A1.5 1.5 0 0 1 8.5 10h-4A1.5 1.5 0 0 1 3 8.5v-4ZM10 11.5A1.5 1.5 0 0 1 11.5 10h4A1.5 1.5 0 0 1 17 11.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-4ZM3 11.5A1.5 1.5 0 0 1 4.5 10h4A1.5 1.5 0 0 1 10 11.5v4A1.5 1.5 0 0 1 8.5 17h-4A1.5 1.5 0 0 1 3 15.5v-4ZM11.5 3A1.5 1.5 0 0 0 10 4.5v4A1.5 1.5 0 0 0 11.5 10h4A1.5 1.5 0 0 0 17 8.5v-4A1.5 1.5 0 0 0 15.5 3h-4Z" />
          </svg>
          <span className="truncate">{current?.name ?? 'All Products'}</span>
        </span>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 text-neutral-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Products"
          className="
            absolute left-0 z-20 mt-2 w-64 max-h-80 overflow-auto rounded-xl border border-neutral-200
            bg-white p-1.5 shadow-card-lg animate-fade-in
          "
        >
          {options.map((opt) => {
            const selected = opt.id === activeProduct;
            return (
              <li key={opt.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => choose(opt.id)}
                  className={`
                    flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm
                    transition-colors
                    ${selected ? 'bg-brand-50 text-brand-700 font-medium' : 'text-neutral-700 hover:bg-neutral-100'}
                  `}
                >
                  <span className="truncate">{opt.name}</span>
                  {selected && (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-brand-600 shrink-0" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
