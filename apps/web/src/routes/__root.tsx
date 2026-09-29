import { API_URL } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";
import { contentSecurityPolicy } from "@/lib/csp";
/// <reference types="vite/client" />
import { queryClient } from "@/lib/query";
import { QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../styles/globals.css?url";

export const Route = createRootRoute({
  head: ({ ssr }) => ({
    meta: [
      { charSet: "utf-8" },
      // The CSP lives in a <meta> rather than a response header because a nonce CSP header makes
      // TanStack Router duplicate inline scripts after hydration (TanStack/router#8550).
      ...(ssr?.nonce
        ? [
            {
              httpEquiv: "Content-Security-Policy",
              content: contentSecurityPolicy(ssr.nonce, API_URL),
            },
          ]
        : []),
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
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
