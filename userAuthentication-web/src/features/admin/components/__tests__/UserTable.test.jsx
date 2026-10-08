import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserTable from '../UserTable.jsx';

const USERS = [
  {
    id: 'usr-001',
    email: 'alice@example.com',
    fullName: 'Alice Anderson',
    productName: 'super-admin',
    role: 'ADMIN',
    status: 'ACTIVE',
    mfaEnabled: true,
    createdAt: '2024-01-15T08:30:00Z',
  },
  {
    id: 'usr-002',
    email: 'bob@example.com',
    fullName: 'Bob Builder',
    productName: 'analytics-hub',
    role: 'MEMBER',
    status: 'SUSPENDED',
    mfaEnabled: false,
    createdAt: '2024-02-20T11:00:00Z',
  },
];

const baseProps = {
  users: USERS,
  loading: false,
  search: '',
  onSearchChange: () => {},
  mfaFilter: 'all',
  onMfaFilterChange: () => {},
  onToggleMfa: () => {},
  productNames: { 'super-admin': 'Super Admin', 'analytics-hub': 'Analytics Hub' },
};

describe('UserTable', () => {
  it('renders a row per user with product display names and MFA badges', () => {
    render(<UserTable {...baseProps} isSuperAdmin />);

    expect(screen.getByText('Alice Anderson')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByText('Analytics Hub')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('shows an empty state when there are no users', () => {
    render(<UserTable {...baseProps} users={[]} isSuperAdmin />);
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('shows loading skeleton rows while loading', () => {
    const { container } = render(<UserTable {...baseProps} loading isSuperAdmin />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  // ── RBAC: the core security requirement ──────────────────────────────────
  it('ENABLES the MFA toggle for a super-admin', async () => {
    const onToggleMfa = vi.fn();
    render(<UserTable {...baseProps} isSuperAdmin onToggleMfa={onToggleMfa} />);

    const toggles = screen.getAllByRole('switch');
    expect(toggles[0]).toBeEnabled();

    await userEvent.click(toggles[0]);
    expect(onToggleMfa).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'usr-001' }),
      false, // Alice has MFA on → next value is off
    );
  });

  it('DISABLES the MFA toggle with an informative tooltip for non-super-admins', async () => {
    const onToggleMfa = vi.fn();
    render(<UserTable {...baseProps} isSuperAdmin={false} onToggleMfa={onToggleMfa} />);

    const toggles = screen.getAllByRole('switch');
    toggles.forEach((t) => {
      expect(t).toBeDisabled();
      expect(t).toHaveAttribute('title', 'Only Super Admins can modify MFA settings.');
    });

    // Clicking a disabled toggle must not invoke the handler.
    await userEvent.click(toggles[0]);
    expect(onToggleMfa).not.toHaveBeenCalled();
  });

  it('reflects the current MFA state via aria-checked', () => {
    render(<UserTable {...baseProps} isSuperAdmin />);
    const toggles = screen.getAllByRole('switch');
    expect(toggles[0]).toHaveAttribute('aria-checked', 'true');  // Alice enabled
    expect(toggles[1]).toHaveAttribute('aria-checked', 'false'); // Bob disabled
  });

  it('calls onSearchChange when typing in the search box', async () => {
    const onSearchChange = vi.fn();
    render(<UserTable {...baseProps} isSuperAdmin onSearchChange={onSearchChange} />);
    const box = screen.getByPlaceholderText(/search by name or email/i);
    await userEvent.type(box, 'a');
    expect(onSearchChange).toHaveBeenCalled();
  });
});
