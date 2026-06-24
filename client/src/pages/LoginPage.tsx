import { FormEvent, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/api";
import { ArrowRight, Globe, Info } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  
  const { login, register, loginWithGoogle, status } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
  const [googleButtonReady, setGoogleButtonReady] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const showDevGoogleFallback = import.meta.env.DEV && !googleButtonReady;

  const modeRef = useRef(mode);
  const companyNameRef = useRef(companyName);

  useEffect(() => {
    modeRef.current = mode;
    companyNameRef.current = companyName;
  }, [mode, companyName]);

  // Load Google Identity Services GSI script
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (document.getElementById("google-gsi-script")) {
      setGoogleScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Initialize official Google button if script is loaded and client ID exists
  useEffect(() => {
    setGoogleButtonReady(false);
    let observer: MutationObserver | undefined;
    if (!googleClientId || !googleScriptLoaded) return;

    try {
      const g = window.google;
      if (!g?.accounts?.id) return;

      g.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          setSubmitting(true);
          setError(null);
          try {
              const currentMode = modeRef.current;
              const currentCompany = companyNameRef.current;
              const credential = response.credential;

              if (!credential) {
                throw new Error("Google did not return a credential.");
              }

              if (currentMode === "register" && !currentCompany.trim()) {
                setError("Company name is required to create a workspace with Google.");
                return;
              }

              const user = await loginWithGoogle(
                credential,
                currentMode,
                currentMode === "register" ? currentCompany : undefined,
              );
              if (currentMode === "register") {
                toast.success("Workspace created", { description: `Welcome to your new workspace, ${user.name}.` });
              } else {
                toast.success("Signed in", { description: `Welcome back, ${user.name}.` });
              }
            navigate("/", { replace: true });
          } catch (err) {
            setError(getErrorMessage(err, "Google sign-in failed. Please try again."));
          } finally {
            setSubmitting(false);
          }
        },
      });

      const container = document.getElementById("google-signin-btn-container");
      if (container) {
        // Clear container before rendering to prevent duplicates on strict mode
        container.innerHTML = "";

        const updateGoogleButtonReady = () => setGoogleButtonReady(container.childElementCount > 0);
        observer = new MutationObserver(updateGoogleButtonReady);
        observer.observe(container, { childList: true });

        g.accounts.id.renderButton(container, {
          theme: "outline",
          size: "large",
          width: container.clientWidth || 320,
          text: modeRef.current === "register" ? "signup_with" : "signin_with",
          locale: "en",
        });
        updateGoogleButtonReady();
      }
    } catch (err) {
      console.error("Failed to initialize Google Sign-In:", err);
    }

    return () => observer?.disconnect();
  }, [googleClientId, googleScriptLoaded, loginWithGoogle, mode, navigate]);

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  async function handleDevGoogleAuth() {
    setSubmitting(true);
    setError(null);
    try {
      const mockEmail = mode === "register" && email ? email : "google-alice@acme.com";
      const mockName = mode === "register" && name ? name : "Google Alice";
      const mockCompany = mode === "register" ? companyName : "Google Acme Corp";
      if (mode === "register" && !mockCompany.trim()) {
        setError("Company name is required to create a workspace.");
        return;
      }

      const token = `mock-google-token:${mockEmail}:${mockName}:${mockCompany}`;
      
      const user = await loginWithGoogle(token, mode, mode === "register" ? mockCompany : undefined);

      if (mode === "register") {
        toast.success("Workspace created", { description: `Welcome to your new workspace, ${user.name}.` });
      } else {
        toast.success("Signed in", { description: `Welcome back, ${user.name}.` });
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Google authentication failed."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (mode === "login") {
        const user = await login(email, password);
        toast.success("Signed in", { description: `Welcome back, ${user.name}.` });
      } else {
        const user = await register(name, email, password, companyName);
        toast.success("Workspace created", { description: `Welcome to your new workspace, ${user.name}.` });
      }
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError, mode === "login" ? "Unable to sign in." : "Unable to create workspace."));
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
                  Secure, precision management for modern steel and furniture operations. Instant workspace creation for your team.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-600">
              <span className="h-px w-8 bg-stone-800" />
              <span>Manish Steel Management</span>
            </div>
          </section>

          {/* Form Panel */}
          <section className="flex flex-1 flex-col justify-center bg-white p-8 lg:p-16">
            <div className="mx-auto w-full max-w-sm space-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-stone-900">
                  {mode === "login" ? "Welcome Back" : "Register Workspace"}
                </h2>
                <p className="text-sm text-stone-500">
                  {mode === "login" 
                    ? "Sign in if your account is already registered" 
                    : "Create a new company ERP environment"}
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {mode === "register" && (
                  <>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-500" htmlFor="companyName">
                        Company Name
                      </label>
                      <Input 
                        id="companyName" 
                        type="text"
                        required
                        className="h-11 border-stone-200 bg-stone-50/50 px-4 transition-all focus:border-stone-900 focus:ring-0" 
                        placeholder="e.g. Manish Furniture Udhyog"
                        value={companyName} 
                        onChange={(event) => setCompanyName(event.target.value)} 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-500" htmlFor="name">
                        Administrator Name
                      </label>
                      <Input 
                        id="name" 
                        type="text"
                        required
                        className="h-11 border-stone-200 bg-stone-50/50 px-4 transition-all focus:border-stone-900 focus:ring-0" 
                        placeholder="e.g. Manish Adhikari"
                        value={name} 
                        onChange={(event) => setName(event.target.value)} 
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500" htmlFor="email">
                    Email Address
                  </label>
                  <Input 
                    id="email" 
                    type="email"
                    required
                    className="h-11 border-stone-200 bg-stone-50/50 px-4 transition-all focus:border-stone-900 focus:ring-0" 
                    placeholder="name@company.com"
                    value={email} 
                    onChange={(event) => setEmail(event.target.value)} 
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500" htmlFor="password">
                      Password
                    </label>
                    {mode === "login" && (
                      <button type="button" className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-600 transition-colors">
                        Forgot?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="h-11 border-stone-200 bg-stone-50/50 px-4 transition-all focus:border-stone-900 focus:ring-0"
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
                      <span>{mode === "login" ? "Authenticating..." : "Creating Workspace..."}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{mode === "login" ? "Sign In" : "Register Workspace"}</span>
                      <ArrowRight size={16} />
                    </div>
                  )}
                </Button>
              </form>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-stone-200" />
                <span className="flex-shrink mx-4 text-[10px] font-bold uppercase tracking-wider text-stone-400">or</span>
                <div className="flex-grow border-t border-stone-200" />
              </div>

              {/* Google auth button */}
              {googleClientId ? (
                <div id="google-signin-btn-container" className="flex w-full justify-center" />
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                  Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to enable the Google button.
                </div>
              )}

              {/* Local Google auth fallback for development */}
              {showDevGoogleFallback && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDevGoogleAuth}
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white text-stone-700 transition-all hover:bg-stone-50 hover:text-stone-950 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 font-semibold shadow-sm"
                  disabled={submitting || status === "loading"}
                >
                  <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{mode === "login" ? "Sign in with Google" : "Sign up with Google"}</span>
                </Button>
              )}

              {/* Toggle Mode Link */}
              <div className="text-center text-xs text-stone-500">
                {mode === "login" ? (
                  <>
                    Don't have an account?{" "}
                    <button 
                      onClick={() => { setMode("register"); setError(null); }}
                      className="font-bold text-stone-900 underline underline-offset-4 hover:text-stone-700"
                    >
                      Register
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button 
                      onClick={() => { setMode("login"); setError(null); }}
                      className="font-bold text-stone-900 underline underline-offset-4 hover:text-stone-700"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>

              {/* Dev/Production Awareness Note */}
              <div className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-[10px] font-medium text-stone-400">
                <Info size={12} />
                <span>Isolated workspaces are protected with end-to-end data encryption.</span>
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
