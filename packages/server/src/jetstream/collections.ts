export const JETSTREAM_COLLECTIONS = [
  "fyi.asq.question",
  "fyi.asq.answer",
  "fyi.asq.vote",
  "fyi.asq.comment",
  "fyi.asq.acceptedAnswer",
] as const;

export type AsqCollection = (typeof JETSTREAM_COLLECTIONS)[number];

export function isAsqCollection(s: string): s is AsqCollection {
  return (JETSTREAM_COLLECTIONS as readonly string[]).includes(s);
}
