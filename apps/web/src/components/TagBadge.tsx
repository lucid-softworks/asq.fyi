import { Link } from "react-router-dom";

export function TagBadge({ tag }: { tag: string }) {
  return (
    <Link to={`/tag/${encodeURIComponent(tag)}`} className="chip topic">
      {tag}
    </Link>
  );
}
