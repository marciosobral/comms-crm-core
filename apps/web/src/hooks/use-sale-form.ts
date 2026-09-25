import {
  customerToSaleFields,
  emptyCustomerSaleFields,
} from "@/components/sales/customer-sale-fields";
import type { DirectDebitForm } from "@/components/sales/direct-debit-fields";
import { useUploadAttachment } from "@/hooks/use-attachments";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useActiveDomainValues } from "@/hooks/use-domain-values";
import { usePermission } from "@/hooks/use-permission";
import { usePlans } from "@/hooks/use-plans";
import { useCreateSale, useUpdateSale } from "@/hooks/use-sales";
import { useUsers } from "@/hooks/use-users";
import { addressToForm, defaultAddress, emptyAddressForm } from "@/lib/address";
import { ApiError } from "@/lib/api";
import {
  type SaleFormValues,
  buildSaleFormDefaultValues,
  firstSaleFormBlockingMessage,
  firstSaleFormFieldErrorMessage,
  isBankDataComplete,
  isDirectDebitPayment,
  saleFormSchema,
  toSalePayload,
} from "@/lib/sale-form-schema";
import type { Address, Customer, SaleDetail } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

const CUSTOMER_SOURCE_TABS = [
  { id: "existing", label: "Cliente existente" },
  { id: "new", label: "Novo" },
] as const;

export type CustomerSource = (typeof CUSTOMER_SOURCE_TABS)[number]["id"];

export { CUSTOMER_SOURCE_TABS };

const CUSTOMER_FIELD_ERROR_PATHS = [
  "customerCpfCnpj",
  "customerEmail",
  "customerPhone1",
  "customerPhone2",
  "address.postalCode",
  "address.state",
] as const;

export interface UseSaleFormOptions {
  mode: "create" | "edit";
  sale?: SaleDetail;
  onDone: (saleId: string) => void;
}

export function useSaleForm({ mode, sale, onDone }: UseSaleFormOptions) {
  const { user } = useCurrentUser();
  const canEditLocked = usePermission("sales.edit_locked_fields");
  const canChangeSeller = usePermission("sales.change_seller");
  const canViewCustomers = usePermission("customers.view");

  const [customerSource, setCustomerSource] = useState<CustomerSource>("new");
  const [existingSelected, setExistingSelected] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [searchSeed, setSearchSeed] = useState("");
  const [searchNonce, setSearchNonce] = useState(0);
  const [catalogAddresses, setCatalogAddresses] = useState<Address[]>([]);
  const [customerAddressId, setCustomerAddressId] = useState("new");
  const [showInstalledAt, setShowInstalledAt] = useState(Boolean(sale?.installedAt));
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [proofOfAddressFile, setProofOfAddressFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");

  const plans = usePlans();
  const planTypes = useActiveDomainValues("PLAN_TYPE");
  const statuses = useActiveDomainValues("SALE_STATUS");
  const payments = useActiveDomainValues("PAYMENT_METHOD");
  const mailings = useActiveDomainValues("MAILING");
  const schedulePeriods = useActiveDomainValues("SCHEDULE_PERIOD");
  const users = useUsers();

  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const uploadAttachment = useUploadAttachment();
  const mutation = mode === "edit" ? updateSale : createSale;

  const editingNewAddress =
    mode === "create" && (customerSource === "new" || customerAddressId === "new");
  const schema = useMemo(
    () =>
      saleFormSchema({
        mode,
        hasSelectedCustomer: Boolean(selectedCustomerId),
        editingNewAddress,
      }),
    [mode, selectedCustomerId, editingNewAddress],
  );

  const defaultValues = useMemo(() => buildSaleFormDefaultValues(sale), [sale]);
  // Create-mode defaults (seller, plan type) load asynchronously; keepDirtyValues fills them in
  // without overwriting fields the user already changed, which is why every setValue marks dirty.
  const asyncDefaultValues = useMemo(() => {
    if (mode !== "create") return undefined;
    return {
      ...defaultValues,
      sellerId: defaultValues.sellerId || user?.id || "",
      planTypeId: defaultValues.planTypeId || planTypes.data?.[0]?.id || "",
    };
  }, [mode, defaultValues, user, planTypes.data]);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    values: asyncDefaultValues,
    resetOptions: { keepDirtyValues: true },
  });

  const values = form.watch();

  const pricingPlan = useMemo(
    () => (plans.data ?? []).find((plan) => plan.id === values.planId) ?? null,
    [plans.data, values.planId],
  );
  const priceMin = pricingPlan ? Number(pricingPlan.minPrice) : 0;
  const priceMax = pricingPlan ? Number(pricingPlan.basePrice) : 0;
  const typePlans = (plans.data ?? []).filter(
    (plan) => plan.active && plan.typeId === values.planTypeId,
  );
  const selectedPayment = (payments.data ?? []).find((row) => row.id === values.paymentMethodId);
  const isDebit = isDirectDebitPayment(selectedPayment?.value);
  const bankDataComplete = isBankDataComplete(values);
  const paymentLabel = selectedPayment?.value ?? null;
  const sellerName =
    (users.data ?? []).find((row) => row.id === values.sellerId)?.name ?? user?.name ?? null;

  const onPlanTypeChange = (planTypeId: string) => {
    form.setValue("planTypeId", planTypeId, { shouldDirty: true });
    form.setValue("planId", "", { shouldDirty: true });
    form.setValue("amount", 0, { shouldDirty: true });
  };

  const onPlanChange = (id: string) => {
    const nextPlan = (plans.data ?? []).find((plan) => plan.id === id);
    form.setValue("planId", id, { shouldDirty: true });
    form.setValue("amount", nextPlan ? Number(nextPlan.basePrice) : 0, { shouldDirty: true });
  };

  const applyCustomerFields = (fields: ReturnType<typeof emptyCustomerSaleFields>) => {
    form.setValue("customerName", fields.customerName, { shouldDirty: true });
    form.setValue("customerCpfCnpj", fields.customerCpfCnpj, { shouldDirty: true });
    form.setValue("customerBirthDate", fields.customerBirthDate, { shouldDirty: true });
    form.setValue("customerMotherName", fields.customerMotherName, { shouldDirty: true });
    form.setValue("customerEmail", fields.customerEmail, { shouldDirty: true });
    form.setValue("customerPhone1", fields.customerPhone1, { shouldDirty: true });
    form.setValue("customerPhone2", fields.customerPhone2, { shouldDirty: true });
  };

  const resetAddress = () => {
    setCatalogAddresses([]);
    setCustomerAddressId("new");
    form.setValue("address", emptyAddressForm(), { shouldDirty: true });
  };

  const applyCatalogAddress = (addresses: Address[], selectedId?: string) => {
    setCatalogAddresses(addresses);
    const selected = addresses.find((item) => item.id === selectedId) ?? defaultAddress(addresses);
    if (selected) {
      setCustomerAddressId(selected.id);
      form.setValue("address", addressToForm(selected), { shouldDirty: true });
      return;
    }
    setCustomerAddressId("new");
    form.setValue("address", emptyAddressForm(), { shouldDirty: true });
  };

  const onSwitchCustomerSource = (source: CustomerSource) => {
    if (source === customerSource) return;
    setCustomerSource(source);
    setExistingSelected(false);
    setSelectedCustomerId(undefined);
    setSearchSeed("");
    form.clearErrors(CUSTOMER_FIELD_ERROR_PATHS);
    applyCustomerFields(emptyCustomerSaleFields());
    resetAddress();
  };

  const onSelectExistingCustomer = (customer: Customer) => {
    form.clearErrors(CUSTOMER_FIELD_ERROR_PATHS);
    setExistingSelected(true);
    setSelectedCustomerId(customer.id);
    setSearchSeed(customer.name);
    applyCustomerFields(customerToSaleFields(customer));
    applyCatalogAddress(customer.addresses ?? []);
  };

  const onSwitchCustomer = () => {
    setSearchSeed(values.customerName);
    setSearchNonce((n) => n + 1);
    setExistingSelected(false);
    setSelectedCustomerId(undefined);
    form.clearErrors(CUSTOMER_FIELD_ERROR_PATHS);
    applyCustomerFields(emptyCustomerSaleFields());
    resetAddress();
  };

  const onSelectCatalogAddress = (addressId: string) => {
    applyCatalogAddress(catalogAddresses, addressId);
  };

  const onStartNewAddress = () => {
    setCustomerAddressId("new");
    form.setValue("address", emptyAddressForm(), { shouldDirty: true });
  };

  const onDirectDebitChange = (patch: Partial<DirectDebitForm>) => {
    if (patch.bankCode !== undefined)
      form.setValue("bankCode", patch.bankCode, { shouldDirty: true });
    if (patch.bankAgency !== undefined)
      form.setValue("bankAgency", patch.bankAgency, { shouldDirty: true });
    if (patch.bankAgencyDigit !== undefined)
      form.setValue("bankAgencyDigit", patch.bankAgencyDigit, { shouldDirty: true });
    if (patch.bankAccount !== undefined)
      form.setValue("bankAccount", patch.bankAccount, { shouldDirty: true });
    if (patch.bankAccountDigit !== undefined)
      form.setValue("bankAccountDigit", patch.bankAccountDigit, { shouldDirty: true });
    if (patch.bankAccountType !== undefined)
      form.setValue("bankAccountType", patch.bankAccountType, { shouldDirty: true });
    if (patch.accountHolder !== undefined)
      form.setValue("accountHolder", patch.accountHolder, { shouldDirty: true });
    if (patch.accountHolderName !== undefined)
      form.setValue("accountHolderName", patch.accountHolderName, { shouldDirty: true });
    if (patch.accountHolderCpf !== undefined)
      form.setValue("accountHolderCpf", patch.accountHolderCpf, { shouldDirty: true });
  };

  const onSubmit = () => {
    setFormError("");
    const blockingMessage = firstSaleFormBlockingMessage(values, {
      mode,
      hasValidPlan: pricingPlan !== null,
      isDirectDebit: isDebit,
      isBankDataComplete: bankDataComplete,
      requireExistingCustomerSelection:
        canViewCustomers && customerSource === "existing" && !existingSelected,
    });
    if (blockingMessage) {
      setFormError(blockingMessage);
      return;
    }

    form.handleSubmit(
      (validValues) => {
        const onSuccess = (result: { id: string }) => onDone(result.id);
        const onError = (err: unknown) =>
          setFormError(err instanceof ApiError ? err.message : "Erro ao salvar venda");

        if (mode === "edit" && sale) {
          const payload = toSalePayload(validValues, {
            mode: "edit",
            isDirectDebit: isDebit,
            canChangeSeller,
            customerSource,
            selectedCustomerId,
            customerAddressId,
          });
          updateSale.mutate({ id: sale.id, ...payload }, { onSuccess, onError });
          return;
        }

        const payload = toSalePayload(validValues, {
          mode: "create",
          isDirectDebit: isDebit,
          canChangeSeller,
          customerSource,
          selectedCustomerId,
          customerAddressId,
        });
        createSale.mutate(payload, {
          onSuccess: async (result) => {
            const pending = [
              { file: audioFile, kind: "AUDIO" as const },
              { file: proofOfAddressFile, kind: "PROOF_OF_ADDRESS" as const },
            ];
            for (const { file, kind } of pending) {
              if (!file) continue;
              // A failed upload does not undo the sale; the sale page shows what is missing.
              await uploadAttachment
                .mutateAsync({ saleId: result.id, file, kind })
                .catch(() => null);
            }
            onDone(result.id);
          },
          onError,
        });
      },
      (fieldErrors) => {
        setFormError(firstSaleFormFieldErrorMessage(fieldErrors) ?? "");
      },
    )();
  };

  return {
    form,
    values,
    mode,
    sale,
    canEditLocked,
    canChangeSeller,
    canViewCustomers,
    customerSource,
    existingSelected,
    selectedCustomerId,
    searchSeed,
    searchNonce,
    catalogAddresses,
    customerAddressId,
    onSwitchCustomerSource,
    onSelectExistingCustomer,
    onSwitchCustomer,
    onSelectCatalogAddress,
    onStartNewAddress,
    plans,
    planTypes,
    statuses,
    payments,
    mailings,
    schedulePeriods,
    users,
    pricingPlan,
    priceMin,
    priceMax,
    typePlans,
    isDebit,
    bankDataComplete,
    paymentLabel,
    sellerName,
    onPlanTypeChange,
    onPlanChange,
    onDirectDebitChange,
    showInstalledAt,
    setShowInstalledAt,
    audioFile,
    setAudioFile,
    proofOfAddressFile,
    setProofOfAddressFile,
    formError,
    onSubmit,
    isSubmitting: mutation.isPending || uploadAttachment.isPending,
  };
}
