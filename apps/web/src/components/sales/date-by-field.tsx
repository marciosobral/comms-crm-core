import { Field, Select } from "@/components/ui";
import { SALE_DATE_BY, type SaleDateBy, isSaleDateBy } from "@comms-crm-core/validation";

const LABELS: Record<SaleDateBy, string> = {
  sale: "Data da venda",
  installation: "Data da instalação",
};

export function DateByField({
  id,
  value,
  onChange,
}: { id: string; value: SaleDateBy; onChange: (value: SaleDateBy) => void }) {
  return (
    <Field label="Contar por" htmlFor={id}>
      <Select
        id={id}
        value={value}
        onChange={(e) => {
          if (isSaleDateBy(e.target.value)) onChange(e.target.value);
        }}
      >
        {SALE_DATE_BY.map((option) => (
          <option key={option} value={option}>
            {LABELS[option]}
          </option>
        ))}
      </Select>
    </Field>
  );
}
