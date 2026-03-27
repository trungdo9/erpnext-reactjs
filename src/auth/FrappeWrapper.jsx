/**
 * FrappeWrapper
 *
 * Wraps the app with FrappeProvider (frappe-react-sdk) using dynamic tokenParams.
 * When authMode changes in useAuthStore, FrappeProvider re-renders with new tokenParams:
 *   - 'session': useToken: false → no Authorization header → session cookies work
 *   - 'token':   useToken: true  → Authorization: token api_key:api_secret
 *
 * FrappeSync updates the module-level db/auth/call exports in frappeClient.js
 * synchronously during render (before children render), so all existing
 * `import { db } from '../api/frappeClient'` consumers get the correct instance.
 */
import { useMemo, useContext } from 'react';
import PropTypes from 'prop-types';
import { FrappeProvider, FrappeContext } from 'frappe-react-sdk';
import useAuthStore from '../stores/useAuthStore';
import { tokenService } from './tokenService';
import { _setFrappeInstances } from '../api/frappeClient';

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || '';

function FrappeSync() {
  const frappe = useContext(FrappeContext);
  // Sync instances synchronously during render — before any sibling components render.
  // This ensures frappeClient module exports always reflect the current tokenParams.
  if (frappe) {
    _setFrappeInstances(frappe.db, frappe.auth, frappe.call);
  }
  return null;
}

export function FrappeWrapper({ children }) {
  const authMode = useAuthStore((s) => s.authMode);

  const tokenParams = useMemo(
    () =>
      authMode === 'token'
        ? { useToken: true, token: () => tokenService.getToken(), type: 'token' }
        : { useToken: false, token: () => '', type: 'token' },
    [authMode],
  );

  return (
    <FrappeProvider url={FRAPPE_URL} tokenParams={tokenParams}>
      <FrappeSync />
      {children}
    </FrappeProvider>
  );
}

FrappeWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};
