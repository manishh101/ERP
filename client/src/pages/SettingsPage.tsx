import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/layout/toast-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useSettingsQuery } from "@/hooks/use-queries";
import { apiRequest, getErrorMessage } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { CreateWarehouseForm } from "@/components/settings/create-warehouse-form";
import { CreateTaxRateForm } from "@/components/settings/create-tax-rate-form";
import { UserInviteForm } from "@/components/settings/user-invite-form";

const emptyCompanyProfile = {
  name: "",
  address: "",
  taxNumber: "",
  bankDetails: "",
  email: "",
  phone: "",
  website: "",
};

const emptyCurrencySettings = {
  baseCurrency: "USD",
  supportedCurrencies: "USD",
  multiCurrencyEnabled: false,
};

const emptyNotificationSettings = {
  overdueInvoiceDays: "7, 14, 30",
  lowStockEnabled: true,
  deliveryUpdatesEnabled: true,
  emailEnabled: true,
};

const emptyInvoiceTemplate = {
  primaryColor: "#7c5c45",
  footerText: "Thank you for your business.",
  paymentTerms: "Payment due within 14 days.",
};

function formatCsv(values: Array<string | number>) {
  return values.join(", ");
}

function parseCsvInput(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function SettingsPage() {
  const { push } = useToast();
  const { token, user } = useAuth();
  const { data, error, isLoading } = useSettingsQuery();
  const [companyProfile, setCompanyProfile] = useState(emptyCompanyProfile);
  const [currencySettings, setCurrencySettings] = useState(emptyCurrencySettings);
  const [notificationSettings, setNotificationSettings] = useState(emptyNotificationSettings);
  const [invoiceTemplate, setInvoiceTemplate] = useState(emptyInvoiceTemplate);
  const [profileSaving, setProfileSaving] = useState(false);
  const [operationsSaving, setOperationsSaving] = useState(false);
  const [createWarehouseOpen, setCreateWarehouseOpen] = useState(false);
  const [createTaxRateOpen, setCreateTaxRateOpen] = useState(false);
  const [inviteUserOpen, setInviteUserOpen] = useState(false);

  useEffect(() => {
    if (data) {
      setCompanyProfile({
        name: data.companyProfile.name,
        address: data.companyProfile.address,
        taxNumber: data.companyProfile.taxNumber,
        bankDetails: data.companyProfile.bankDetails,
        email: data.companyProfile.email ?? "",
        phone: data.companyProfile.phone ?? "",
        website: data.companyProfile.website ?? "",
      });
      setCurrencySettings({
        baseCurrency: data.currency.baseCurrency,
        supportedCurrencies: formatCsv(data.currency.supportedCurrencies),
        multiCurrencyEnabled: data.currency.multiCurrencyEnabled,
      });
      setNotificationSettings({
        overdueInvoiceDays: formatCsv(data.notification.overdueInvoiceDays),
        lowStockEnabled: data.notification.lowStockEnabled,
        deliveryUpdatesEnabled: data.notification.deliveryUpdatesEnabled,
        emailEnabled: data.notification.emailEnabled,
      });
      setInvoiceTemplate(data.invoiceTemplate);
    }
  }, [data]);

  if (user?.role !== "ADMIN") {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Admin access required.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Company and system settings are only available to administrator accounts.
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
          <p className="font-semibold">Settings could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  async function handleSaveCompanyProfile() {
    if (!token) {
      return;
    }

    setProfileSaving(true);

    let website = companyProfile.website;
    if (website && !website.startsWith("http://") && !website.startsWith("https://")) {
      website = `https://${website}`;
    }

    try {
      await apiRequest("/settings/company-profile", {
        method: "PATCH",
        token,
        body: {
          ...companyProfile,
          website,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      push("Company profile saved", "Settings are now being persisted to the backend.");
    } catch (requestError) {
      push("Save failed", getErrorMessage(requestError, "Unable to save company profile."));
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleSaveOperationalSettings() {
    if (!token) {
      return;
    }

    const supportedCurrencies = parseCsvInput(currencySettings.supportedCurrencies).map((item) =>
      item.toUpperCase(),
    );
    const overdueInvoiceDays = parseCsvInput(notificationSettings.overdueInvoiceDays)
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0);

    if (supportedCurrencies.length === 0) {
      push("Save failed", "Add at least one supported currency.");
      return;
    }

    if (overdueInvoiceDays.length === 0) {
      push("Save failed", "Add at least one overdue reminder day.");
      return;
    }

    setOperationsSaving(true);

    try {
      await Promise.all([
        apiRequest("/settings/currency", {
          method: "PATCH",
          token,
          body: {
            baseCurrency: currencySettings.baseCurrency.toUpperCase(),
            supportedCurrencies,
            multiCurrencyEnabled: currencySettings.multiCurrencyEnabled,
          },
        }),
        apiRequest("/settings/notifications", {
          method: "PATCH",
          token,
          body: {
            overdueInvoiceDays,
            lowStockEnabled: notificationSettings.lowStockEnabled,
            deliveryUpdatesEnabled: notificationSettings.deliveryUpdatesEnabled,
            emailEnabled: notificationSettings.emailEnabled,
          },
        }),
        apiRequest("/settings/invoice-template", {
          method: "PATCH",
          token,
          body: invoiceTemplate,
        }),
      ]);

      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      push("Operational settings saved", "Currency, notifications, and invoice template settings were updated.");
    } catch (requestError) {
      push("Save failed", getErrorMessage(requestError, "Unable to save operational settings."));
    } finally {
      setOperationsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Company & System Settings"
        description="Configure company identity, taxes, currencies, warehouses, invoice template styling, notification policies, and user administration."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Company Profile</CardTitle>
              <CardDescription>Identity block for invoices, reports, and customer-facing documents.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Input
              value={companyProfile.name}
              onChange={(event) => setCompanyProfile((current) => ({ ...current, name: event.target.value }))}
              placeholder="Company name"
            />
            <Input
              value={companyProfile.address}
              onChange={(event) => setCompanyProfile((current) => ({ ...current, address: event.target.value }))}
              placeholder="Company address"
            />
            <Input
              value={companyProfile.taxNumber}
              onChange={(event) => setCompanyProfile((current) => ({ ...current, taxNumber: event.target.value }))}
              placeholder="Tax registration number"
            />
            <Textarea
              value={companyProfile.bankDetails}
              onChange={(event) =>
                setCompanyProfile((current) => ({
                  ...current,
                  bankDetails: event.target.value,
                }))
              }
              placeholder="Bank details"
            />
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                value={companyProfile.email}
                onChange={(event) => setCompanyProfile((current) => ({ ...current, email: event.target.value }))}
                placeholder="Company email"
                type="email"
              />
              <Input
                value={companyProfile.phone}
                onChange={(event) => setCompanyProfile((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Company phone"
              />
              <Input
                value={companyProfile.website}
                onChange={(event) => setCompanyProfile((current) => ({ ...current, website: event.target.value }))}
                placeholder="Company website (https://...)"
              />
            </div>
            <Button onClick={handleSaveCompanyProfile} disabled={profileSaving}>
              {profileSaving ? "Saving..." : "Save Company Profile"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Operational Settings</CardTitle>
              <CardDescription>Tax, warehouse, invoice theme, and notifications.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3 rounded-2xl border border-border bg-white p-4">
              <p className="font-semibold">Currency</p>
              <Input
                value={currencySettings.baseCurrency}
                onChange={(event) =>
                  setCurrencySettings((current) => ({
                    ...current,
                    baseCurrency: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="Base currency"
                maxLength={3}
              />
              <Input
                value={currencySettings.supportedCurrencies}
                onChange={(event) =>
                  setCurrencySettings((current) => ({
                    ...current,
                    supportedCurrencies: event.target.value,
                  }))
                }
                placeholder="Supported currencies, comma separated"
              />
              <label className="flex items-center gap-3 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={currencySettings.multiCurrencyEnabled}
                  onChange={(event) =>
                    setCurrencySettings((current) => ({
                      ...current,
                      multiCurrencyEnabled: event.target.checked,
                    }))
                  }
                />
                Enable multi-currency
              </label>
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-white p-4">
              <p className="font-semibold">Notifications</p>
              <Input
                value={notificationSettings.overdueInvoiceDays}
                onChange={(event) =>
                  setNotificationSettings((current) => ({
                    ...current,
                    overdueInvoiceDays: event.target.value,
                  }))
                }
                placeholder="Overdue reminder days, comma separated"
              />
              <label className="flex items-center gap-3 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={notificationSettings.lowStockEnabled}
                  onChange={(event) =>
                    setNotificationSettings((current) => ({
                      ...current,
                      lowStockEnabled: event.target.checked,
                    }))
                  }
                />
                Low stock alerts enabled
              </label>
              <label className="flex items-center gap-3 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={notificationSettings.deliveryUpdatesEnabled}
                  onChange={(event) =>
                    setNotificationSettings((current) => ({
                      ...current,
                      deliveryUpdatesEnabled: event.target.checked,
                    }))
                  }
                />
                Delivery updates enabled
              </label>
              <label className="flex items-center gap-3 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={notificationSettings.emailEnabled}
                  onChange={(event) =>
                    setNotificationSettings((current) => ({
                      ...current,
                      emailEnabled: event.target.checked,
                    }))
                  }
                />
                Email notifications enabled
              </label>
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-white p-4">
              <p className="font-semibold">Invoice Template</p>
              <Input
                value={invoiceTemplate.primaryColor}
                onChange={(event) =>
                  setInvoiceTemplate((current) => ({
                    ...current,
                    primaryColor: event.target.value,
                  }))
                }
                placeholder="Primary color"
              />
              <Input
                value={invoiceTemplate.paymentTerms}
                onChange={(event) =>
                  setInvoiceTemplate((current) => ({
                    ...current,
                    paymentTerms: event.target.value,
                  }))
                }
                placeholder="Payment terms"
              />
              <Textarea
                value={invoiceTemplate.footerText}
                onChange={(event) =>
                  setInvoiceTemplate((current) => ({
                    ...current,
                    footerText: event.target.value,
                  }))
                }
                placeholder="Footer text"
              />
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Warehouses</p>
                <Button 
                  variant="outline" 
                  className="h-8 px-3 text-xs" 
                  onClick={(e) => {
                    e.preventDefault();
                    setCreateWarehouseOpen(c => !c);
                  }}
                >
                  {createWarehouseOpen ? "Close" : "Add Warehouse"}
                </Button>
              </div>

              {createWarehouseOpen && <CreateWarehouseForm onClose={() => setCreateWarehouseOpen(false)} />}

              {data.warehouses.length > 0 ? (
                <div className="grid gap-2">
                  {data.warehouses.map((warehouse) => (
                    <div key={warehouse.id} className="rounded-2xl bg-secondary/60 p-3">
                      <p className="font-medium text-sm">{warehouse.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">
                        {warehouse.location} · {warehouse.type} · {warehouse.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No warehouses configured yet.</p>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Tax Rates</p>
                <Button 
                  variant="outline" 
                  className="h-8 px-3 text-xs" 
                  onClick={(e) => {
                    e.preventDefault();
                    setCreateTaxRateOpen(c => !c);
                  }}
                >
                  {createTaxRateOpen ? "Close" : "Add Tax Rate"}
                </Button>
              </div>

              {createTaxRateOpen && <CreateTaxRateForm onClose={() => setCreateTaxRateOpen(false)} />}

              {data.taxRates.length > 0 ? (
                <div className="grid gap-2">
                  {data.taxRates.map((tax) => (
                    <div key={tax.id} className="flex items-center justify-between rounded-2xl bg-secondary/60 p-3">
                      <div>
                        <p className="font-medium">{tax.name}</p>
                        <p className="text-sm text-muted-foreground">{tax.category} · {tax.rate}%</p>
                      </div>
                      {tax.isDefault && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">DEFAULT</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tax rates configured.</p>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">User Management</p>
                <Button 
                  variant="outline" 
                  className="h-8 px-3 text-xs" 
                  onClick={(e) => {
                    e.preventDefault();
                    setInviteUserOpen(c => !c);
                  }}
                >
                  {inviteUserOpen ? "Close" : "Invite User"}
                </Button>
              </div>

              {inviteUserOpen && <UserInviteForm onClose={() => setInviteUserOpen(false)} />}

              {data.users.length > 0 ? (
                <div className="grid gap-2">
                  {data.users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between rounded-2xl bg-secondary/60 p-3">
                      <div>
                        <p className="font-medium text-sm">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{u.email} · {u.role}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {u.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No other users found.</p>
              )}
            </div>

            <Button onClick={handleSaveOperationalSettings} disabled={operationsSaving} className="w-full h-12 text-base shadow-lg shadow-primary/20">
              {operationsSaving ? "Saving Settings..." : "Save All System Settings"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
