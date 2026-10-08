import React from 'react';
import Badge from '../../../components/ui/Badge.jsx';
import Toggle from '../../../components/ui/Toggle.jsx';
import Select from '../../../components/ui/Select.jsx';
import { TableRowSkeleton } from '../../../components/ui/Skeleton.jsx';

const NO_SUPER_ADMIN_HINT = 'Only Super Admins can modify MFA settings.';

const STATUS_VARIANT = {
  ACTIVE: 'success',
  SUSPENDED: 'error',
  PENDING_VERIFICATION: 'warning',
  INACTIVE: 'neutral',
};

const ROLE_VARIANT = {
  ADMIN: 'purple',
  MEMBER: 'info',
  VIEWER: 'neutral',
};

const MFA_FILTER_OPTIONS = [
  { value: 'all',      label: 'MFA: All' },
  { value: 'enabled',  label: 'MFA: Enabled' },
  { value: 'disabled', label: 'MFA: Disabled' },
];

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function prettyStatus(status) {
  return String(status ?? '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * User management data table with search, MFA filter and a super-admin-gated
 * MFA toggle per row.
 *
 * @param {object}   props
 * @param {User[]}   props.users
 * @param {boolean}  props.loading
 * @param {string}   [props.error]
 * @param {string}   props.search
 * @param {function} props.onSearchChange      (value) => void
 * @param {string}   props.mfaFilter           'all' | 'enabled' | 'disabled'
 * @param {function} props.onMfaFilterChange   (value) => void
 * @param {boolean}  props.isSuperAdmin
 * @param {string}   [props.togglingUserId]    Id of the user whose MFA is updating.
 * @param {function} props.onToggleMfa         (user, nextValue) => void
 * @param {Record<string,string>} props.productNames  id → display name map.
 */
export default function UserTable({
  users = [],
  loading = false,
  error,
  search,
  onSearchChange,
  mfaFilter = 'all',
  onMfaFilterChange,
  isSuperAdmin = false,
  togglingUserId,
  onToggleMfa,
  productNames = {},
}) {
  return (
    <div className="auth-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-neutral-100">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 3.473 9.772l3.377 3.378a.75.75 0 1 0 1.06-1.06l-3.377-3.378A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" clipRule="evenodd" />
            </svg>
          </span>
          <label htmlFor="user-search" className="sr-only">Search users by name or email</label>
          <input
            id="user-search"
            type="search"
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-neutral-300 bg-white pl-9 pr-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none hover:border-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-colors"
          />
        </div>
        <div className="sm:w-48">
          <Select
            id="mfa-filter"
            label="Filter by MFA status"
            hideLabel
            options={MFA_FILTER_OPTIONS}
            value={mfaFilter}
            onChange={(e) => onMfaFilterChange?.(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 bg-neutral-50/60">
              <th scope="col" className="px-4 py-3">User</th>
              <th scope="col" className="px-4 py-3">Product</th>
              <th scope="col" className="px-4 py-3">Role</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">MFA</th>
              <th scope="col" className="px-4 py-3">Created</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)}

            {!loading && error && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-error-600">
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="text-sm font-medium text-neutral-700">No users found</p>
                  <p className="mt-1 text-sm text-neutral-400">
                    Try adjusting your search or filters.
                  </p>
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              users.map((user) => {
                const busy = togglingUserId === user.id;
                return (
                  <tr key={user.id} className="hover:bg-neutral-50/60 transition-colors">
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.fullName || user.email} />
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-900 truncate">
                            {user.fullName || '—'}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Product */}
                    <td className="px-4 py-3 text-neutral-700">
                      {productNames[user.productName] ?? user.productName}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      {user.role ? (
                        <Badge variant={ROLE_VARIANT[user.role] ?? 'neutral'} size="sm">
                          {prettyStatus(user.role)}
                        </Badge>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[user.status] ?? 'neutral'} size="sm" dot>
                        {prettyStatus(user.status)}
                      </Badge>
                    </td>

                    {/* MFA status badge */}
                    <td className="px-4 py-3">
                      <Badge variant={user.mfaEnabled ? 'success' : 'neutral'} size="sm">
                        {user.mfaEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">
                      {formatDate(user.createdAt)}
                    </td>

                    {/* Actions — MFA toggle (super-admin only) */}
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Toggle
                          checked={!!user.mfaEnabled}
                          disabled={!isSuperAdmin}
                          loading={busy}
                          onChange={(next) => onToggleMfa?.(user, next)}
                          label={`${user.mfaEnabled ? 'Disable' : 'Enable'} MFA for ${user.email}`}
                          title={isSuperAdmin ? undefined : NO_SUPER_ADMIN_HINT}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      {!loading && !error && users.length > 0 && (
        <div className="px-4 py-3 border-t border-neutral-100 text-xs text-neutral-500">
          {users.length} {users.length === 1 ? 'user' : 'users'}
        </div>
      )}
    </div>
  );
}

function Avatar({ name }) {
  const initials = String(name ?? '?')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700"
    >
      {initials || '?'}
    </span>
  );
}
