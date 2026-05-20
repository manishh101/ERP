import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/api";
import { ArrowRight, Globe, Info } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  
  const { login, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="relative flex min-h-screen flex-col bg-white selection:bg-stone-900 selection:text-white">
      {/* Dynamic Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-[10%] -top-[10%] h-[50%] w-[50%] rounded-full bg-stone-100 blur-[100px]" />
        <div className="absolute -right-[10%] bottom-[10%] h-[40%] w-[40%] rounded-full bg-stone-50 blur-[80px]" />
      </div>

      <main className="relative z-10 flex flex-1 items-center justify-center p-6">
        <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-[2.5rem] bg-stone-950 shadow-2xl lg:flex-row">
          {/* Brand Panel */}
          <section className="relative hidden w-1/2 flex-col justify-between border-r border-white/5 p-12 lg:flex">
            <div className="space-y-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl">
                <Globe className="text-white" size={24} />
              </div>
              <div className="space-y-4">
                <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-white">
                  Industrial <br /> 
                  <span className="text-stone-500">Intelligence.</span>
                </h1>
                <p className="max-w-xs text-sm leading-relaxed text-stone-400">
                  Secure, precision management for modern steel operations. Streamlined for clarity and high-performance.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-600">
              <span className="h-px w-8 bg-stone-800" />
              <span>Manish Steel Management</span>
            </div>
          </section>

          {/* Login Panel */}
          <section className="flex flex-1 flex-col justify-center bg-white p-8 lg:p-16">
            <div className="mx-auto w-full max-w-sm space-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-stone-900">Welcome Back</h2>
                <p className="text-sm text-stone-500">Please enter your credentials to continue</p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500" htmlFor="email">
                    Email Address
                  </label>
                  <Input 
                    id="email" 
                    type="email"
                    required
                    className="h-12 border-stone-200 bg-stone-50/50 px-4 transition-all focus:border-stone-900 focus:ring-0" 
                    placeholder="name@manishsteel.com.np"
                    value={email} 
                    onChange={(event) => setEmail(event.target.value)} 
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500" htmlFor="password">
                      Password
                    </label>
                    <button type="button" className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-600 transition-colors">
                      Forgot?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="h-12 border-stone-200 bg-stone-50/50 px-4 transition-all focus:border-stone-900 focus:ring-0"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                {error ? (
                  <div className="animate-in fade-in slide-in-from-top-1 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/50 p-4 text-xs font-medium text-red-600">
                    <Info size={14} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                <Button 
                  className="h-12 w-full rounded-xl bg-stone-950 text-stone-50 transition-all duration-300 hover:bg-stone-800 active:scale-[0.98] disabled:opacity-50" 
                  type="submit" 
                  disabled={submitting || status === "loading"}
                >
                  {submitting || status === "loading" ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Sign In</span>
                      <ArrowRight size={16} />
                    </div>
                  )}
                </Button>
              </form>

              {/* Dev/Production Awareness Note */}
              <div className="inline-flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-[10px] font-medium text-stone-400">
                <Info size={12} />
                <span>Authorized access only. Logins are monitored.</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Production Footer */}
      <footer className="relative z-10 flex flex-col items-center justify-between gap-4 border-t border-stone-100 bg-white/50 px-8 py-6 backdrop-blur-md sm:flex-row">
        <p className="text-[10px] font-medium text-stone-400 uppercase tracking-[0.2em]">
          © 2024 Manish Steel Management System. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-300">v1.2.4-stable</span>
          <div className="flex gap-4">
            {["Privacy", "Terms", "Support"].map((item) => (
              <button key={item} className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors">
                {item}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
