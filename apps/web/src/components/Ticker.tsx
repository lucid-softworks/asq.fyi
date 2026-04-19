import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

const BRAND_ITEMS = [
  "★ QUESTIONS ANSWERED BY HUMANS",
  "● BUILT ON THE AT PROTOCOL",
  "★ NO ADS · NO ALGORITHM · NO LOCK-IN",
  "● YOUR DATA LIVES ON YOUR PDS",
  "● OPEN BETA · ALL HANDLES WELCOME",
  "● SIGN IN WITH @YOURHANDLE.BSKY.SOCIAL",
];

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

export function Ticker() {
  const live = useQuery({
    queryKey: ["ticker"],
    queryFn: async () => {
      const [tags, questions] = await Promise.all([
        api.listTags({ sort: "trending", limit: 3 }),
        api.listQuestions({ sort: "top", limit: 3 }),
      ]);
      return { tags: tags.items, questions: questions.items };
    },
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const items = useMemo(() => {
    if (!live.data) return BRAND_ITEMS;

    const tagItems = live.data.tags.map(
      (t) => `TRENDING · #${t.tag.toUpperCase()}`,
    );
    const qItems = live.data.questions.map((q) => {
      const title = truncate(q.title, 60).toUpperCase();
      const n = q.answerCount;
      return `? ${title} · ${n} ${n === 1 ? "ANSWER" : "ANSWERS"}`;
    });

    // Interleave brand copy with real items so the ticker doesn't read as
    // all-marketing or all-data.
    const out: string[] = [];
    const maxLen = Math.max(BRAND_ITEMS.length, qItems.length + tagItems.length);
    const live_ = [...qItems, ...tagItems];
    for (let i = 0; i < maxLen; i++) {
      if (BRAND_ITEMS[i]) out.push(BRAND_ITEMS[i]!);
      if (live_[i]) out.push(live_[i]!);
    }
    return out;
  }, [live.data]);

  const doubled = [...items, ...items];
  return (
    <div className="ticker" aria-hidden>
      <div className="ticker__track">
        {doubled.map((item, i) => (
          <span key={i}>{item}</span>
        ))}
      </div>
    </div>
  );
}
