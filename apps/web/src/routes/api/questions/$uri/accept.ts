import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { acceptAnswerSchema } from "@asq/shared";
import { db } from "@asq/server/db";
import { acceptedAnswers, answers, questions } from "@asq/server/db/schema";
import {
  PdsWriteError,
  createRecord,
  deleteRecord,
  type CreateRecordResult,
} from "@asq/server/atproto/write";
import { getAsqSession } from "../../../../lib/server/session";
import {
  error,
  forbidden,
  json,
  notFound,
  unauthorized,
  validationFailed,
} from "../../../../lib/server/responses";

export const Route = createFileRoute("/api/questions/$uri/accept")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const asq = await getAsqSession();
        if (!asq) return unauthorized();

        const body = (await request.json()) as unknown;
        const parsed = acceptAnswerSchema.safeParse(body);
        if (!parsed.success) return validationFailed(parsed.error);

        const questionUri = decodeURIComponent(params.uri);

        const q = await db
          .select({
            uri: questions.uri,
            cid: questions.cid,
            authorDid: questions.authorDid,
          })
          .from(questions)
          .where(eq(questions.uri, questionUri))
          .limit(1);
        const target = q[0];
        if (!target) return notFound("Question not found");
        if (target.authorDid !== asq.did) {
          return forbidden("Only the question's author can accept an answer");
        }

        const a = await db
          .select({ uri: answers.uri, cid: answers.cid })
          .from(answers)
          .where(eq(answers.uri, parsed.data.answerUri))
          .limit(1);
        const answerRow = a[0];
        if (!answerRow) return notFound("Answer not found");

        try {
          const existing = await db
            .select({ uri: acceptedAnswers.uri })
            .from(acceptedAnswers)
            .where(eq(acceptedAnswers.questionUri, questionUri))
            .limit(1);
          if (existing[0]) {
            try {
              await deleteRecord(asq.session, existing[0].uri);
            } catch (err) {
              if (err instanceof PdsWriteError) {
                return error(502, {
                  error: "pds_error",
                  message: err.message,
                });
              }
              throw err;
            }
          }
          const createdAt = new Date().toISOString();
          const result: CreateRecordResult = await createRecord(
            asq.session,
            "fyi.asq.acceptedAnswer",
            {
              question: { uri: target.uri, cid: target.cid },
              answer: { uri: answerRow.uri, cid: answerRow.cid },
              createdAt,
            },
          );
          return json(result);
        } catch (err) {
          if (err instanceof PdsWriteError) {
            return error(502, { error: "pds_error", message: err.message });
          }
          throw err;
        }
      },
    },
  },
});
