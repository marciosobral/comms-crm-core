export const appConfig = {
  name: "Comms Core",
  logo: "/logo.svg",
  theme: {
    primary: "teal",
    background: "navy",
    mode: "dark" as const,
  },
} as const;

export type AppConfig = typeof appConfig;
