import { Elysia, t } from "elysia";
import {
  getQuestionDetail,
  listQuestions,
  type QuestionSort,
} from "../db/queries/questions";
import { sessionDerive } from "../auth/middleware";

const sortValues: QuestionSort[] = [
  "new",
  "top",
  "unanswered",
  "trending",
  "most_viewed",
  "most_discussed",
];

export const questionsRoutes = new Elysia({ prefix: "/api" })
  .use(sessionDerive)
  .get(
    "/questions",
    async ({ query, asqSession }) => {
      const sort = (sortValues as string[]).includes(query.sort ?? "")
        ? (query.sort as QuestionSort)
        : "new";
      const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
      const result = await listQuestions({
        sort,
        tag: query.tag,
        cursor: query.cursor,
        limit,
        viewerDid: asqSession?.did,
      });
      return result;
    },
    {
      query: t.Object({
        sort: t.Optional(t.String()),
        tag: t.Optional(t.String()),
        cursor: t.Optional(t.String()),
        limit: t.Optional(t.Numeric()),
      }),
    },
  )
  .get(
    "/questions/:uri",
    async ({ params, set, asqSession }) => {
      const uri = decodeURIComponent(params.uri);
      const detail = await getQuestionDetail(uri, asqSession?.did);
      if (!detail) {
        set.status = 404;
        return { error: "not_found", message: "Question not found" };
      }
      return detail;
    },
    {
      params: t.Object({ uri: t.String() }),
    },
  );
