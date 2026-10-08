import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';

import { useAuth } from '../../auth/context/AuthContext.jsx';
import { useProduct, ALL_PRODUCTS } from '../context/ProductContext.jsx';
import { getUsers, createUser, toggleUserMfa, confirmUserMfa } from '../services/adminService.js';

import ProductSwitcher from '../components/ProductSwitcher.jsx';
import ProductOverviewGrid from '../components/ProductOverviewGrid.jsx';
import UserTable from '../components/UserTable.jsx';
import CreateUserModal from '../components/CreateUserModal.jsx';
import MfaConfirmationDialog from '../components/MfaConfirmationDialog.jsx';
import MfaEnrollmentResultDialog from '../components/MfaEnrollmentResultDialog.jsx';
import MockDataBanner from '../components/MockDataBanner.jsx';

/**
 * Super Admin multi-product dashboard.
 *
 * Composes the product switcher, product overview grid, and user management
 * table into a single authenticated layout. Owns all admin data fetching and
 * delegates presentation to the feature components.
 */
export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const { userEmail, isSuperAdmin, signOut } = useAuth();
  const {
    products,
    activeProduct,
    activeProductData,
    selectProduct,
    loading: productsLoading,
    isMockData: productsMock,
    refreshProducts,
  } = useProduct();

  // ── Users state ──────────────────────────────────────────────────────────
  const [users, setUsers]             = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError]   = useState(null);
  const [usersMock, setUsersMock]     = useState(false);

  const [search, setSearch]             = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [mfaFilter, setMfaFilter]       = useState('all');

  // ── Dialog / modal state ──────────────────────────────────────────────────
  const [createOpen, setCreateOpen]     = useState(false);
  const [createError, setCreateError]   = useState(null);
  const [mfaDialog, setMfaDialog]       = useState(null); // { user, nextValue }
  const [mfaSubmitting, setMfaSubmitting] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState(null);
  const [mfaEnrollment, setMfaEnrollment] = useState(null); // { user, result }

  // ── Sign out ───────────────────────────────────────────────────────────────
  const [signingOut, setSigningOut] = useState(false);

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch users whenever the scope, search, or filter changes
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const { data, _mock } = await getUsers({
        productName: activeProduct,
        search: debouncedSearch,
        mfaFilter,
      });
      setUsers(data);
      setUsersMock(_mock);
    } catch (err) {
      setUsersError(err?.message ?? 'Failed to load users.');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [activeProduct, debouncedSearch, mfaFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // id → display name for the product column
  const productNames = useMemo(() => {
    const map = {};
    for (const p of products) map[p.id] = p.name;
    return map;
  }, [products]);

  // Overview grid is scoped to the active selection: a single card for the
  // selected product, or every product when "All Products" is chosen.
  const visibleProducts = useMemo(
    () =>
      activeProduct === ALL_PRODUCTS
        ? products
        : products.filter((p) => p.id === activeProduct),
    [products, activeProduct],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleManageUsers(productId) {
    selectProduct(productId);
    // Scroll the user table into view for quick access.
    document.getElementById('user-management')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleCreateUser(values) {
    setCreateError(null);
    try {
      await createUser(values);
      toast.success(`User ${values.email} created successfully.`, { title: 'User created' });
      setCreateOpen(false);
      await Promise.all([fetchUsers(), refreshProducts()]);
    } catch (err) {
      // Keep the modal open and surface the error inline + as a toast.
      const message = err?.message ?? 'Failed to create user.';
      setCreateError(message);
      toast.error(message, { title: 'Could not create user' });
      throw err; // keeps react-hook-form isSubmitting accurate
    }
  }

  function requestMfaToggle(user, nextValue) {
    if (!isSuperAdmin) return; // UI guard; backend enforces authoritatively
    setMfaDialog({ user, nextValue });
  }

  async function confirmMfaToggle() {
    if (!mfaDialog) return;
    const { user, nextValue } = mfaDialog;
    setMfaSubmitting(true);
    setTogglingUserId(user.id);
    try {
      const { data } = await toggleUserMfa(user.id, nextValue);
      setMfaDialog(null);

      if (nextValue) {
        // Enrollment started. MFA is NOT active (and not enforced at login)
        // until the user confirms a code — so the row stays as-is until then.
        // The dialog surfaces the one-time secret / QR / recovery codes and
        // collects the confirmation code.
        if (data && (data.secret || data.qrCodeUrl)) {
          setMfaEnrollment({ user, result: data });
        } else {
          toast.success(`MFA enrollment started for ${user.email}.`, { title: 'MFA' });
          fetchUsers();
        }
      } else {
        setUsers((list) =>
          list.map((u) => (u.id === user.id ? { ...u, mfaEnabled: false } : u)),
        );
        toast.success(`MFA disabled for ${user.email}.`, { title: 'MFA updated' });
        refreshProducts(); // keep adoption metrics fresh
        if (mfaFilter !== 'all') fetchUsers();
      }
    } catch (err) {
      toast.error(err?.message ?? 'Failed to update MFA.', { title: 'MFA update failed' });
    } finally {
      setMfaSubmitting(false);
      setTogglingUserId(null);
    }
  }

  // Verify a code to activate the pending enrollment. Throws on failure so the
  // dialog can surface the error inline and keep itself open.
  async function handleConfirmEnrollment(code) {
    if (!mfaEnrollment) return;
    const { user } = mfaEnrollment;
    await confirmUserMfa(user.id, code);
    setMfaEnrollment(null);
    toast.success(`MFA activated for ${user.email}. Login now requires verification.`, {
      title: 'MFA enabled',
    });
    await Promise.all([fetchUsers(), refreshProducts()]);
  }

  // Dismiss the enrollment dialog without activating. Refetch so the row shows
  // the true (still-disabled) state until the user confirms later.
  function closeEnrollmentDialog() {
    setMfaEnrollment(null);
    fetchUsers();
    refreshProducts();
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err?.message ?? 'Sign-out failed. Please try again.');
      setSigningOut(false);
    }
  }

  const showMockBanner = productsMock || usersMock;
  const scopeLabel = activeProductData?.name ?? 'All Products';

  return (
    <div className="auth-bg min-h-dvh flex flex-col">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor" aria-hidden="true">
                <path d="M12 1L3 5.5v7c0 5.25 3.77 10.16 9 11.36 5.23-1.2 9-6.11 9-11.36v-7L12 1z" />
                <path d="M9 12.5l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <span className="font-semibold text-neutral-800 text-sm tracking-tight hidden sm:block">
              Guardian Admin
            </span>
            <div className="h-6 w-px bg-neutral-200 hidden sm:block" />
            <ProductSwitcher />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end leading-tight">
              <span className="text-xs font-medium text-neutral-700 truncate max-w-[180px]">
                {userEmail ?? 'Signed in'}
              </span>
              {isSuperAdmin ? (
                <Badge variant="purple" size="sm">Super Admin</Badge>
              ) : (
                <Badge variant="neutral" size="sm">Member</Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              loading={signingOut}
              loadingLabel="Signing out…"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-10">
        {showMockBanner && <MockDataBanner />}

        {!isSuperAdmin && (
          <Alert
            variant="info"
            title="Limited access"
            message="You are not signed in as a Super Admin. MFA controls are read-only — only Super Admins can modify MFA settings."
          />
        )}

        {/* Products overview */}
        <section aria-labelledby="products-heading">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 id="products-heading" className="text-title font-bold text-neutral-900">
                Products
              </h1>
              <p className="text-sm text-neutral-500 mt-0.5">
                {activeProduct === ALL_PRODUCTS
                  ? 'Overview of all products and their MFA adoption.'
                  : `Overview of ${scopeLabel} and its MFA adoption.`}
              </p>
            </div>
          </div>
          <ProductOverviewGrid
            products={visibleProducts}
            loading={productsLoading}
            activeProduct={activeProduct}
            onManageUsers={handleManageUsers}
          />
        </section>

        {/* User management */}
        <section id="user-management" aria-labelledby="users-heading" className="scroll-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 id="users-heading" className="text-title font-bold text-neutral-900">
                User management
              </h2>
              <p className="text-sm text-neutral-500 mt-0.5">
                Scope: <span className="font-medium text-neutral-700">{scopeLabel}</span>
              </p>
            </div>
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              Create user
            </Button>
          </div>

          <UserTable
            users={users}
            loading={usersLoading}
            error={usersError}
            search={search}
            onSearchChange={setSearch}
            mfaFilter={mfaFilter}
            onMfaFilterChange={setMfaFilter}
            isSuperAdmin={isSuperAdmin}
            togglingUserId={togglingUserId}
            onToggleMfa={requestMfaToggle}
            productNames={productNames}
          />
        </section>
      </main>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <CreateUserModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateError(null); }}
        onSubmit={handleCreateUser}
        products={products}
        activeProduct={activeProduct}
        serverError={createError}
      />

      <MfaConfirmationDialog
        open={!!mfaDialog}
        user={mfaDialog?.user}
        nextValue={mfaDialog?.nextValue}
        submitting={mfaSubmitting}
        onConfirm={confirmMfaToggle}
        onClose={() => setMfaDialog(null)}
      />

      <MfaEnrollmentResultDialog
        open={!!mfaEnrollment}
        user={mfaEnrollment?.user}
        result={mfaEnrollment?.result}
        onConfirm={handleConfirmEnrollment}
        onClose={closeEnrollmentDialog}
      />
    </div>
  );
}
