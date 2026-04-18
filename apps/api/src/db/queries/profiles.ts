import { desc, eq } from "drizzle-orm";
import { answers, profiles, questions } from "../schema";
import { db } from "../client";
import type { ProfileSummary } from "./questions";

export interface ProfileView {
  profile: ProfileSummary & { updatedAt: string };
  recentQuestions: Array<{
    uri: string;
    cid: string;
    title: string;
    score: number;
    answerCount: number;
    createdAt: string;
  }>;
  recentAnswers: Array<{
    uri: string;
    cid: string;
    questionUri: string;
    body: string;
    score: number;
    createdAt: string;
  }>;
}

export async function getProfileByHandle(
  handle: string,
): Promise<ProfileView | null> {
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.handle, handle))
    .limit(1);
  const profile = rows[0];
  if (!profile) return null;

  const [qs, as] = await Promise.all([
    db
      .select({
        uri: questions.uri,
        cid: questions.cid,
        title: questions.title,
        score: questions.score,
        answerCount: questions.answerCount,
        createdAt: questions.createdAt,
      })
      .from(questions)
      .where(eq(questions.authorDid, profile.did))
      .orderBy(desc(questions.createdAt))
      .limit(20),
    db
      .select({
        uri: answers.uri,
        cid: answers.cid,
        questionUri: answers.questionUri,
        body: answers.body,
        score: answers.score,
        createdAt: answers.createdAt,
      })
      .from(answers)
      .where(eq(answers.authorDid, profile.did))
      .orderBy(desc(answers.createdAt))
      .limit(20),
  ]);

  return {
    profile: {
      did: profile.did,
      handle: profile.handle,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      updatedAt: profile.updatedAt.toISOString(),
    },
    recentQuestions: qs.map((q) => ({
      uri: q.uri,
      cid: q.cid,
      title: q.title,
      score: q.score,
      answerCount: q.answerCount,
      createdAt: q.createdAt.toISOString(),
    })),
    recentAnswers: as.map((a) => ({
      uri: a.uri,
      cid: a.cid,
      questionUri: a.questionUri,
      body: a.body,
      score: a.score,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}
