import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { getRequiredRolesForPath } from "@/config/navigation";
import { NotAuthorized } from "@/components/shared/not-authorized";

/**
 * Client-side RBAC route guard. Resolves the roles required for the current
 * path from the shared navigation config and blocks access when the signed-in
 * user's role isn't permitted — so a URL a user can't see in the sidebar can't
 * be reached by typing it either. Mirrors the server's `requireRole`; the
 * server remains the authoritative security boundary.
 */
export function RequireRouteAccess({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const requiredRoles = getRequiredRolesForPath(pathname);
  const blocked = requiredRoles !== null && (!user || !requiredRoles.includes(user.role));

  if (blocked) {
    return <NotAuthorized />;
  }

  return <>{children}</>;
}
