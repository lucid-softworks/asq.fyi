import { sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  answers,
  comments,
  questions,
  votes,
} from "../db/schema";
import { parseAtUri } from "../atproto/uri";

/** Returns which of the known tables a subject URI points at, if any. */
export function subjectKind(uri: string): "question" | "answer" | null {
  const p = parseAtUri(uri);
  if (!p) return null;
  if (p.collection === "fyi.asq.question") return "question";
  if (p.collection === "fyi.asq.answer") return "answer";
  return null;
}

export async function recomputeScore(subjectUri: string): Promise<void> {
  const kind = subjectKind(subjectUri);
  if (!kind) return;
  const table = kind === "question" ? questions : answers;
  await db.execute(sql`
    update ${table}
    set score = coalesce((
      select sum(case direction when 'up' then 1 else -1 end)::int
      from ${votes}
      where ${votes.subjectUri} = ${subjectUri}
    ), 0)
    where ${table.uri} = ${subjectUri}
  `);
}

export async function recomputeCommentCount(subjectUri: string): Promise<void> {
  const kind = subjectKind(subjectUri);
  if (!kind) return;
  const table = kind === "question" ? questions : answers;
  await db.execute(sql`
    update ${table}
    set comment_count = (
      select count(*)::int
      from ${comments}
      where ${comments.subjectUri} = ${subjectUri}
    )
    where ${table.uri} = ${subjectUri}
  `);
}

export async function recomputeAnswerCount(questionUri: string): Promise<void> {
  await db.execute(sql`
    update ${questions}
    set answer_count = (
      select count(*)::int
      from ${answers}
      where ${answers.questionUri} = ${questionUri}
    )
    where ${questions.uri} = ${questionUri}
  `);
}
