import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QuestionComposer } from "../components/QuestionComposer";
import { useSession } from "../lib/session";
import { questionHref } from "../lib/atUri";

export default function Ask() {
  const navigate = useNavigate();
  const session = useSession();

  useEffect(() => {
    if (session.isLoading) return;
    if (!session.data) {
      navigate(`/login?next=${encodeURIComponent("/ask")}`, { replace: true });
    }
  }, [session.isLoading, session.data, navigate]);

  if (session.isLoading || !session.data) return null;

  return (
    <>
      <div
        className="ask-head"
        style={{
          borderBottom: "var(--bd)",
          padding: "var(--s-7) 0 var(--s-6)",
          background: "var(--paper-2)",
        }}
      >
        <div className="wrap-1100">
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--t-xs)",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "var(--ink-3)",
              marginBottom: "var(--s-3)",
            }}
          >
            § NEW QUESTION · WRITE TO YOUR PDS
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(48px, 7vw, 96px)",
              fontWeight: 400,
              lineHeight: 0.9,
              margin: "0 0 var(--s-3)",
            }}
          >
            ask a <span style={{ color: "var(--red)" }}>question</span>?
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
            Your question lives on your ATProto PDS. It shows up here once the
            firehose catches up (~1–2 seconds).
          </p>
        </div>
      </div>

      <div
        className="wrap-1100"
        style={{ padding: "var(--s-7) var(--s-5)" }}
      >
        <QuestionComposer
          onPosted={(result) => navigate(questionHref(result.uri))}
        />
      </div>
    </>
  );
}
