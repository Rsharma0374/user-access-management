/**
 * Mock data for admin dashboard.
 *
 * Used when the real admin API endpoints are not yet available.
 * Mock mode is explicitly enabled via VITE_ADMIN_MOCK=true.
 * Any component that uses mock data shows a visible "MOCK DATA" banner.
 */

export const MOCK_PRODUCTS = [
  {
    id: 'super-admin',
    name: 'Super Admin',
    description: 'Platform-level administration',
    status: 'ACTIVE',
    userCount: 4,
    mfaEnabledCount: 3,
  },
  {
    id: 'analytics-hub',
    name: 'Analytics Hub',
    description: 'Business intelligence & reporting',
    status: 'ACTIVE',
    userCount: 28,
    mfaEnabledCount: 19,
  },
  {
    id: 'billing-engine',
    name: 'Billing Engine',
    description: 'Subscription & payment processing',
    status: 'ACTIVE',
    userCount: 14,
    mfaEnabledCount: 14,
  },
  {
    id: 'crm-platform',
    name: 'CRM Platform',
    description: 'Customer relationship management',
    status: 'ACTIVE',
    userCount: 51,
    mfaEnabledCount: 22,
  },
  {
    id: 'dev-sandbox',
    name: 'Dev Sandbox',
    description: 'Internal development & testing',
    status: 'INACTIVE',
    userCount: 7,
    mfaEnabledCount: 1,
  },
];

let _mockUsers = [
  {
    id: 'usr-001',
    email: 'alice.admin@example.com',
    fullName: 'Alice Anderson',
    productName: 'super-admin',
    role: 'ADMIN',
    status: 'ACTIVE',
    mfaEnabled: true,
    createdAt: '2024-01-15T08:30:00Z',
  },
  {
    id: 'usr-002',
    email: 'bob.ops@example.com',
    fullName: 'Bob Operations',
    productName: 'super-admin',
    role: 'MEMBER',
    status: 'ACTIVE',
    mfaEnabled: true,
    createdAt: '2024-02-20T11:00:00Z',
  },
  {
    id: 'usr-003',
    email: 'carol.viewer@example.com',
    fullName: 'Carol Viewer',
    productName: 'super-admin',
    role: 'VIEWER',
    status: 'ACTIVE',
    mfaEnabled: false,
    createdAt: '2024-03-05T14:15:00Z',
  },
  {
    id: 'usr-004',
    email: 'dave.inactive@example.com',
    fullName: 'Dave Inactive',
    productName: 'super-admin',
    role: 'MEMBER',
    status: 'SUSPENDED',
    mfaEnabled: false,
    createdAt: '2024-01-28T09:00:00Z',
  },
  {
    id: 'usr-005',
    email: 'emma.analyst@example.com',
    fullName: 'Emma Analyst',
    productName: 'analytics-hub',
    role: 'ADMIN',
    status: 'ACTIVE',
    mfaEnabled: true,
    createdAt: '2024-02-01T10:00:00Z',
  },
  {
    id: 'usr-006',
    email: 'frank.bi@example.com',
    fullName: 'Frank BI',
    productName: 'analytics-hub',
    role: 'MEMBER',
    status: 'ACTIVE',
    mfaEnabled: true,
    createdAt: '2024-03-10T08:45:00Z',
  },
  {
    id: 'usr-007',
    email: 'grace.billing@example.com',
    fullName: 'Grace Billing',
    productName: 'billing-engine',
    role: 'ADMIN',
    status: 'ACTIVE',
    mfaEnabled: true,
    createdAt: '2024-01-10T13:00:00Z',
  },
  {
    id: 'usr-008',
    email: 'henry.crm@example.com',
    fullName: 'Henry CRM',
    productName: 'crm-platform',
    role: 'ADMIN',
    status: 'ACTIVE',
    mfaEnabled: true,
    createdAt: '2024-02-14T09:30:00Z',
  },
  {
    id: 'usr-009',
    email: 'iris.crm@example.com',
    fullName: 'Iris CRM',
    productName: 'crm-platform',
    role: 'MEMBER',
    status: 'ACTIVE',
    mfaEnabled: false,
    createdAt: '2024-04-01T11:20:00Z',
  },
  {
    id: 'usr-010',
    email: 'jack.dev@example.com',
    fullName: 'Jack Dev',
    productName: 'dev-sandbox',
    role: 'ADMIN',
    status: 'ACTIVE',
    mfaEnabled: false,
    createdAt: '2024-03-22T16:00:00Z',
  },
];

let _nextId = 11;

/** Simulate network latency */
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export const mockApi = {
  // ── Products ───────────────────────────────────────────────────────────────
  async getProducts() {
    await delay(400);
    return [...MOCK_PRODUCTS];
  },

  // ── Users ──────────────────────────────────────────────────────────────────
  async getUsers({ productName, search, mfaFilter } = {}) {
    await delay(500);
    let results = [..._mockUsers];

    if (productName && productName !== 'all') {
      results = results.filter((u) => u.productName === productName);
    }
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.fullName.toLowerCase().includes(q),
      );
    }
    if (mfaFilter === 'enabled') {
      results = results.filter((u) => u.mfaEnabled);
    } else if (mfaFilter === 'disabled') {
      results = results.filter((u) => !u.mfaEnabled);
    }

    return results;
  },

  async createUser({ fullName, email, password, productName, role, mfaEnabled }) {
    await delay(600);
    // Simulate duplicate email check
    if (_mockUsers.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      const err = new Error('A user with this email already exists.');
      err.status = 409;
      throw err;
    }
    const newUser = {
      id: `usr-${String(_nextId++).padStart(3, '0')}`,
      email,
      fullName,
      productName,
      role,
      status: 'PENDING_VERIFICATION',
      mfaEnabled: mfaEnabled ?? false,
      createdAt: new Date().toISOString(),
    };
    _mockUsers.push(newUser);

    // Update product user count
    const prod = MOCK_PRODUCTS.find((p) => p.id === productName);
    if (prod) {
      prod.userCount += 1;
      if (mfaEnabled) prod.mfaEnabledCount += 1;
    }

    return newUser;
  },

  async toggleMfa(userId, mfaEnabled) {
    await delay(400);
    const user = _mockUsers.find((u) => u.id === userId);
    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      throw err;
    }
    const prev = user.mfaEnabled;
    user.mfaEnabled = mfaEnabled;

    // Update product mfa count
    const prod = MOCK_PRODUCTS.find((p) => p.id === user.productName);
    if (prod) {
      if (mfaEnabled && !prev) prod.mfaEnabledCount += 1;
      if (!mfaEnabled && prev) prod.mfaEnabledCount -= 1;
    }

    return { ...user };
  },
};
