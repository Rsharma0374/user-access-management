import React from 'react';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import { ProductCardSkeleton } from '../../../components/ui/Skeleton.jsx';

/**
 * Summary cards for every available product.
 *
 * Each card shows the product name, identifier, status badge, total users and
 * MFA adoption rate, plus a "Manage Users" quick action that pre-filters the
 * dashboard to that product.
 *
 * @param {object}   props
 * @param {Product[]} props.products
 * @param {boolean}  props.loading
 * @param {string}   props.activeProduct     Currently selected product id (or 'all').
 * @param {function} props.onManageUsers     (productId) => void
 */
export default function ProductOverviewGrid({
  products = [],
  loading = false,
  activeProduct,
  onManageUsers,
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="auth-card p-10 text-center">
        <p className="text-sm text-neutral-500">No products available.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          active={product.id === activeProduct}
          onManageUsers={onManageUsers}
        />
      ))}
    </div>
  );
}

function ProductCard({ product, active, onManageUsers }) {
  const { id, name, description, status, userCount, mfaEnabledCount } = product;
  const isActive = status === 'ACTIVE';

  // The products endpoint does not return per-product aggregates. Only render
  // real metrics when the backend actually provides them — otherwise show a
  // neutral "no data" state instead of a misleading zero.
  const hasUserCount = Number.isFinite(userCount);
  const hasMfaMetrics = hasUserCount && Number.isFinite(mfaEnabledCount);
  const mfaRate =
    hasMfaMetrics && userCount > 0
      ? Math.round((mfaEnabledCount / userCount) * 100)
      : 0;

  return (
    <div
      className={`
        auth-card p-6 flex flex-col transition-shadow hover:shadow-card-lg
        ${active ? 'ring-2 ring-brand-500/60' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h4A1.5 1.5 0 0 1 10 4.5v4A1.5 1.5 0 0 1 8.5 10h-4A1.5 1.5 0 0 1 3 8.5v-4ZM11.5 3A1.5 1.5 0 0 0 10 4.5v4A1.5 1.5 0 0 0 11.5 10h4A1.5 1.5 0 0 0 17 8.5v-4A1.5 1.5 0 0 0 15.5 3h-4ZM10 11.5A1.5 1.5 0 0 1 11.5 10h4A1.5 1.5 0 0 1 17 11.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-4ZM3 11.5A1.5 1.5 0 0 1 4.5 10h4A1.5 1.5 0 0 1 10 11.5v4A1.5 1.5 0 0 1 8.5 17h-4A1.5 1.5 0 0 1 3 15.5v-4Z" />
          </svg>
        </div>
        <Badge variant={isActive ? 'success' : 'neutral'} dot>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <h3 className="mt-4 text-base font-semibold text-neutral-900">{name}</h3>
      <p className="mt-0.5 font-mono text-xs text-neutral-400">{id}</p>
      {description && (
        <p className="mt-2 text-sm text-neutral-500 leading-relaxed line-clamp-2">{description}</p>
      )}

      {/* Metrics */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Metric label="Users" value={hasUserCount ? userCount : '—'} />
        <Metric
          label="MFA adoption"
          value={hasMfaMetrics ? `${mfaRate}%` : '—'}
          hint={hasMfaMetrics ? `${mfaEnabledCount}/${userCount}` : undefined}
        />
      </div>

      {/* MFA adoption bar */}
      {hasMfaMetrics && (
        <div className="mt-3" aria-hidden="true">
          <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${mfaRate >= 75 ? 'bg-success-600' : mfaRate >= 40 ? 'bg-warning-600' : 'bg-error-600'}`}
              style={{ width: `${mfaRate}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-neutral-100">
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={() => onManageUsers?.(id)}
        >
          Manage Users
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-neutral-50 px-3 py-2.5">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-neutral-900 leading-tight">
        {value}
        {hint && <span className="ml-1 text-xs font-normal text-neutral-400">{hint}</span>}
      </p>
    </div>
  );
}
