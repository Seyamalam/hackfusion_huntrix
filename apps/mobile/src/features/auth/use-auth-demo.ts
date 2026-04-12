import { useEffect, useState } from 'react';

import {
  attemptTotpLogin,
  changeRole,
  detectAuditTampering,
  ensureAuthState,
  generateNextHotp,
  readTotpSnapshot,
  recordTotpViewed,
  rotateSecret,
  tamperLatestLog,
} from '@/src/features/auth/auth-service';
import type { AuthRole, AuthState, TotpSnapshot } from '@/src/features/auth/auth-types';

type AuthDemoState = {
  compromised: boolean;
  hotpCode: string | null;
  loading: boolean;
  loginStatus: string | null;
  snapshot: TotpSnapshot | null;
  state: AuthState | null;
};

const INITIAL_STATE: AuthDemoState = {
  compromised: false,
  hotpCode: null,
  loading: true,
  loginStatus: null,
  snapshot: null,
  state: null,
};

export function useAuthDemo() {
  const [demo, setDemo] = useState<AuthDemoState>(INITIAL_STATE);

  useEffect(() => {
    let active = true;

    ensureAuthState().then(async (authState) => {
      if (!active) {
        return;
      }

      const snapshot = readTotpSnapshot(authState);
      const nextState = await recordTotpViewed(authState, snapshot);

      if (!active) {
        return;
      }

      setDemo({
        compromised: false,
        hotpCode: null,
        loading: false,
        loginStatus: null,
        snapshot,
        state: nextState,
      });
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!demo.state) {
      return;
    }

    const timer = setInterval(() => {
      setDemo((current) =>
        current.state
          ? {
              ...current,
              snapshot: readTotpSnapshot(current.state),
            }
          : current,
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [demo.state]);

  async function runValidLogin() {
    if (!demo.state || !demo.snapshot) {
      return;
    }

    const result = await attemptTotpLogin(demo.state, demo.snapshot.code);
    setDemo((current) => ({
      ...current,
      loginStatus: result.accepted ? 'Current TOTP accepted' : 'Current TOTP rejected',
      state: result.state,
      snapshot: readTotpSnapshot(result.state),
    }));
  }

  async function runInvalidLogin() {
    if (!demo.state) {
      return;
    }

    const result = await attemptTotpLogin(demo.state, '000000');
    setDemo((current) => ({
      ...current,
      loginStatus: result.accepted ? 'Invalid login accepted' : 'Invalid login rejected',
      state: result.state,
      snapshot: readTotpSnapshot(result.state),
    }));
  }

  async function generateHotpCode() {
    if (!demo.state) {
      return;
    }

    const result = await generateNextHotp(demo.state);
    setDemo((current) => ({
      ...current,
      hotpCode: result.code,
      state: result.state,
      snapshot: readTotpSnapshot(result.state),
    }));
  }

  async function rotateOtpSecret() {
    if (!demo.state) {
      return;
    }

    const nextState = await rotateSecret(demo.state);
    setDemo((current) => ({
      ...current,
      hotpCode: null,
      loginStatus: 'OTP seed rotated',
      compromised: false,
      state: nextState,
      snapshot: readTotpSnapshot(nextState),
    }));
  }

  async function selectRole(role: AuthRole) {
    if (!demo.state) {
      return;
    }

    const nextState = await changeRole(demo.state, role);
    setDemo((current) => ({
      ...current,
      loginStatus: `Role set to ${role}`,
      state: nextState,
      snapshot: readTotpSnapshot(nextState),
    }));
  }

  async function tamperChain() {
    if (!demo.state) {
      return;
    }

    const nextState = await tamperLatestLog(demo.state);
    setDemo((current) => ({
      ...current,
      loginStatus: 'Latest auth log entry tampered for demo',
      state: nextState,
      snapshot: readTotpSnapshot(nextState),
    }));
  }

  async function verifyChain() {
    if (!demo.state) {
      return;
    }

    const result = await detectAuditTampering(demo.state);
    setDemo((current) => ({
      ...current,
      compromised: result.compromised,
      loginStatus: result.compromised ? 'Tamper detected' : 'Audit chain intact',
      state: result.state,
      snapshot: readTotpSnapshot(result.state),
    }));
  }

  return {
    ...demo,
    availableRoles: AUTH_ROLES,
    generateHotpCode,
    rotateOtpSecret,
    runInvalidLogin,
    runValidLogin,
    selectRole,
    tamperChain,
    verifyChain,
  };
}

export const AUTH_ROLES: AuthRole[] = [
  'field_volunteer',
  'supply_manager',
  'drone_operator',
  'camp_commander',
  'sync_admin',
];
