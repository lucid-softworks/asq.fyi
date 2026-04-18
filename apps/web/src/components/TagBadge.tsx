import { Link } from "@tanstack/react-router";

export function TagBadge({ tag }: { tag: string }) {
  return (
    <Link
      to="/tag/$tag"
      params={{ tag }}
      className="chip topic"
    >
      {tag}
    </Link>
  );
}
