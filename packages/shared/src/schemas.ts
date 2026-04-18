import { z } from "zod";

export const atUri = z
  .string()
  .regex(/^at:\/\/[^/]+\/[^/]+\/[^/]+$/, "must be a valid AT URI");

export const cid = z.string().min(1).max(256);

export const tag = z
  .string()
  .min(1)
  .max(24)
  .regex(/^[a-z0-9][a-z0-9-]*$/i, "tags are alphanumeric with dashes");

export const createQuestionSchema = z.object({
  title: z.string().min(10).max(300),
  body: z.string().min(1).max(10_000),
  tags: z.array(tag).max(5),
});
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

export const createAnswerSchema = z.object({
  body: z.string().min(1).max(10_000),
});
export type CreateAnswerInput = z.infer<typeof createAnswerSchema>;

export const createCommentSchema = z
  .object({
    subjectUri: atUri,
    subjectCid: cid,
    parentUri: atUri.optional(),
    parentCid: cid.optional(),
    body: z.string().min(1).max(1_000),
  })
  .refine(
    (v) =>
      (v.parentUri && v.parentCid) || (!v.parentUri && !v.parentCid),
    { message: "parentUri and parentCid must be set together" },
  );
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const voteSchema = z.object({
  subjectUri: atUri,
  subjectCid: cid,
  direction: z.enum(["up", "down"]),
});
export type VoteInput = z.infer<typeof voteSchema>;

export const acceptAnswerSchema = z.object({
  answerUri: atUri,
  answerCid: cid,
});
export type AcceptAnswerInput = z.infer<typeof acceptAnswerSchema>;
