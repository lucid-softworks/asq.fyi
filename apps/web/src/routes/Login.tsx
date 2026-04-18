import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { api } from "../lib/api";

const loginSearchSchema = z.object({
  error: z.string().optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: loginSearchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — asq.fyi" },
      {
        name: "description",
        content: "Sign in to asq.fyi with your ATProto handle.",
      },
    ],
  }),
  component: LoginRoute,
});

function LoginRoute() {
  const { error } = Route.useSearch();
  const [handle, setHandle] = useState("");

  return (
    <div className="wrap-980" style={{ padding: "var(--s-8) var(--s-5)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "var(--s-5)",
          maxWidth: 620,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--t-xs)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "var(--ink-3)",
          }}
        >
          § SIGN IN · ATPROTO OAUTH
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(48px, 7vw, 96px)",
            margin: 0,
            lineHeight: 0.9,
            fontWeight: 400,
          }}
        >
          who are <span style={{ color: "var(--red)" }}>you</span>?
        </h1>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "var(--t-lg)",
            color: "var(--ink-2)",
            margin: 0,
            maxWidth: "52ch",
          }}
        >
          Enter your Bluesky-style handle. We'll send you to your PDS to
          authenticate — no passwords leave your hands.
        </p>

        {error ? <div className="alert">{error}</div> : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const h = handle.trim();
            if (!h) return;
            window.location.href = api.loginUrl(h);
          }}
        >
          <label htmlFor="handle" className="label">
            HANDLE
          </label>
          <div className="field-row" style={{ alignItems: "stretch" }}>
            <input
              id="handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="alice.bsky.social"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="input"
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              type="submit"
              disabled={!handle.trim()}
              className="btn btn--primary btn--sm"
            >
              CONTINUE →
            </button>
          </div>
        </form>

        <p
          className="mono"
          style={{
            color: "var(--ink-3)",
            fontSize: "var(--t-xs)",
            borderTop: "var(--bd-dotted)",
            paddingTop: "var(--s-3)",
          }}
        >
          NEW TO ATPROTO?{" "}
          <a
            href="https://bsky.social"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--red)" }}
          >
            MAKE AN ACCOUNT ON BSKY.SOCIAL
          </a>{" "}
          — same credentials work here. OR GO{" "}
          <Link to="/" style={{ color: "var(--red)" }}>
            BACK HOME
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
