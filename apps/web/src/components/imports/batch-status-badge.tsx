import { Badge } from "@/components/ui";

export function BatchStatusBadge({ pending }: { pending: number }) {
  if (pending > 0) return <Badge status="agInstalacao" label="PENDÊNCIAS" />;
  return <Badge status="gross" label="CONCLUÍDA" />;
}
