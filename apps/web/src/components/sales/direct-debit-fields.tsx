import { Field, Input, MaskedInput } from "@/components/ui";
import type { BankAccountType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { digitsOnly } from "@comms-core/validation";
import { BankCombobox } from "./bank-combobox";

export interface DirectDebitForm {
  bankCode: string;
  bankAgency: string;
  bankAgencyDigit: string;
  bankAccount: string;
  bankAccountDigit: string;
  bankAccountType: BankAccountType | "";
  accountHolder: "customer" | "other" | "";
  accountHolderName: string;
  accountHolderCpf: string;
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | "";
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div
      aria-label={label}
      className="flex h-10 gap-1 rounded-md border border-default bg-base p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex flex-1 items-center justify-center rounded-sm px-3 text-small transition-colors",
            value === option.value
              ? "bg-surface-hover text-primary"
              : "text-secondary hover:text-primary",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function NumberWithDigit({
  id,
  label,
  value,
  digit,
  digitLabel,
  onValue,
  onDigit,
}: {
  id: string;
  label: string;
  value: string;
  digit: string;
  digitLabel: string;
  onValue: (value: string) => void;
  onDigit: (digit: string) => void;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          inputMode="numeric"
          value={value}
          onChange={(e) => onValue(digitsOnly(e.target.value))}
        />
        <span className="text-muted" aria-hidden>
          -
        </span>
        <Input
          aria-label={digitLabel}
          placeholder="DV"
          maxLength={1}
          className="w-14 shrink-0 text-center"
          value={digit}
          onChange={(e) => onDigit(e.target.value)}
        />
      </div>
    </Field>
  );
}

export function DirectDebitFields({
  value,
  onChange,
}: {
  value: DirectDebitForm;
  onChange: (patch: Partial<DirectDebitForm>) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-default bg-elevated p-4">
      <h4 className="text-body-medium text-primary">Dados para débito em conta</h4>

      <Field label="Banco" htmlFor="s-bank">
        <BankCombobox
          id="s-bank"
          value={value.bankCode}
          onChange={(bankCode) => onChange({ bankCode })}
        />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <NumberWithDigit
          id="s-agency"
          label="Agência"
          value={value.bankAgency}
          digit={value.bankAgencyDigit}
          digitLabel="Dígito da agência (opcional)"
          onValue={(bankAgency) => onChange({ bankAgency })}
          onDigit={(digit) => onChange({ bankAgencyDigit: digitsOnly(digit) })}
        />
        <NumberWithDigit
          id="s-account"
          label="Conta"
          value={value.bankAccount}
          digit={value.bankAccountDigit}
          digitLabel="Dígito da conta"
          onValue={(bankAccount) => onChange({ bankAccount })}
          onDigit={(digit) =>
            onChange({ bankAccountDigit: digit.replace(/[^0-9xX]/g, "").toUpperCase() })
          }
        />
        <div className="flex flex-col gap-2">
          <span className="text-small text-secondary">Tipo de conta</span>
          <Segmented
            label="Tipo de conta"
            value={value.bankAccountType}
            options={[
              { value: "CHECKING", label: "Corrente" },
              { value: "SAVINGS", label: "Poupança" },
            ]}
            onChange={(bankAccountType) => onChange({ bankAccountType })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-small text-secondary">Titular da conta</span>
        <div className="max-w-sm">
          <Segmented
            label="Titular da conta"
            value={value.accountHolder}
            options={[
              { value: "customer", label: "Próprio cliente" },
              { value: "other", label: "Outra pessoa" },
            ]}
            onChange={(accountHolder) => onChange({ accountHolder })}
          />
        </div>
      </div>

      {value.accountHolder === "other" ? (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome do titular" htmlFor="s-holder-name">
            <Input
              id="s-holder-name"
              value={value.accountHolderName}
              onChange={(e) => onChange({ accountHolderName: e.target.value })}
            />
          </Field>
          <Field label="CPF do titular" htmlFor="s-holder-cpf">
            <MaskedInput
              id="s-holder-cpf"
              mask="cpfCnpj"
              placeholder="000.000.000-00"
              value={value.accountHolderCpf}
              onChange={(accountHolderCpf) => onChange({ accountHolderCpf })}
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
}
