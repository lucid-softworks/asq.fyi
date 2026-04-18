import { desc, sql } from "drizzle-orm";
import { analyticsTagStats, questions } from "../schema";
import { db } from "../client";

export type TagSort = "popular" | "trending";

export interface TagCount {
  tag: string;
  questionCount: number;
  views7d: number;
}

export async function listTags(args: {
  sort: TagSort;
  limit: number;
}): Promise<TagCount[]> {
  if (args.sort === "trending") {
    const rows = await db
      .select({
        tag: analyticsTagStats.tag,
        questionCount: analyticsTagStats.questionCount,
        views7d: analyticsTagStats.views7d,
      })
      .from(analyticsTagStats)
      .orderBy(desc(analyticsTagStats.views7d))
      .limit(args.limit);
    return rows.map((r) => ({
      tag: r.tag,
      questionCount: r.questionCount,
      views7d: r.views7d,
    }));
  }

  // popular: count questions in last 30 days by tag
  const tagExpr = sql<string>`unnest(${questions.tags})`;
  const cutoff = sql<Date>`now() - interval '30 days'`;
  const rows = await db.execute<{ tag: string; question_count: number }>(sql`
    select unnest(${questions.tags}) as tag, count(*)::int as question_count
    from ${questions}
    where ${questions.createdAt} > ${cutoff}
    group by tag
    order by question_count desc, tag asc
    limit ${args.limit}
  `);

  return rows.map((r) => ({
    tag: r.tag,
    questionCount: r.question_count,
    views7d: 0,
  }));
}
