import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getProducts, getUsers } from '../services/adminService.js';
import { MOCK_PRODUCTS } from '../services/mockData.js';

const ProductContext = createContext(null);

/** Sentinel value meaning "show all products" */
export const ALL_PRODUCTS = 'all';

/**
 * The products endpoint does not return per-product aggregates, so derive the
 * "Users" and "MFA adoption" figures from the full user list. Counts the
 * endpoint already provides (e.g. mock data) are preserved as-is.
 *
 * @param {Product[]} products
 * @returns {Promise<Product[]>}
 */
async function withUserCounts(products) {
  // Nothing to backfill — every product already carries both aggregates.
  const needsCounts = products.some(
    (p) => !Number.isFinite(p.userCount) || !Number.isFinite(p.mfaEnabledCount),
  );
  if (!needsCounts) return products;

  let users = [];
  try {
    ({ data: users } = await getUsers({}));
  } catch {
    // If users can't be loaded, leave the aggregates unset so the cards show a
    // neutral "no data" state rather than a misleading zero.
    return products;
  }

  return products.map((p) => {
    const hasUsers = Number.isFinite(p.userCount);
    const hasMfa = Number.isFinite(p.mfaEnabledCount);
    if (hasUsers && hasMfa) return p;

    const productUsers = users.filter((u) => u.productName === p.id);
    return {
      ...p,
      userCount: hasUsers ? p.userCount : productUsers.length,
      mfaEnabledCount: hasMfa
        ? p.mfaEnabledCount
        : productUsers.filter((u) => u.mfaEnabled).length,
    };
  });
}

export function ProductProvider({ children }) {
  const [products,       setProducts]       = useState([]);
  const [activeProduct,  setActiveProduct]  = useState(ALL_PRODUCTS);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [isMockData,     setIsMockData]     = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, _mock } = await getProducts();
      setProducts(await withUserCounts(data));
      setIsMockData(_mock);
    } catch (err) {
      setError(err?.message ?? 'Failed to load products.');
      // Fall back to static mock so the UI doesn't break entirely
      setProducts(MOCK_PRODUCTS);
      setIsMockData(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const selectProduct = useCallback((productId) => {
    setActiveProduct(productId);
  }, []);

  const refreshProducts = useCallback(() => loadProducts(), [loadProducts]);

  /** The full Product object for the active selection, or null for "all". */
  const activeProductData =
    activeProduct === ALL_PRODUCTS
      ? null
      : products.find((p) => p.id === activeProduct) ?? null;

  const value = {
    products,
    activeProduct,
    activeProductData,
    selectProduct,
    refreshProducts,
    loading,
    error,
    isMockData,
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProduct() {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error('useProduct must be used inside <ProductProvider>');
  return ctx;
}
