import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import {
  login as apiLogin,
  logout as apiLogout,
  logoutAll as apiLogoutAll,
  refreshAccessToken,
  verifyMfa as apiVerifyMfa,
} from '../services/authService.js';
import { tokenStore, sessionStore } from '../../../services/httpClient.js';
import { decodeJwt, isSuperAdminClaims, getRoles, getSubject, getEmail } from '../../../utils/jwt.js';

// ─── State ────────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

const INITIAL_STATE = {
  status: 'initializing',   // 'initializing' | 'authenticated' | 'unauthenticated'
  sessionId:    null,
  claims:       null,        // decoded JWT payload
  mfaChallenge: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'INITIALIZED_UNAUTHENTICATED':
      return { ...INITIAL_STATE, status: 'unauthenticated' };

    case 'LOGIN_SUCCESS':
      return {
        ...INITIAL_STATE,
        status:    'authenticated',
        sessionId: action.payload.sessionId,
        claims:    action.payload.claims,
      };

    case 'MFA_REQUIRED':
      return { ...state, mfaChallenge: { challengeId: action.payload.challengeId } };

    case 'MFA_VERIFIED':
      return {
        ...INITIAL_STATE,
        status:    'authenticated',
        sessionId: action.payload.sessionId,
        claims:    action.payload.claims,
      };

    case 'LOGOUT':
    case 'SESSION_EXPIRED':
      return { ...INITIAL_STATE, status: 'unauthenticated' };

    default:
      return state;
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function buildLoginPayload(result) {
  const claims = decodeJwt(result?.accessToken ?? null);
  return {
    sessionId: result?.sessionId ?? null,
    claims,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, INITIAL_STATE);
  const refreshIntervalRef = useRef(null);

  // ── Initial session restore ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function tryRestore() {
      try {
        const result = await refreshAccessToken();
        if (!cancelled && result?.accessToken) {
          if (result.sessionId) sessionStore.set(result.sessionId);
          dispatch({ type: 'LOGIN_SUCCESS', payload: buildLoginPayload(result) });
        } else if (!cancelled) {
          dispatch({ type: 'INITIALIZED_UNAUTHENTICATED' });
        }
      } catch {
        if (!cancelled) dispatch({ type: 'INITIALIZED_UNAUTHENTICATED' });
      }
    }
    tryRestore();
    return () => { cancelled = true; };
  }, []);

  // ── Proactive token refresh every 9 minutes ────────────────────────────────
  useEffect(() => {
    if (state.status !== 'authenticated') {
      clearInterval(refreshIntervalRef.current);
      return;
    }
    refreshIntervalRef.current = setInterval(async () => {
      try {
        const result = await refreshAccessToken();
        if (result?.sessionId) sessionStore.set(result.sessionId);
        // claims stay the same unless the token changes; update silently
        const claims = decodeJwt(result?.accessToken ?? null);
        if (claims) dispatch({ type: 'LOGIN_SUCCESS', payload: { sessionId: result.sessionId ?? state.sessionId, claims } });
      } catch {
        tokenStore.clear();
        sessionStore.clear();
        dispatch({ type: 'SESSION_EXPIRED' });
      }
    }, 9 * 60 * 1000);
    return () => clearInterval(refreshIntervalRef.current);
  }, [state.status, state.sessionId]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const signIn = useCallback(async ({ email, password, deviceId, deviceName }) => {
    const result = await apiLogin({ email, password, deviceId, deviceName });

    if (result?.type === 'MFA_REQUIRED') {
      dispatch({ type: 'MFA_REQUIRED', payload: { challengeId: result.challengeId } });
      return { mfaRequired: true, challengeId: result.challengeId };
    }

    if (result?.sessionId) sessionStore.set(result.sessionId);
    dispatch({ type: 'LOGIN_SUCCESS', payload: buildLoginPayload(result) });
    return { mfaRequired: false };
  }, []);

  const completeMfa = useCallback(async ({ code, deviceId, deviceName }) => {
    if (!state.mfaChallenge?.challengeId) throw new Error('No active MFA challenge.');
    const result = await apiVerifyMfa({
      challengeId: state.mfaChallenge.challengeId,
      code,
      deviceId,
      deviceName,
    });
    if (result?.sessionId) sessionStore.set(result.sessionId);
    dispatch({ type: 'MFA_VERIFIED', payload: buildLoginPayload(result) });
  }, [state.mfaChallenge]);

  const signOut = useCallback(async () => {
    try { await apiLogout(); } finally {
      sessionStore.clear();
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const signOutAll = useCallback(async () => {
    try { await apiLogoutAll(); } finally {
      sessionStore.clear();
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const isSuperAdmin  = isSuperAdminClaims(state.claims);
  const roles         = getRoles(state.claims);
  const userEmail     = getEmail(state.claims);
  const userSubject   = getSubject(state.claims);
  const tokenProduct  = state.claims?.productName ?? null;

  const value = {
    status:         state.status,
    sessionId:      state.sessionId,
    claims:         state.claims,
    isInitializing: state.status === 'initializing',
    isAuthenticated: state.status === 'authenticated',
    isSuperAdmin,
    roles,
    userEmail,
    userSubject,
    tokenProduct,
    mfaChallenge:   state.mfaChallenge,
    signIn,
    completeMfa,
    signOut,
    signOutAll,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
