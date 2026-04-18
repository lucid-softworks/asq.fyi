import { Link, useLocation } from "react-router-dom";
import { useMeta } from "../lib/meta";

export default function NotFound() {
  const location = useLocation();
  useMeta({ title: "404 — that page doesn't exist · asq.fyi" });
  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--s-7) var(--s-5)",
      }}
    >
      <div className="lost-card">
        <div className="lost-card__head">
          <span>
            FILE NO. <span className="err">404</span>
          </span>
          <span>REQ {location.pathname}</span>
        </div>
        <div className="lost-card__body">
          <div className="ascii">{`┌─────────────┐
│      ?      │
│      ?      │
│      ?      │
└─────────────┘
    LOST
    MAIL`}</div>
          <h1>404</h1>
          <p>
            That page doesn't exist — or it was deleted from its author's PDS.
          </p>
          <div className="row center wrap gap-3" style={{ justifyContent: "center" }}>
            <Link to="/" className="btn btn--primary">
              ★ BACK TO FEED
            </Link>
            <Link to="/ask" className="btn btn--ghost">
              ASK A QUESTION →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
