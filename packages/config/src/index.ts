export const appConfig = {
  name: "Comms CRM Core",
  logo: "/logo.svg",
  theme: {
    primary: "teal",
    background: "navy",
    mode: "dark" as const,
  },
} as const;

export type AppConfig = typeof appConfig;

export const saleDefaults = {
  qty: 1,
} as const;
