import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { Layout } from "./components/Layout";
import { RouteErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
import Home from "./routes/Home";
import QuestionDetail from "./routes/QuestionDetail";
import Profile from "./routes/Profile";
import Tag from "./routes/Tag";
import Search from "./routes/Search";
import Login from "./routes/Login";
import Ask from "./routes/Ask";
import Privacy from "./routes/Privacy";
import NotFound from "./routes/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function Guarded({ children }: { children: ReactNode }) {
  return <RouteErrorBoundary>{children}</RouteErrorBoundary>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route
                index
                element={
                  <Guarded>
                    <Home />
                  </Guarded>
                }
              />
              <Route
                path="q/:did/:rkey"
                element={
                  <Guarded>
                    <QuestionDetail />
                  </Guarded>
                }
              />
              <Route
                path="u/:handle"
                element={
                  <Guarded>
                    <Profile />
                  </Guarded>
                }
              />
              <Route
                path="tag/:tag"
                element={
                  <Guarded>
                    <Tag />
                  </Guarded>
                }
              />
              <Route
                path="search"
                element={
                  <Guarded>
                    <Search />
                  </Guarded>
                }
              />
              <Route
                path="login"
                element={
                  <Guarded>
                    <Login />
                  </Guarded>
                }
              />
              <Route
                path="ask"
                element={
                  <Guarded>
                    <Ask />
                  </Guarded>
                }
              />
              <Route
                path="privacy"
                element={
                  <Guarded>
                    <Privacy />
                  </Guarded>
                }
              />
              <Route
                path="*"
                element={
                  <Guarded>
                    <NotFound />
                  </Guarded>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
