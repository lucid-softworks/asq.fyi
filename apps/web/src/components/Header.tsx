import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useLogout, useSession } from "../lib/session";

export function Header() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
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
          <NavLink to="/" end>
            Feed
          </NavLink>
          <NavLink to="/search">Search</NavLink>
          <NavLink to="/ask">Ask</NavLink>
          <NavLink to="/privacy">Privacy</NavLink>
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
              if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`);
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
              style={{ padding: "6px 10px", fontSize: "var(--t-xs)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}
            />
          </form>

          {session.isLoading ? null : session.data ? (
            <>
              <Link
                to={
                  session.data.handle
                    ? `/u/${encodeURIComponent(session.data.handle)}`
                    : "/"
                }
                className="btn btn--xs btn--ghost"
              >
                {handleLabel}
              </Link>
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
            <NavLink to="/" end>
              Feed
            </NavLink>
            <NavLink to="/ask">Ask a question</NavLink>
            <NavLink to="/search">Search</NavLink>
            {session.data?.handle ? (
              <NavLink to={`/u/${encodeURIComponent(session.data.handle)}`}>
                Your profile
              </NavLink>
            ) : null}
            <NavLink to="/privacy">Privacy</NavLink>
            {session.data ? (
              <button type="button" onClick={() => logout.mutate()}>
                Log out
              </button>
            ) : (
              <NavLink to="/login">Sign in</NavLink>
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
