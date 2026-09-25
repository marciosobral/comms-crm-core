import { Button } from "./button";

export function Pagination({
  firstShown,
  lastShown,
  total,
  noun,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: {
  firstShown: number;
  lastShown: number;
  total: number;
  noun: string;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <span className="text-caption text-muted">
        Mostrando {firstShown}-{lastShown} de {total} {noun}
      </span>
      <div className="flex gap-3">
        <Button variant="secondary" disabled={!hasPrevious} onClick={onPrevious}>
          Anterior
        </Button>
        <Button variant="secondary" disabled={!hasNext} onClick={onNext}>
          Próxima
        </Button>
      </div>
    </>
  );
}
