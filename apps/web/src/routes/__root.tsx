/// <reference types="vite/client" />
import type { ReactNode } from "react";
import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import {
  QueryClientProvider,
  type QueryClient,
} from "@tanstack/react-query";
import appCss from "../styles/app.css?url";
import { ToastProvider } from "../components/Toast";
import { RouteErrorBoundary } from "../components/ErrorBoundary";
import { Header } from "../components/Header";
import { Ticker } from "../components/Ticker";
import { SiteFooter } from "../components/SiteFooter";

const DEFAULT_TITLE = "asq.fyi — ask anyone, anything (on atproto)";
const DEFAULT_DESC =
  "A public square for questions both silly and serious. Built on the AT Protocol, so your account, followers, and answers belong to you — not us.";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { name: "color-scheme", content: "light" },
      { name: "theme-color", content: "#f4ecd8" },
      { title: DEFAULT_TITLE },
      { name: "description", content: DEFAULT_DESC },
      { property: "og:site_name", content: "asq.fyi" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: DEFAULT_TITLE },
      { property: "og:description", content: DEFAULT_DESC },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: DEFAULT_TITLE },
      { name: "twitter:description", content: DEFAULT_DESC },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=VT323&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400&family=JetBrains+Mono:wght@400;500;700&display=swap",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <div
            style={{
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Ticker />
            <Header />
            <main style={{ flex: 1, minWidth: 0 }}>
              <RouteErrorBoundary>
                <Outlet />
              </RouteErrorBoundary>
            </main>
            <SiteFooter />
          </div>
        </ToastProvider>
      </QueryClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--s-7) var(--s-5)",
      }}
    >
      <div className="lost-card">
        <div className="lost-card__head">
          <span>
            FILE NO. <span className="err">404</span>
          </span>
        </div>
        <div className="lost-card__body">
          <div className="ascii">{`┌─────────────┐
│      ?      │
│      ?      │
│      ?      │
└─────────────┘
    LOST
    MAIL`}</div>
          <h1>404</h1>
          <p>
            That page doesn't exist — or it was deleted from its author's PDS.
          </p>
          <a href="/" className="btn btn--primary">
            ★ BACK TO FEED
          </a>
        </div>
      </div>
    </main>
  );
}
