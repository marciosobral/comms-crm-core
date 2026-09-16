import { Button, Field, Input } from "@/components/ui";
import { useCustomers } from "@/hooks/use-customers";
import type { Customer } from "@/lib/types";
import { useEffect, useState } from "react";
import { customerSearchHint, isCustomerSearchQuery } from "./customer-sale-fields";

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function CustomerSearch({
  onSelect,
  onClear,
}: {
  onSelect: (customer: Customer) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(false);
  const debounced = useDebouncedValue(query, 300);
  const enabled = isCustomerSearchQuery(debounced);
  const customers = useCustomers({ q: debounced.trim(), page: 1, perPage: 8 }, { enabled });
  const items = customers.data?.items ?? [];
  const showList = open && enabled;

  return (
    <div
      className="relative"
      onBlur={(e) => {
        const next = e.relatedTarget;
        if (next instanceof Node && e.currentTarget.contains(next)) return;
        setOpen(false);
      }}
    >
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field label="Buscar cliente existente" htmlFor="c-search">
            <Input
              id="c-search"
              placeholder="Nome, CPF, telefone ou e-mail"
              value={query}
              autoComplete="off"
              onChange={(e) => {
                setQuery(e.target.value);
                setPicked(false);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
            />
          </Field>
        </div>
        {picked ? (
          <Button
            variant="ghost"
            onClick={() => {
              setQuery("");
              setPicked(false);
              setOpen(false);
              onClear();
            }}
          >
            Limpar
          </Button>
        ) : null}
      </div>
      {showList ? (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-default bg-elevated p-1">
          {customers.isFetching && items.length === 0 ? (
            <li className="px-3 py-2 text-caption text-muted">Buscando...</li>
          ) : null}
          {!customers.isFetching && items.length === 0 ? (
            <li className="px-3 py-2 text-caption text-muted">Nenhum cliente encontrado</li>
          ) : null}
          {items.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left hover:bg-surface-hover"
                onClick={() => {
                  onSelect(customer);
                  setQuery(customer.name);
                  setPicked(true);
                  setOpen(false);
                }}
              >
                <span className="text-body text-primary">{customer.name}</span>
                <span className="text-caption text-muted">{customerSearchHint(customer)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
