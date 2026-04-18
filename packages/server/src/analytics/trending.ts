import { sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  analyticsQuestionStats,
  profiles,
  questions,
} from "../db/schema";
import type { QuestionCard } from "../db/queries/questions";

/**
 * Weights for the trending score. Kept as exported constants so they can be
 * read (and later tuned) in one place.
 */
export const TRENDING_WEIGHTS = {
  views7d: 1,
  answerCount: 5,
  commentCount: 2,
  questionScore: 3,
  gravityPerHour: 0.5,
};

export type TrendingWindow = "24h" | "7d";

export function trendingScore(args: {
  views7d: number;
  answerCount: number;
  commentCount: number;
  score: number;
  createdAt: Date;
  now?: Date;
}): number {
  const now = args.now ?? new Date();
  const hoursSince = Math.max(
    0,
    (now.getTime() - args.createdAt.getTime()) / (1000 * 60 * 60),
  );
  return (
    args.views7d * TRENDING_WEIGHTS.views7d +
    args.answerCount * TRENDING_WEIGHTS.answerCount +
    args.commentCount * TRENDING_WEIGHTS.commentCount +
    args.score * TRENDING_WEIGHTS.questionScore -
    hoursSince * TRENDING_WEIGHTS.gravityPerHour
  );
}

interface TrendingArgs {
  window: TrendingWindow;
  limit: number;
}

export async function listTrending(
  args: TrendingArgs,
): Promise<QuestionCard[]> {
  const interval = args.window === "24h" ? sql`interval '24 hours'` : sql`interval '7 days'`;
  const rows = await db.execute<{
    uri: string;
    cid: string;
    author_did: string;
    title: string;
    body: string;
    tags: string[];
    score: number;
    answer_count: number;
    comment_count: number;
    created_at: Date;
    accepted_answer_uri: string | null;
    handle: string | null;
    display_name: string | null;
    avatar_url: string | null;
    views_7d: number | null;
    views_24h: number | null;
    views_total: number | null;
    trending_score: number;
  }>(sql`
    select
      q.uri,
      q.cid,
      q.author_did,
      q.title,
      q.body,
      q.tags,
      q.score,
      q.answer_count,
      q.comment_count,
      q.created_at,
      q.accepted_answer_uri,
      p.handle,
      p.display_name,
      p.avatar_url,
      s.views_7d,
      s.views_24h,
      s.views_total,
      (
        coalesce(s.views_7d, 0) * ${TRENDING_WEIGHTS.views7d}::float
        + q.answer_count * ${TRENDING_WEIGHTS.answerCount}::float
        + q.comment_count * ${TRENDING_WEIGHTS.commentCount}::float
        + q.score * ${TRENDING_WEIGHTS.questionScore}::float
        - (extract(epoch from (now() - q.created_at)) / 3600.0) * ${TRENDING_WEIGHTS.gravityPerHour}::float
      ) as trending_score
    from ${questions} q
    left join ${profiles} p on p.did = q.author_did
    left join ${analyticsQuestionStats} s on s.question_uri = q.uri
    where q.created_at >= now() - ${interval}
    order by trending_score desc, q.uri desc
    limit ${args.limit}
  `);

  return rows.map((r) => ({
    uri: r.uri,
    cid: r.cid,
    author: {
      did: r.author_did,
      handle: r.handle,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
    },
    title: r.title,
    body: r.body,
    tags: r.tags,
    score: r.score,
    answerCount: r.answer_count,
    commentCount: r.comment_count,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : new Date(r.created_at as unknown as string).toISOString(),
    acceptedAnswerUri: r.accepted_answer_uri,
    views7d: r.views_7d ?? 0,
    views24h: r.views_24h ?? 0,
    viewsTotal: r.views_total ?? 0,
    viewerVote: null,
  }));
}
