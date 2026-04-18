import { aliasedTable, and, eq, lt, or, sql } from "drizzle-orm";
import {
  analyticsQuestionStats,
  profiles,
  questions,
  votes,
} from "../schema";
import { db } from "../client";
import {
  decodeCursor,
  encodeCursor,
  type QuestionCard,
} from "./questions";

interface SearchArgs {
  q: string;
  cursor?: string;
  limit: number;
  viewerDid?: string;
}

interface SearchResult {
  items: Array<QuestionCard & { rank: number }>;
  cursor: string | null;
}

export async function searchQuestions(args: SearchArgs): Promise<SearchResult> {
  const trimmed = args.q.trim();
  if (!trimmed) return { items: [], cursor: null };
  const viewerVotes = aliasedTable(votes, "viewer_search_votes");

  const cursor = decodeCursor(args.cursor);
  const query = sql<number>`plainto_tsquery('english', ${trimmed})`;
  const rank = sql<number>`ts_rank(${questions.search}, ${query})`;

  const conditions = [sql`${questions.search} @@ ${query}`];
  if (cursor) {
    const r = Number(cursor.k);
    conditions.push(
      or(
        lt(rank, r),
        and(eq(rank, r), lt(questions.uri, cursor.u)),
      )!,
    );
  }

  const rows = await db
    .select({
      uri: questions.uri,
      cid: questions.cid,
      authorDid: questions.authorDid,
      title: questions.title,
      body: questions.body,
      tags: questions.tags,
      score: questions.score,
      answerCount: questions.answerCount,
      commentCount: questions.commentCount,
      createdAt: questions.createdAt,
      acceptedAnswerUri: questions.acceptedAnswerUri,
      profileHandle: profiles.handle,
      profileDisplayName: profiles.displayName,
      profileAvatarUrl: profiles.avatarUrl,
      views7d: analyticsQuestionStats.views7d,
      views24h: analyticsQuestionStats.views24h,
      viewsTotal: analyticsQuestionStats.viewsTotal,
      viewerVoteDirection: viewerVotes.direction,
      rank: rank.as("rank"),
    })
    .from(questions)
    .leftJoin(profiles, eq(profiles.did, questions.authorDid))
    .leftJoin(
      analyticsQuestionStats,
      eq(analyticsQuestionStats.questionUri, questions.uri),
    )
    .leftJoin(
      viewerVotes,
      args.viewerDid
        ? and(
            eq(viewerVotes.subjectUri, questions.uri),
            eq(viewerVotes.authorDid, args.viewerDid),
          )
        : sql`false`,
    )
    .where(and(...conditions))
    .orderBy(sql`rank desc`, sql`${questions.uri} desc`)
    .limit(args.limit + 1);

  const hasMore = rows.length > args.limit;
  const page = hasMore ? rows.slice(0, args.limit) : rows;

  const items = page.map((r) => ({
    uri: r.uri,
    cid: r.cid,
    author: {
      did: r.authorDid,
      handle: r.profileHandle,
      displayName: r.profileDisplayName,
      avatarUrl: r.profileAvatarUrl,
    },
    title: r.title,
    body: r.body,
    tags: r.tags,
    score: r.score,
    answerCount: r.answerCount,
    commentCount: r.commentCount,
    createdAt: r.createdAt.toISOString(),
    acceptedAnswerUri: r.acceptedAnswerUri,
    views7d: r.views7d ?? 0,
    views24h: r.views24h ?? 0,
    viewsTotal: r.viewsTotal ?? 0,
    viewerVote: (r.viewerVoteDirection === "up" || r.viewerVoteDirection === "down"
      ? r.viewerVoteDirection
      : null) as "up" | "down" | null,
    rank: Number(r.rank) || 0,
  }));

  let nextCursor: string | null = null;
  if (hasMore) {
    const last = page[page.length - 1]!;
    nextCursor = encodeCursor({ k: String(last.rank), u: last.uri });
  }

  return { items, cursor: nextCursor };
}
