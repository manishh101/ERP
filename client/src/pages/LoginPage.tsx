import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/api";

export function LoginPage() {
  const navigate = useNavigate();
  
  const { login, status } = useAuth();
  const [email, setEmail] = useState("admin@manishsteel.com.np");
  const [password, setPassword] = useState("Password123!");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const user = await login(email, password);
      toast.success("Signed in", { description: `Welcome back, ${user.name}.` });
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to sign in."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(120,113,108,0.18),_transparent_35%),linear-gradient(180deg,_#f7f2eb_0%,_#efe5d7_100%)] px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="flex flex-col justify-center rounded-[2rem] bg-stone-950 px-8 py-10 text-stone-50 shadow-panel lg:px-12">
          <p className="text-xs uppercase tracking-[0.32em] text-stone-400">Manish Steel Management</p>
          <h1 className="mt-5 font-display text-5xl leading-tight">Run stock, sales, finance, and delivery from one place.</h1>
          <p className="mt-5 max-w-xl text-base text-stone-300">
            The client is now wired for authenticated API access, so this login is the entry point to the real backend instead of demo-only fallbacks.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Dashboard", "Live KPIs, low stock alerts, and recent order activity"],
              ["Operations", "Inventory, purchasing, invoicing, and delivery workflows"],
              ["Admin", "User roles and company settings synced from the API"],
            ].map(([title, detail]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold">{title}</p>
                <p className="mt-2 text-sm text-stone-300">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center">
          <Card className="w-full max-w-xl border-white/70 bg-white/90 shadow-panel">
            <CardHeader>
              <div>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>Use one of the seeded accounts to access the ERP modules.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="email">
                    Email
                  </label>
                  <Input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="password">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <Button className="w-full" type="submit" disabled={submitting || status === "loading"}>
                  {submitting || status === "loading" ? "Signing In..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-6 rounded-2xl bg-secondary/70 p-4 text-sm text-muted-foreground">
                Default seeded password: <span className="font-semibold text-foreground">Password123!</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
