import type { AsqCollection } from "./collections";

export interface JetstreamMessage {
  did: string;
  time_us: number;
  kind: "commit" | "identity" | "account";
  commit?: JetstreamCommit;
}

export interface JetstreamCommit {
  rev: string;
  operation: "create" | "update" | "delete";
  collection: string;
  rkey: string;
  cid?: string;
  record?: Record<string, unknown>;
}

export interface StrongRef {
  uri?: string;
  cid?: string;
}

export interface QuestionRecord {
  $type?: string;
  title?: string;
  body?: string;
  tags?: string[];
  createdAt?: string;
}

export interface AnswerRecord {
  $type?: string;
  subject?: StrongRef;
  body?: string;
  createdAt?: string;
}

export interface CommentRecord {
  $type?: string;
  subject?: StrongRef;
  parent?: StrongRef;
  body?: string;
  createdAt?: string;
}

export interface VoteRecord {
  $type?: string;
  subject?: StrongRef;
  direction?: "up" | "down";
  createdAt?: string;
}

export interface AcceptedAnswerRecord {
  $type?: string;
  question?: StrongRef;
  answer?: StrongRef;
  createdAt?: string;
}

export function atUri(did: string, collection: AsqCollection, rkey: string): string {
  return `at://${did}/${collection}/${rkey}`;
}

export function parseDate(iso: string | undefined, fallback: Date): Date {
  if (!iso) return fallback;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? fallback : d;
}
