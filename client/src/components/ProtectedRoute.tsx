import { ComponentType } from 'react';
import { Redirect } from 'wouter';
import { hasValidSession, LOGIN_PATH } from '@/lib/auth';

/**
 * Route wrapper for pages that call protected endpoints.
 *
 * Every page behind this wrapper (Dashboard, Feedback, Analytics, Themes,
 * Features, Prioritization) hits /api/feedback or /api/stats, both of which
 * require a JWT. Checking here means the page never mounts — and never fires a
 * request guaranteed to 401 — without a usable session.
 *
 * This guards the *entry* to a page. A token that expires while the page is
 * already open is handled by the 401 response interceptor in lib/trpc.ts;
 * the two together cover both directions.
 */
export default function ProtectedRoute({ component: Component }: { component: ComponentType }) {
  if (!hasValidSession()) {
    return <Redirect to={LOGIN_PATH} />;
  }
  return <Component />;
}
