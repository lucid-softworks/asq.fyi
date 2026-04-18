export function ErrorState({
  title = "Something went wrong",
  message,
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div role="alert" className="alert">
      <strong
        className="display"
        style={{ fontSize: "var(--t-xl)", display: "block" }}
      >
        {title}
      </strong>
      {message ? <div style={{ marginTop: 4 }}>{message}</div> : null}
    </div>
  );
}
