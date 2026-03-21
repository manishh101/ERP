import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-[2rem] border border-border bg-white/90 p-10 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">404</p>
      <h1 className="mt-4 font-display text-5xl">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        The page you requested is not part of the current ERP scaffold.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
