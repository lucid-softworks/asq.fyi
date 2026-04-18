import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap-1240">
        <div className="foot__grid">
          <div className="foot__col foot__about">
            <Link to="/" className="logo">
              asq<span className="dot">?</span>
              <span className="ext">.fyi</span>
            </Link>
            <p>
              A public square for questions both silly and serious. Built on
              the AT Protocol.
            </p>
          </div>
          <div className="foot__col">
            <h6>The Site</h6>
            <ul>
              <li>
                <Link to="/">Live feed</Link>
              </li>
              <li>
                <Link to="/" search={{ sort: "top" }}>
                  Top
                </Link>
              </li>
              <li>
                <Link to="/" search={{ sort: "unanswered" }}>
                  Unanswered
                </Link>
              </li>
              <li>
                <Link to="/search">Search</Link>
              </li>
            </ul>
          </div>
          <div className="foot__col">
            <h6>The Protocol</h6>
            <ul>
              <li>
                <a
                  href="https://atproto.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Why atproto
                </a>
              </li>
              <li>
                <a
                  href="https://bsky.social"
                  target="_blank"
                  rel="noreferrer"
                >
                  Get a handle
                </a>
              </li>
              <li>
                <a
                  href="https://pdsls.dev"
                  target="_blank"
                  rel="noreferrer"
                >
                  Inspect a PDS
                </a>
              </li>
            </ul>
          </div>
          <div className="foot__col">
            <h6>Make</h6>
            <ul>
              <li>
                <Link to="/ask">Ask a question</Link>
              </li>
              <li>
                <Link to="/login">Sign in</Link>
              </li>
            </ul>
          </div>
          <div className="foot__col">
            <h6>The Humans</h6>
            <ul>
              <li>
                <Link to="/privacy">Privacy</Link>
              </li>
              <li>
                <a
                  href="https://github.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Source
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="foot__bottom">
          <span>© 2026 ASQ.FYI · NO RIGHTS RESERVED · DO WHAT YOU WANT</span>
          <span>
            BUILT ON <a href="https://atproto.com">@PROTO</a> · POWERED BY{" "}
            CURIOSITY
          </span>
        </div>
      </div>
    </footer>
  );
}
