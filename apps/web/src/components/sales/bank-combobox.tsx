import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { BANKS, findBank } from "@comms-core/validation";
import { Search } from "lucide-react";
import { useState } from "react";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function bankLabel(code: string): string {
  const bank = findBank(code);
  return bank ? `${bank.code} - ${bank.name}` : "";
}

export function BankCombobox({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (code: string) => void;
}) {
  const [query, setQuery] = useState(() => bankLabel(value));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const needle = normalize(query.trim());
  const matches = BANKS.filter(
    (bank) => !needle || bank.code.startsWith(needle) || normalize(bank.name).includes(needle),
  ).slice(0, 50);

  const select = (code: string) => {
    onChange(code);
    setQuery(bankLabel(code));
    setOpen(false);
  };

  return (
    <div
      className="relative"
      onBlur={(e) => {
        const next = e.relatedTarget;
        if (next instanceof Node && e.currentTarget.contains(next)) return;
        setOpen(false);
        setQuery(bankLabel(value));
      }}
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <Input
        id={id}
        autoComplete="off"
        placeholder="Buscar por código ou nome"
        className="pl-9"
        value={query}
        onFocus={(e) => {
          e.currentTarget.select();
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && open && matches[active]) {
            e.preventDefault();
            select(matches[active].code);
          } else if (e.key === "Escape") {
            setOpen(false);
            setQuery(bankLabel(value));
          }
        }}
      />
      {open ? (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-default bg-elevated p-1">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-caption text-muted">Nenhum banco encontrado</li>
          ) : (
            matches.map((bank, index) => (
              <li key={bank.code}>
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(bank.code)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-surface-hover",
                    index === active ? "bg-surface-hover" : null,
                  )}
                >
                  <span className="w-10 shrink-0 text-caption text-muted">{bank.code}</span>
                  <span className="text-body text-primary">{bank.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
