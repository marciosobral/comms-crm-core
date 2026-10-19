import { computeDiff } from "@/audit/diff";
import { DEMO_PROFILES, DEMO_PROFILE_KEYS, type DemoProfileKey } from "@/demo/demo-profiles";
import { businessDateKey, findBank, formatCpfCnpj } from "@comms-crm-core/validation";
import type { DomainType, Prisma } from "@prisma-client";
import { fakeCnpj, fakeCpf } from "./documents";
import {
  CANCEL_REASONS,
  CITIES,
  COMPANY_PATTERNS,
  EXTRA_SELLER_NAMES,
  FIRST_NAMES,
  LAST_NAMES,
  NEIGHBORHOODS,
  STREETS,
} from "./names";
import { SeededRandom } from "./random";

export interface DemoDatasetOptions {
  now: Date;
  defaultPdv: string;
  defaultSystem: string;
}

export interface DemoDataset {
  roles: Prisma.RoleCreateManyInput[];
  users: Prisma.UserCreateManyInput[];
  domainValues: Prisma.DomainValueCreateManyInput[];
  plans: Prisma.PlanCreateManyInput[];
  customers: Prisma.CustomerCreateManyInput[];
  customerAddresses: Prisma.CustomerAddressCreateManyInput[];
  sales: Prisma.SaleCreateManyInput[];
  saleAddresses: Prisma.SaleAddressCreateManyInput[];
  auditLogs: Prisma.AuditLogCreateManyInput[];
  notifications: Prisma.NotificationCreateManyInput[];
  importBatches: Prisma.ImportBatchCreateManyInput[];
  importRows: Prisma.ImportRowCreateManyInput[];
  systemSettings: Prisma.SystemSettingCreateManyInput[];
}

const SEED = 20_261_019;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const HISTORY_DAYS = 180;
const CUSTOMER_COUNT = 200;
const SALE_COUNT = 300;
const IMPORTED_SALE_COUNT = 25;
const DUE_DAYS = [5, 10, 15, 20];
const SECOND_PDV = "PDV SHOPPING";
const INITIAL_STATUS = "GROSS";
const CANCELED_STATUS = "CANCELADA";
const MAILINGS = ["DISCADORA", "DISPARO", "PAP", "INDICAÇÃO"];
const SCHEDULE_PERIODS = ["08:00 - 12:00", "13:00 - 18:00"];
const SALES_SCRIPT =
  "Apresente o plano, confirme o endereço de instalação e combine o melhor horário para a visita técnica.";

// The batch screen reads the customer and document from these spreadsheet columns
// (apps/web/src/components/imports/import-rows-table.tsx).
const IMPORT_COLUMN_COUNT = 20;
const IMPORT_DOCUMENT_COLUMN = 17;
const IMPORT_CUSTOMER_COLUMN = 19;

const PLANS = [
  {
    name: "Internet 400 MB",
    type: "Internet",
    speed: "400 MB",
    basePrice: 99.9,
    minPrice: 89.9,
    features: ["Wi-Fi 6", "Instalação grátis"],
  },
  {
    name: "Internet 700 MB",
    type: "Internet",
    speed: "700 MB",
    basePrice: 119.9,
    minPrice: 104.9,
    features: ["Wi-Fi 6", "Instalação grátis", "App de streaming"],
  },
  {
    name: "Internet 1 GB",
    type: "Internet",
    speed: "1 GB",
    basePrice: 149.9,
    minPrice: 129.9,
    features: ["Wi-Fi 6 Mesh", "Instalação grátis", "App de streaming"],
  },
  {
    name: "Fixo Ilimitado",
    type: "Fixo",
    speed: null,
    basePrice: 49.9,
    minPrice: 39.9,
    features: ["Ligações ilimitadas para fixo e celular"],
  },
];

type DomainIds = (type: DomainType, value: string) => string;

interface Person {
  id: string;
  name: string;
}

interface DemoPeople {
  roles: Prisma.RoleCreateManyInput[];
  users: Prisma.UserCreateManyInput[];
  user: (key: DemoProfileKey) => Person;
  sellers: Person[];
}

interface DemoPlan {
  id: string;
  basePrice: number;
  minPrice: number;
}

interface DemoCustomer {
  id: string;
  name: string;
  document: string;
  email: string;
  phone1: string;
  phone2: string | null;
  birthDate: Date | null;
  motherName: string | null;
  address: {
    postalCode: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

interface SaleOutcome {
  status: string;
  /** When the status left GROSS; null while it is still GROSS. */
  changedAt: Date | null;
  cancelReason: string | null;
  installedAt: Date | null;
  scheduleDate: Date | null;
}

interface DemoSale {
  dueDay: number;
  id: string;
  orderNumber: string;
  customer: DemoCustomer;
  seller: Person;
  createdAt: Date;
  outcome: SaleOutcome;
}

function dateOnly(instant: Date): Date {
  return new Date(`${businessDateKey(instant)}T00:00:00.000Z`);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function atHour(date: Date, hour: number): Date {
  return new Date(date.getTime() + hour * HOUR_MS);
}

function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

function required<K, V>(map: Map<K, V>, key: K): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`demo dataset: missing ${String(key)}`);
  return value;
}

export function buildDemoDataset(options: DemoDatasetOptions): DemoDataset {
  const random = new SeededRandom(SEED);
  const today = dateOnly(options.now);
  const since = addDays(today, -(HISTORY_DAYS + 30));

  const domain = buildDomainValues(random, options);
  const plans = buildPlans(random, domain.id);
  const people = buildPeople(random, since);
  const customers = buildCustomers(random);
  const sales = buildSales(random, {
    today,
    now: options.now,
    domain: domain.id,
    plans: plans.plans,
    people,
    customers,
    options,
  });

  return {
    roles: people.roles,
    users: people.users,
    domainValues: domain.rows,
    plans: plans.rows,
    customers: customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      cpfCnpj: customer.document,
      birthDate: customer.birthDate,
      motherName: customer.motherName,
      email: customer.email,
      phone1: customer.phone1,
      phone2: customer.phone2,
      createdAt: sales.firstSaleAt.get(customer.id) ?? today,
    })),
    customerAddresses: customers.map((customer) => ({
      id: random.uuid(),
      customerId: customer.id,
      isDefault: true,
      ...customer.address,
    })),
    sales: sales.rows,
    saleAddresses: sales.addresses,
    auditLogs: sales.auditLogs,
    notifications: buildNotifications(random, today, options.now, people, sales.summaries),
    ...buildImportBatch(random, today, people, sales.summaries),
    systemSettings: [
      { key: "DUE_NOTIFICATION_DAYS", value: [0, 1] },
      { key: "UPLOAD_MAX_MB", value: 25 },
    ],
  };
}

function buildDomainValues(random: SeededRandom, options: DemoDatasetOptions) {
  const lists: Array<[DomainType, string[]]> = [
    ["SALE_STATUS", ["GROSS", "AG. INSTALAÇÃO", "AG. BIOMETRIA", "CANCELADA"]],
    ["PAYMENT_METHOD", ["BOLETO", "DÉBITO AUTOMÁTICO"]],
    ["MAILING", MAILINGS],
    ["PDV", [...new Set([options.defaultPdv, SECOND_PDV])]],
    ["SYSTEM", [options.defaultSystem]],
    ["PLAN_TYPE", ["Internet", "Fixo"]],
    ["SCHEDULE_PERIOD", SCHEDULE_PERIODS],
  ];
  const ids = new Map<string, string>();
  const rows: Prisma.DomainValueCreateManyInput[] = [];
  for (const [type, values] of lists) {
    values.forEach((value, index) => {
      const id = random.uuid();
      ids.set(`${type}|${value}`, id);
      rows.push({ id, type, value, order: index + 1 });
    });
  }
  const id: DomainIds = (type, value) => required(ids, `${type}|${value}`);
  return { rows, id };
}

function buildPlans(random: SeededRandom, domain: DomainIds) {
  const plans: DemoPlan[] = [];
  const rows: Prisma.PlanCreateManyInput[] = [];
  for (const plan of PLANS) {
    const id = random.uuid();
    plans.push({ id, basePrice: plan.basePrice, minPrice: plan.minPrice });
    rows.push({
      id,
      name: plan.name,
      typeId: domain("PLAN_TYPE", plan.type),
      speed: plan.speed,
      features: plan.features,
      basePrice: plan.basePrice.toFixed(2),
      minPrice: plan.minPrice.toFixed(2),
      salesScript: SALES_SCRIPT,
    });
  }
  return { plans, rows };
}

function buildPeople(random: SeededRandom, since: Date): DemoPeople {
  const roles: Prisma.RoleCreateManyInput[] = [];
  const users: Prisma.UserCreateManyInput[] = [];
  const roleIds = new Map<DemoProfileKey, string>();
  const profileUsers = new Map<DemoProfileKey, Person>();

  const addUser = (name: string, email: string, roleId: string): Person => {
    const person = { id: random.uuid(), name };
    users.push({
      id: person.id,
      name,
      email,
      roleId,
      status: "ACTIVE",
      reference: String(users.length + 1).padStart(4, "0"),
      createdAt: since,
    });
    return person;
  };

  for (const key of DEMO_PROFILE_KEYS) {
    const profile = DEMO_PROFILES[key];
    const roleId = random.uuid();
    roleIds.set(key, roleId);
    roles.push({
      id: roleId,
      name: profile.label,
      description: profile.description,
      permissions: [...profile.permissions],
      saleFunctions: profile.saleFunctions,
    });
    profileUsers.set(key, addUser(profile.userName, profile.email, roleId));
  }

  const extraSellers = EXTRA_SELLER_NAMES.map((name, index) =>
    addUser(name, `vendedor${index + 2}@example.com`, required(roleIds, "seller")),
  );

  return {
    roles,
    users,
    user: (key) => required(profileUsers, key),
    sellers: [required(profileUsers, "seller"), ...extraSellers],
  };
}

function buildCustomers(random: SeededRandom): DemoCustomer[] {
  const documents = new Set<string>();
  const customers: DemoCustomer[] = [];
  for (let index = 0; index < CUSTOMER_COUNT; index++) {
    const isCompany = random.chance(0.1);
    const firstName = random.pick(FIRST_NAMES);
    const lastName = random.pick(LAST_NAMES);
    const [prefix, suffix] = random.pick(COMPANY_PATTERNS);
    const name = isCompany
      ? `${prefix}${lastName}${suffix}`
      : `${firstName} ${lastName} ${random.pick(LAST_NAMES)}`;
    let document = isCompany ? fakeCnpj(random) : fakeCpf(random);
    while (documents.has(document)) document = isCompany ? fakeCnpj(random) : fakeCpf(random);
    documents.add(document);
    const city = random.pick(CITIES);
    customers.push({
      id: random.uuid(),
      name,
      document,
      email: `${slug(name)}.${index + 1}@example.com`,
      phone1: `${city.ddd}9${random.digits(8)}`,
      phone2: random.chance(0.3) ? `${city.ddd}9${random.digits(8)}` : null,
      birthDate: isCompany
        ? null
        : new Date(Date.UTC(random.int(1960, 2002), random.int(0, 11), random.int(1, 28))),
      motherName: isCompany ? null : `${random.pick(FIRST_NAMES)} ${lastName}`,
      address: {
        postalCode: `${city.cepPrefix}${random.digits(6)}`,
        street: random.pick(STREETS),
        number: String(random.int(10, 2500)),
        neighborhood: random.pick(NEIGHBORHOODS),
        city: city.name,
        state: city.state,
      },
    });
  }
  return customers;
}

// Every sale starts as GROSS; later statuses follow no fixed order and installation is recorded
// only by its date. Changes happen before today so no event lands in the future.
function saleOutcome(random: SeededRandom, daysAgo: number, today: Date, date: Date): SaleOutcome {
  if (daysAgo > 2 && random.chance(0.12)) {
    return {
      status: CANCELED_STATUS,
      changedAt: atHour(addDays(date, random.int(1, Math.min(10, daysAgo - 1))), 18),
      cancelReason: random.pick(CANCEL_REASONS),
      installedAt: null,
      scheduleDate: null,
    };
  }
  const status =
    daysAgo < 2 || random.chance(0.5)
      ? INITIAL_STATUS
      : random.chance(0.6)
        ? "AG. INSTALAÇÃO"
        : "AG. BIOMETRIA";
  const isInstalled = daysAgo >= 20 || (daysAgo >= 7 && random.chance(0.5));
  return {
    status,
    changedAt:
      status === INITIAL_STATUS
        ? null
        : atHour(addDays(date, random.int(1, Math.min(5, daysAgo - 1))), 17),
    cancelReason: null,
    installedAt: isInstalled ? addDays(date, random.int(2, Math.min(10, daysAgo - 1))) : null,
    scheduleDate: isInstalled ? null : addDays(today, random.int(1, 7)),
  };
}

interface SaleContext {
  today: Date;
  now: Date;
  domain: DomainIds;
  plans: DemoPlan[];
  people: DemoPeople;
  customers: DemoCustomer[];
  options: DemoDatasetOptions;
}

function buildSales(random: SeededRandom, context: SaleContext) {
  const { today, now, domain, plans, people, customers, options } = context;
  const backoffice = people.user("backoffice");
  const supervisor = people.user("supervisor");
  const bank = findBank("001");
  const rows: Prisma.SaleCreateManyInput[] = [];
  const addresses: Prisma.SaleAddressCreateManyInput[] = [];
  const auditLogs: Prisma.AuditLogCreateManyInput[] = [];
  const summaries: DemoSale[] = [];
  const firstSaleAt = new Map<string, Date>();

  // A power above 1 pulls the values toward zero days ago, so recent months have more sales and
  // the revenue chart shows growth.
  const daysAgoList = Array.from({ length: SALE_COUNT }, () =>
    Math.floor(HISTORY_DAYS * random.next() ** 1.25),
  ).sort((a, b) => b - a);

  daysAgoList.forEach((daysAgo, index) => {
    const id = random.uuid();
    const date = addDays(today, -daysAgo);
    const createdAt = new Date(Math.min(atHour(date, random.int(11, 21)).getTime(), now.getTime()));
    // The first sales give every customer a purchase; the rest are repeat buyers.
    const customer = index < customers.length ? customers[index] : random.pick(customers);
    if (!firstSaleAt.has(customer.id)) firstSaleAt.set(customer.id, createdAt);
    const plan = random.pick(plans);
    const seller = random.pick(people.sellers);
    const isDebit = random.chance(0.4);
    const dueDay = random.pick(DUE_DAYS);
    const outcome = saleOutcome(random, daysAgo, today, date);
    const initialStatusId = domain("SALE_STATUS", INITIAL_STATUS);
    const statusId = domain("SALE_STATUS", outcome.status);
    const amount = (
      plan.minPrice +
      random.int(0, Math.round((plan.basePrice - plan.minPrice) * 10)) / 10
    ).toFixed(2);
    const orderNumber = String(41_000_000 + index * 13);
    const bankData: Pick<
      Prisma.SaleCreateManyInput,
      | "bankCode"
      | "bankName"
      | "bankAgency"
      | "bankAgencyDigit"
      | "bankAccount"
      | "bankAccountDigit"
      | "bankAccountType"
      | "accountHolderIsCustomer"
    > = isDebit
      ? {
          bankCode: "001",
          bankName: bank?.name ?? null,
          bankAgency: random.digits(4),
          bankAgencyDigit: random.digits(1),
          bankAccount: random.digits(6),
          bankAccountDigit: random.digits(1),
          bankAccountType: "CHECKING",
          accountHolderIsCustomer: true,
        }
      : {};

    rows.push({
      id,
      orderNumber,
      amount,
      date,
      createdAt,
      dueDay,
      customerId: customer.id,
      statusId,
      paymentMethodId: domain("PAYMENT_METHOD", isDebit ? "DÉBITO AUTOMÁTICO" : "BOLETO"),
      systemId: domain("SYSTEM", options.defaultSystem),
      mailingId: domain("MAILING", random.pick(MAILINGS)),
      pdvId: domain("PDV", options.defaultPdv),
      sellerId: seller.id,
      supervisorId: supervisor.id,
      planId: plan.id,
      ...bankData,
      ...outcomeFields(random, outcome, backoffice.id, domain),
    });
    addresses.push({ id: random.uuid(), saleId: id, ...customer.address });

    auditLogs.push({
      id: random.uuid(),
      entity: "Sale",
      entityId: id,
      action: "CREATE",
      userId: seller.id,
      createdAt,
      diff: computeDiff(null, { id, amount, statusId: initialStatusId, sellerId: seller.id }),
    });

    if (outcome.changedAt) {
      auditLogs.push({
        id: random.uuid(),
        entity: "Sale",
        entityId: id,
        action: "UPDATE",
        userId: backoffice.id,
        createdAt: outcome.changedAt,
        diff:
          outcome.status === CANCELED_STATUS
            ? computeDiff(
                { statusId: initialStatusId, canceledAt: null },
                { statusId, cancelReason: outcome.cancelReason },
              )
            : computeDiff({ statusId: initialStatusId }, { statusId }),
      });
    }

    summaries.push({ id, dueDay, orderNumber, customer, seller, createdAt, outcome });
  });

  return { rows, addresses, auditLogs, summaries, firstSaleAt };
}

type OutcomeFields = Pick<
  Prisma.SaleCreateManyInput,
  | "canceledAt"
  | "cancelReason"
  | "canceledById"
  | "bkoId"
  | "auditorId"
  | "installedAt"
  | "auditNote"
  | "brscan"
  | "scheduleDate"
  | "schedulePeriodId"
>;

function outcomeFields(
  random: SeededRandom,
  outcome: SaleOutcome,
  backofficeId: string,
  domain: DomainIds,
): OutcomeFields {
  if (outcome.status === CANCELED_STATUS) {
    return {
      canceledAt: outcome.changedAt,
      cancelReason: outcome.cancelReason,
      canceledById: backofficeId,
      bkoId: backofficeId,
    };
  }
  if (outcome.installedAt) {
    return {
      installedAt: outcome.installedAt,
      bkoId: backofficeId,
      auditorId: backofficeId,
      auditNote: "OK",
      brscan: true,
    };
  }
  return {
    scheduleDate: outcome.scheduleDate,
    schedulePeriodId: domain("SCHEDULE_PERIOD", random.pick(SCHEDULE_PERIODS)),
  };
}

function buildNotifications(
  random: SeededRandom,
  today: Date,
  now: Date,
  people: DemoPeople,
  sales: DemoSale[],
): Prisma.NotificationCreateManyInput[] {
  const manager = people.user("manager");
  const supervisor = people.user("supervisor");
  const seller = people.user("seller");
  const backoffice = people.user("backoffice");
  const rows: Prisma.NotificationCreateManyInput[] = [];

  for (const sale of sales.slice(-8)) {
    for (const watcher of [manager, supervisor]) {
      rows.push({
        id: random.uuid(),
        userId: watcher.id,
        type: "SALE_CHANGE",
        createdAt: sale.createdAt,
        readAt: random.chance(0.5) ? sale.createdAt : null,
        payload: {
          saleId: sale.id,
          orderNumber: sale.orderNumber,
          customerName: sale.customer.name,
          kind: "create",
          actorName: sale.seller.name,
          sellerName: sale.seller.name,
          audience: "watcher",
        },
      });
    }
  }

  const sellerChanges = sales
    .filter((sale) => sale.seller.id === seller.id && sale.outcome.changedAt !== null)
    .slice(-6);
  for (const sale of sellerChanges) {
    const changedAt = sale.outcome.changedAt ?? sale.createdAt;
    const isCanceled = sale.outcome.status === CANCELED_STATUS;
    rows.push({
      id: random.uuid(),
      userId: seller.id,
      type: "SALE_CHANGE",
      createdAt: changedAt,
      readAt: random.chance(0.5) ? changedAt : null,
      payload: {
        saleId: sale.id,
        orderNumber: sale.orderNumber,
        customerName: sale.customer.name,
        kind: isCanceled ? "cancel" : "status",
        detail: isCanceled
          ? (sale.outcome.cancelReason ?? "")
          : `${INITIAL_STATUS} → ${sale.outcome.status}`,
        changedFields: [],
        actorName: backoffice.name,
      },
    });
  }

  // Same rule as the real due-date check: it only notifies for a day that has sales.
  let offset = 0;
  while (!DUE_DAYS.includes(addDays(today, offset).getUTCDate())) offset++;
  const dueDay = addDays(today, offset).getUTCDate();
  const dueSales = sales.filter(
    (sale) => sale.dueDay === dueDay && sale.outcome.status !== CANCELED_STATUS,
  );
  for (const user of [supervisor, seller]) {
    const isOwn = user.id === seller.id;
    rows.push({
      id: random.uuid(),
      userId: user.id,
      type: "DUE_DATE",
      createdAt: new Date(Math.min(atHour(today, 11).getTime(), now.getTime())),
      readAt: null,
      payload: {
        dueDay,
        count: dueSales.filter((sale) => !isOwn || sale.seller.id === seller.id).length,
        offset,
        scope: isOwn ? "own" : "all",
      },
    });
  }
  return rows;
}

function buildImportBatch(
  random: SeededRandom,
  today: Date,
  people: DemoPeople,
  sales: DemoSale[],
): Pick<DemoDataset, "importBatches" | "importRows"> {
  const batchId = random.uuid();
  const importedAt = atHour(addDays(today, -30), 13);
  const imported = sales.filter((sale) => sale.createdAt < importedAt).slice(-IMPORTED_SALE_COUNT);
  return {
    importBatches: [
      {
        id: batchId,
        fileName: "planilha-vendas.csv",
        importedById: people.user("manager").id,
        stats: { ignored: 0 },
        createdAt: importedAt,
      },
    ],
    importRows: imported.map((sale, index): Prisma.ImportRowCreateManyInput => {
      const cells = Array.from({ length: IMPORT_COLUMN_COUNT }, () => "");
      cells[IMPORT_DOCUMENT_COLUMN] = formatCpfCnpj(sale.customer.document);
      cells[IMPORT_CUSTOMER_COLUMN] = sale.customer.name;
      return {
        id: random.uuid(),
        batchId,
        rowHash: random.hex(64),
        raw: cells,
        status: "CREATED",
        saleId: sale.id,
        lineNumber: index + 2,
        createdAt: importedAt,
      };
    }),
  };
}
