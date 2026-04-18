import { Link, createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — asq.fyi" },
      {
        name: "description",
        content:
          "How asq.fyi handles analytics: anonymous, first-party, no third parties.",
      },
    ],
  }),
  component: PrivacyRoute,
});

function PrivacyRoute() {
  return (
    <>
      <div className="crumbs">
        <div className="wrap-1240 crumbs__row">
          <Link to="/">FEED</Link>
          <span className="sep">/</span>
          <span>PRIVACY</span>
          <span className="id">PLAIN ENGLISH · SHORT</span>
        </div>
      </div>

      <article
        className="wrap-980"
        style={{ padding: "var(--s-6) var(--s-5) var(--s-8)" }}
      >
        <header style={{ marginBottom: "var(--s-6)" }}>
          <div className="section__num">§ HOUSE RULES ON DATA</div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(48px, 7vw, 96px)",
              margin: "4px 0 var(--s-3)",
              lineHeight: 0.9,
              fontWeight: 400,
            }}
          >
            privacy.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "var(--t-lg)",
              color: "var(--ink-2)",
              margin: 0,
              maxWidth: "56ch",
            }}
          >
            The whole picture: first-party analytics only, no third parties,
            no tracking cookies, your content lives on your PDS.
          </p>
        </header>

        <PrivacySection num="1." title="What we count">
          <p>
            Anonymous <em>view</em> and <em>share</em> events on question
            pages. That's it. We don't track clicks, scroll depth, hover,
            session duration, or anything that could build a profile of you.
          </p>
        </PrivacySection>

        <PrivacySection num="2." title="No third parties">
          <p>
            No Google Analytics, Plausible, PostHog, Sentry, or any other
            third-party tracker. The only analytics code is the first-party
            endpoint described on this page.
          </p>
        </PrivacySection>

        <PrivacySection num="3." title="How the view counter works">
          <p>
            When a page loads, the browser posts the URL and event type to
            our API. The server reads your IP and User-Agent, hashes them
            with today's random salt and the page URL, keeps the first 32
            characters of that hash as a <em>visitor hash</em>, and discards
            the IP and User-Agent immediately.
          </p>
          <p>
            The hash is keyed per-question on purpose: the same visitor on
            two different pages produces two different hashes, so it can
            never act as a site-wide ID.
          </p>
          <p>
            The salt rotates every UTC day. A hash can only dedupe views
            within the same day.
          </p>
        </PrivacySection>

        <PrivacySection num="4." title="Cookies">
          <p>
            We don't set any cookies for analytics. The only cookie is the
            signed, HTTP-only session cookie set when you sign in — only if
            you sign in.
          </p>
        </PrivacySection>

        <PrivacySection num="5." title="What we keep">
          <p>
            Each event: event type, subject URL, visitor hash, referring
            site host (e.g. <code>bsky.app</code>). Nothing else. Events
            auto-delete after 90 days.
          </p>
        </PrivacySection>

        <PrivacySection num="6." title="Your content">
          <p>
            Every question, answer, comment, and vote is a record on your
            ATProto PDS. asq.fyi keeps an indexed copy for performance. If
            you delete a record on your PDS, the Jetstream firehose tells us
            and we drop it from our index.
          </p>
          <p>
            <Link to="/">← back to the feed</Link>
          </p>
        </PrivacySection>
      </article>
    </>
  );
}

function PrivacySection({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section style={{ borderTop: "var(--bd)", padding: "var(--s-5) 0" }}>
      <h2
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "var(--s-3)",
          fontFamily: "var(--font-serif)",
          fontWeight: 700,
          fontSize: "var(--t-lg)",
          margin: "0 0 var(--s-3)",
        }}
      >
        <span
          style={{
            color: "var(--red)",
            fontFamily: "var(--font-display)",
            fontSize: "var(--t-2xl)",
            lineHeight: 1,
          }}
        >
          {num}
        </span>
        <span>{title}</span>
      </h2>
      <div className="prose" style={{ maxWidth: "64ch" }}>
        {children}
      </div>
    </section>
  );
}
