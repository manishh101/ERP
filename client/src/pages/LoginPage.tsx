import { FormEvent, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle, status } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Keep a mutable ref of current values so the async GSI callback always reads the latest state
  const stateRef = useRef({ mode, companyName });
  useEffect(() => {
    stateRef.current = { mode, companyName };
  }, [mode, companyName]);

  /* ── Initialize Google Identity Services (GSI) Popup Flow ──────────────── */
  useEffect(() => {
    if (!googleClientId) return;

    const initGoogleSignIn = () => {
      try {
        const g = window.google;
        if (!g?.accounts?.id) return;

        // Initialize with popup mode
        g.accounts.id.initialize({
          client_id: googleClientId,
          ux_mode: "popup", // Opens the official Google Account Selector popup window
          callback: async (response: any) => {
            if (!response.credential) return;

            setSubmitting(true);
            setError(null);

            const currentMode = stateRef.current.mode;
            const currentCompany = stateRef.current.companyName;

            if (currentMode === "register" && !currentCompany.trim()) {
              setError("Company name is required to create a workspace with Google.");
              setSubmitting(false);
              return;
            }

            try {
              const user = await loginWithGoogle(
                response.credential,
                currentMode,
                currentMode === "register" ? currentCompany : undefined
              );

              toast.success(currentMode === "register" ? "Workspace created" : "Signed in", {
                description: currentMode === "register"
                  ? `Welcome to your new workspace, ${user.name}.`
                  : `Welcome back, ${user.name}.`,
              });
              navigate("/", { replace: true });
            } catch (err) {
              setError(getErrorMessage(err, "Google sign-in failed. Please try again."));
            } finally {
              setSubmitting(false);
            }
          },
        } as any);

        // Render the official Google Sign-In button
        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = "";
          g.accounts.id.renderButton(googleBtnRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            shape: "rectangular",
            logo_alignment: "left",
            width: 320, // Clean standard width matching inputs
            text: mode === "register" ? "signup_with" : "signin_with",
          } as any);
        }
      } catch (err) {
        console.error("Failed to initialize Google Sign-In:", err);
      }
    };

    // Load Google GSI client library dynamically
    if (!document.getElementById("google-gsi-script")) {
      const script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGoogleSignIn;
      document.head.appendChild(script);
    } else {
      initGoogleSignIn();
    }
  }, [googleClientId, mode]);

  if (status === "authenticated") return <Navigate to="/" replace />;

  /* ── Form submit ───────────────────────────────────────────────────────── */
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
        toast.success("Workspace created", {
          description: `Welcome to your new workspace, ${user.name}.`,
        });
      }
      navigate("/", { replace: true });
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          mode === "login" ? "Unable to sign in." : "Unable to create workspace.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <main className="login-page__main">
        <div className="login-card">
          <div className="login-card__logo-container">
            <span className="login-card__logo-text">MyERP</span>
          </div>

          <h1 className="login-card__title">
            {mode === "login" ? "Sign in to your account" : "Create a new workspace"}
          </h1>
          <p className="login-card__subtitle">
            {mode === "login"
              ? "Access your dashboard and manage operations"
              : "Launch an isolated database environment for your team"}
          </p>

          {/* Social login - Renders the official GSI iframe button */}
          <div className="login-card__social-container">
            {googleClientId ? (
              <div 
                ref={googleBtnRef} 
                className="login-card__google-btn-container"
              />
            ) : (
              <div className="login-card__google-notice">
                Google authentication is not configured.
              </div>
            )}
          </div>

          <div className="login-card__divider">
            <span className="login-card__divider-text">or use your email</span>
          </div>

          <form className="login-card__form" onSubmit={handleSubmit}>
            {mode === "register" && (
              <>
                <div className="login-card__field">
                  <label className="login-card__label" htmlFor="companyName">
                    Company name
                  </label>
                  <Input
                    id="companyName"
                    type="text"
                    required
                    className="login-card__input"
                    placeholder="Acme Corporation"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>

                <div className="login-card__field">
                  <label className="login-card__label" htmlFor="name">
                    Full name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    required
                    className="login-card__input"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="login-card__field">
              <label className="login-card__label" htmlFor="email">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                required
                className="login-card__input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="login-card__field">
              <div className="login-card__label-row">
                <label className="login-card__label" htmlFor="password">
                  Password
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => toast.info("Contact your administrator to reset your password.")}
                    className="login-card__forgot-link"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="login-card__input-wrap">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="login-card__input login-card__input--password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="login-card__eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div className="login-card__error-banner">{error}</div>}

            <Button
              className="login-card__submit-btn"
              type="submit"
              disabled={submitting}
            >
              {submitting ? (
                <span className="login-card__spinner-container">
                  <span className="login-card__spinner-ring" />
                  Please wait...
                </span>
              ) : (
                <span>{mode === "login" ? "Sign In" : "Get Started"}</span>
              )}
            </Button>
          </form>

          <p className="login-card__footer-toggle">
            {mode === "login" ? (
              <>
                Need a new workspace?{" "}
                <button
                  onClick={() => { setMode("register"); setError(null); }}
                  className="login-card__toggle-btn-link"
                >
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => { setMode("login"); setError(null); }}
                  className="login-card__toggle-btn-link"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
