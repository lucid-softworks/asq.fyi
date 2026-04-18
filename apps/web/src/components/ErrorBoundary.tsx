import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[route error]", error, info.componentStack);
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="wrap-980" style={{ padding: "var(--s-8) 0" }}>
        <div className="card card--shadow" role="alert">
          <p className="mono" style={{ color: "var(--red)" }}>
            ! RENDER ERROR
          </p>
          <h2
            className="display"
            style={{
              fontSize: "var(--t-2xl)",
              margin: "var(--s-2) 0 var(--s-3)",
              fontWeight: 400,
            }}
          >
            Something went wrong.
          </h2>
          <p style={{ marginTop: 0 }}>
            This page hit an error while rendering. It's been logged. Try
            reloading, or head{" "}
            <Link to="/">back home</Link>.
          </p>
          {import.meta.env.DEV ? (
            <pre
              className="mono"
              style={{
                marginTop: "var(--s-3)",
                padding: "var(--s-3)",
                background: "var(--ink)",
                color: "var(--paper)",
                overflow: "auto",
              }}
            >
              {error.message}
            </pre>
          ) : null}
        </div>
      </div>
    );
  }
}
