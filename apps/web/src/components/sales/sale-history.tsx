import { HistoryTimeline } from "@/components/history/history-timeline";
import { useSaleHistory } from "@/hooks/use-sales";

export function SaleHistory({ saleId }: { saleId: string }) {
  const historyQuery = useSaleHistory(saleId);
  return <HistoryTimeline entries={historyQuery.data ?? []} />;
}
