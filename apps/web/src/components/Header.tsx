import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useLogout, useSession } from "../lib/session";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialQ =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("q") ?? ""
      : "";
  const [q, setQ] = useState(initialQ);
  const [navOpen, setNavOpen] = useState(false);
  const session = useSession();
  const logout = useLogout();

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname, location.search]);

  const handleLabel = session.data?.handle
    ? `@${session.data.handle.toUpperCase()}`
    : session.data
      ? "ME"
      : "SIGN IN";

  return (
    <header className="site-header">
      <div className="site-header__bar">
        <Link to="/" className="logo">
          asq<span className="dot">?</span>
          <span className="ext">.fyi</span>
        </Link>
        <nav className="site-nav">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "active" }}>
            Feed
          </Link>
          <Link to="/search" activeProps={{ className: "active" }}>
            Search
          </Link>
          <Link to="/ask" activeProps={{ className: "active" }}>
            Ask
          </Link>
          <Link to="/privacy" activeProps={{ className: "active" }}>
            Privacy
          </Link>
        </nav>

        <div
          className="row gap-2"
          style={{ flexWrap: "nowrap", flexShrink: 0 }}
        >
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = q.trim();
              if (trimmed) {
                void navigate({ to: "/search", search: { q: trimmed } });
              }
            }}
            style={{ display: "none" }}
            className="header-search"
          >
            <label htmlFor="site-search" className="sr-only">
              Search questions
            </label>
            <input
              id="site-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="SEARCH…"
              className="input"
              style={{
                padding: "6px 10px",
                fontSize: "var(--t-xs)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
              }}
            />
          </form>

          {session.isLoading ? null : session.data ? (
            <>
              {session.data.handle ? (
                <Link
                  to="/u/$handle"
                  params={{ handle: session.data.handle }}
                  className="btn btn--xs btn--ghost"
                >
                  {handleLabel}
                </Link>
              ) : (
                <Link to="/" className="btn btn--xs btn--ghost">
                  {handleLabel}
                </Link>
              )}
              <button
                type="button"
                onClick={() => logout.mutate()}
                className="btn btn--xs btn--ghost"
              >
                LOG OUT
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn--xs btn--ghost">
              SIGN IN
            </Link>
          )}
          <Link
            to="/ask"
            className="btn btn--sm btn--primary"
            style={{ display: "none" }}
            data-ask="desktop"
          >
            ASK A Q
          </Link>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={navOpen}
            aria-controls="mobile-nav"
            onClick={() => setNavOpen((o) => !o)}
            className="btn btn--xs btn--ghost"
            data-menu-toggle
          >
            {navOpen ? "×" : "≡"}
          </button>
        </div>
      </div>
      {navOpen ? (
        <div id="mobile-nav" className="mobile-sheet">
          <nav aria-label="Mobile navigation">
            <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "active" }}>
              Feed
            </Link>
            <Link to="/ask" activeProps={{ className: "active" }}>
              Ask a question
            </Link>
            <Link to="/search" activeProps={{ className: "active" }}>
              Search
            </Link>
            {session.data?.handle ? (
              <Link
                to="/u/$handle"
                params={{ handle: session.data.handle }}
                activeProps={{ className: "active" }}
              >
                Your profile
              </Link>
            ) : null}
            <Link to="/privacy" activeProps={{ className: "active" }}>
              Privacy
            </Link>
            {session.data ? (
              <button type="button" onClick={() => logout.mutate()}>
                Log out
              </button>
            ) : (
              <Link to="/login" activeProps={{ className: "active" }}>
                Sign in
              </Link>
            )}
          </nav>
        </div>
      ) : null}
      <style>{`
        @media (min-width: 640px) {
          .header-search { display: block !important; width: 200px; }
          [data-ask="desktop"] { display: inline-flex !important; }
          [data-menu-toggle] { display: none !important; }
        }
        @media (min-width: 860px) {
          .header-search { width: 240px; }
        }
      `}</style>
    </header>
  );
}
