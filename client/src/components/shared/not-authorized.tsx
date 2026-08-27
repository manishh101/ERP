import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

/**
 * Shown when an authenticated user opens a route their role cannot access
 * (defense-in-depth for the sidebar's RBAC filtering — the server still
 * enforces access on every request). Rendered inside the shell so the user
 * keeps the sidebar and can navigate away.
 */
export function NotAuthorized() {
  return (
    <div role="alert" className="mx-auto max-w-md py-12">
      <EmptyState
        icon={Lock}
        title="Not authorized"
        description="You don't have access to this section. If you think this is a mistake, contact your workspace administrator."
        action={
          <Button asChild>
            <Link to="/">Back to Dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
