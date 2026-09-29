import { createRouter } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { routeTree } from "./routeTree.gen";

// The server mints a nonce per request; the client reuses the one TanStack renders in
// <meta property="csp-nonce"> so client-inserted scripts and hydrated markup match.
const getNonce = createIsomorphicFn()
  .server(() => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return btoa(String.fromCharCode(...bytes));
  })
  .client(() => document.querySelector<HTMLMetaElement>('meta[property="csp-nonce"]')?.content);

export function getRouter() {
  const nonce = import.meta.env.PROD ? getNonce() : undefined;

  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    ssr: nonce ? { nonce } : undefined,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
