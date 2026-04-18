import { createHash } from "node:crypto";
import { getSalt } from "./salt";

/**
 * Compute the 32-char hex `visitor_hash` used to dedupe analytics events
 * without persisting any identifying input.
 *
 * The hash is keyed per-subject on purpose: the same visitor viewing two
 * different questions produces two different hashes, which prevents using
 * the hash as a de-facto stable user ID.
 *
 * Inputs are only read to produce the hash — nothing is logged or stored.
 */
export async function visitorHash(
  ip: string,
  userAgent: string,
  subjectUri: string,
  date: Date = new Date(),
): Promise<string> {
  const salt = await getSalt(date);
  const h = createHash("sha256");
  h.update(ip);
  h.update("\x00");
  h.update(userAgent);
  h.update("\x00");
  h.update(salt);
  h.update("\x00");
  h.update(subjectUri);
  return h.digest("hex").slice(0, 32);
}
