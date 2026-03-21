import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/layout/toast-provider";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useInviteUserMutation, useUpdateUserMutation, useUsersQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import type { UserRole } from "@/types/domain";

const roleOptions: UserRole[] = ["ADMIN", "ACCOUNTANT", "SALES", "WAREHOUSE", "DRIVER"];

type InviteFormState = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
};

const initialInviteForm: InviteFormState = {
  name: "",
  email: "",
  password: "Password123!",
  role: "SALES",
  isActive: true,
};

export function UsersPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const { data, error, isLoading } = useUsersQuery();
  const inviteUser = useInviteUserMutation();
  const updateUser = useUpdateUserMutation();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormState>(initialInviteForm);
  const [userDrafts, setUserDrafts] = useState<Record<string, { role: UserRole; isActive: boolean }>>({});

  useEffect(() => {
    if (!data) {
      return;
    }

    setUserDrafts((current) => {
      const next = { ...current };

      data.items.forEach((account) => {
        next[account.id] = {
          role: current[account.id]?.role ?? account.rawRole,
          isActive: current[account.id]?.isActive ?? account.isActive,
        };
      });

      return next;
    });
  }, [data]);

  const updatingUserId = useMemo(() => updateUser.variables?.id ?? null, [updateUser.variables]);

  if (user?.role !== "ADMIN") {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Admin access required.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            User and role management is only available to administrator accounts.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Users could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="RBAC"
        title="Users & Roles"
        description="Role-based access control for Admin, Accountant, Sales, Warehouse, and Driver users with invite and deactivation flows."
        actions={[
          {
            label: inviteOpen ? "Close Invite" : "Invite User",
            onClick: () => setInviteOpen((current) => !current),
          },
        ]}
      />

      {inviteOpen ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Invite User</CardTitle>
              <CardDescription>Create a new account and assign its starting role.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Input
              value={inviteForm.name}
              onChange={(event) => setInviteForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Full name"
            />
            <Input
              value={inviteForm.email}
              onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="Email address"
              type="email"
            />
            <Input
              value={inviteForm.password}
              onChange={(event) => setInviteForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Temporary password"
              type="password"
            />
            <select
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={inviteForm.role}
              onChange={(event) =>
                setInviteForm((current) => ({
                  ...current,
                  role: event.target.value as UserRole,
                }))
              }
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-white/90 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={inviteForm.isActive}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              Create as active user
            </label>
            <div className="md:col-span-2 flex gap-3">
              <Button
                onClick={async () => {
                  try {
                    await inviteUser.mutateAsync(inviteForm);
                    setInviteForm(initialInviteForm);
                    setInviteOpen(false);
                    push("User invited", "The new account has been created successfully.");
                  } catch (requestError) {
                    push("Invite failed", getErrorMessage(requestError, "Unable to invite user."));
                  }
                }}
                disabled={inviteUser.isPending}
              >
                {inviteUser.isPending ? "Inviting..." : "Create User"}
              </Button>
              <Button variant="outline" onClick={() => setInviteForm(initialInviteForm)} disabled={inviteUser.isPending}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Invite, edit roles, and deactivate accounts without leaving the admin console.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.items.map((account) => (
            <div
              key={account.id}
              className="flex flex-col gap-4 rounded-3xl border border-border bg-white p-5 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <p className="font-semibold">{account.name}</p>
                <p className="text-sm text-muted-foreground">
                  {account.email} · {account.role}
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <StatusBadge value={account.status} />
                <select
                  className="flex h-11 rounded-2xl border border-border bg-white/90 px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={userDrafts[account.id]?.role ?? account.rawRole}
                  onChange={(event) =>
                    setUserDrafts((current) => ({
                      ...current,
                      [account.id]: {
                        role: event.target.value as UserRole,
                        isActive: current[account.id]?.isActive ?? account.isActive,
                      },
                    }))
                  }
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={userDrafts[account.id]?.isActive ?? account.isActive}
                    disabled={account.id === user.id}
                    onChange={(event) =>
                      setUserDrafts((current) => ({
                        ...current,
                        [account.id]: {
                          role: current[account.id]?.role ?? account.rawRole,
                          isActive: event.target.checked,
                        },
                      }))
                    }
                  />
                  Active
                </label>
                <Button
                  variant="outline"
                  disabled={
                    updateUser.isPending ||
                    ((userDrafts[account.id]?.role ?? account.rawRole) === account.rawRole &&
                      (userDrafts[account.id]?.isActive ?? account.isActive) === account.isActive)
                  }
                  onClick={async () => {
                    try {
                      await updateUser.mutateAsync({
                        id: account.id,
                        role: userDrafts[account.id]?.role ?? account.rawRole,
                        isActive: userDrafts[account.id]?.isActive ?? account.isActive,
                      });
                      push("User updated", `${account.name}'s access has been updated.`);
                    } catch (requestError) {
                      push("Update failed", getErrorMessage(requestError, "Unable to update user."));
                    }
                  }}
                >
                  {updateUser.isPending && updatingUserId === account.id ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
