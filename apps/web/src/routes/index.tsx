import { createFileRoute } from "@tanstack/react-router";
import { appConfig } from "@comms-core/config";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold text-primary">{appConfig.name}</h1>
    </div>
  );
}
