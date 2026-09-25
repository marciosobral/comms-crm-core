import { Button, Field, Select } from "@/components/ui";
import { useSaleForm } from "@/hooks/use-sale-form";
import type { SaleDetail } from "@/lib/types";
import { FormProvider } from "react-hook-form";
import { PlanPanel } from "./plan-panel";
import { SaleChecklist } from "./sale-checklist";
import { AddressSection } from "./sale-form/address-section";
import { AttachmentsSection } from "./sale-form/attachments-section";
import { CustomerSection } from "./sale-form/customer-section";
import { domainOptions } from "./sale-form/domain-options";
import { NotesSection } from "./sale-form/notes-section";
import { OperationalSection } from "./sale-form/operational-section";
import { PeopleSection } from "./sale-form/people-section";
import { PlanSection } from "./sale-form/plan-section";
import { ScheduleSection } from "./sale-form/schedule-section";
import { SaleSummary } from "./sale-summary";

interface SaleFormProps {
  mode: "create" | "edit";
  sale?: SaleDetail;
  onDone: (saleId: string) => void;
}

export function SaleForm({ mode, sale, onDone }: SaleFormProps) {
  const saleForm = useSaleForm({ mode, sale, onDone });
  const { form, values } = saleForm;

  return (
    <FormProvider {...form}>
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-[1fr_360px] items-start gap-6">
          <div className="flex flex-col gap-6">
            {mode === "create" ? (
              <>
                <CustomerSection
                  canViewCustomers={saleForm.canViewCustomers}
                  customerSource={saleForm.customerSource}
                  existingSelected={saleForm.existingSelected}
                  searchSeed={saleForm.searchSeed}
                  searchNonce={saleForm.searchNonce}
                  onSwitchCustomerSource={saleForm.onSwitchCustomerSource}
                  onSelectExistingCustomer={saleForm.onSelectExistingCustomer}
                  onSwitchCustomer={saleForm.onSwitchCustomer}
                />
                <AddressSection
                  customerSource={saleForm.customerSource}
                  existingSelected={saleForm.existingSelected}
                  catalogAddresses={saleForm.catalogAddresses}
                  customerAddressId={saleForm.customerAddressId}
                  onSelectCatalogAddress={saleForm.onSelectCatalogAddress}
                  onStartNewAddress={saleForm.onStartNewAddress}
                />
              </>
            ) : null}

            <PlanSection
              mode={mode}
              canEditSale={saleForm.canEditSale}
              planTypeOptions={saleForm.planTypes.data ?? []}
              typePlans={saleForm.typePlans}
              pricingPlan={saleForm.pricingPlan}
              priceMin={saleForm.priceMin}
              priceMax={saleForm.priceMax}
              paymentOptions={saleForm.payments.data ?? []}
              isDebit={saleForm.isDebit}
              onPlanTypeChange={saleForm.onPlanTypeChange}
              onPlanChange={saleForm.onPlanChange}
              onDirectDebitChange={saleForm.onDirectDebitChange}
            />

            <ScheduleSection
              schedulePeriodOptions={saleForm.schedulePeriods.data ?? []}
              showInstalledAt={saleForm.showInstalledAt}
              onRevealInstalledAt={() => saleForm.setShowInstalledAt(true)}
            />

            <NotesSection />

            <OperationalSection
              mode={mode}
              canEditLocked={saleForm.canEditLocked}
              mailingOptions={saleForm.mailings.data ?? []}
            />

            <PeopleSection
              canChangeSeller={saleForm.canChangeSeller}
              users={saleForm.users.data ?? []}
            />

            {mode === "create" ? (
              <AttachmentsSection
                audioFile={saleForm.audioFile}
                onAudioFileChange={saleForm.setAudioFile}
                proofOfAddressFile={saleForm.proofOfAddressFile}
                onProofOfAddressFileChange={saleForm.setProofOfAddressFile}
              />
            ) : null}
          </div>

          <div className="sticky top-0 flex flex-col gap-6">
            {mode === "create" ? (
              <section className="flex flex-col gap-4 rounded-lg border border-default bg-surface p-6">
                <h3 className="text-h3 text-primary">Status</h3>
                <Field label="Status da venda" htmlFor="s-status">
                  <Select id="s-status" {...form.register("statusId")}>
                    <option value="">Selecione</option>
                    {domainOptions(saleForm.statuses.data ?? [])}
                  </Select>
                </Field>
              </section>
            ) : null}
            <PlanPanel plan={saleForm.pricingPlan} />
            {mode === "create" ? (
              <>
                <SaleSummary
                  amount={values.amount}
                  dueDay={values.dueDay}
                  paymentLabel={saleForm.paymentLabel}
                  sellerName={saleForm.sellerName}
                  priceMin={saleForm.pricingPlan ? saleForm.priceMin : null}
                  priceMax={saleForm.pricingPlan ? saleForm.priceMax : null}
                />
                <SaleChecklist
                  brscan={values.brscan}
                  audioAttached={saleForm.audioFile !== null}
                  proofOfAddressAttached={saleForm.proofOfAddressFile !== null}
                  payment={!values.paymentMethodId ? "none" : saleForm.isDebit ? "debit" : "boleto"}
                  bankDataComplete={saleForm.bankDataComplete}
                />
              </>
            ) : null}
          </div>
        </div>

        {saleForm.formError ? (
          <p className="text-caption text-danger">{saleForm.formError}</p>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => onDone(sale?.id ?? "")}>
            Cancelar
          </Button>
          <Button loading={saleForm.isSubmitting} onClick={saleForm.onSubmit}>
            {mode === "edit" ? "Salvar alterações" : "Salvar venda"}
          </Button>
        </div>
      </div>
    </FormProvider>
  );
}
