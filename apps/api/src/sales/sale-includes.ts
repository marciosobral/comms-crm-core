export const DOMAIN_SELECT = { select: { id: true, value: true } } as const;
export const USER_SELECT = { select: { id: true, name: true } } as const;
export const PLAN_SELECT = {
  select: { id: true, name: true, basePrice: true, minPrice: true, type: DOMAIN_SELECT },
} as const;

export const SALE_INCLUDE = {
  customer: true,
  address: true,
  status: DOMAIN_SELECT,
  paymentMethod: DOMAIN_SELECT,
  system: DOMAIN_SELECT,
  mailing: DOMAIN_SELECT,
  pdv: DOMAIN_SELECT,
  schedulePeriod: DOMAIN_SELECT,
  seller: { select: { id: true, name: true, externalReference: true } },
  supervisor: USER_SELECT,
  bko: USER_SELECT,
  auditor: USER_SELECT,
  canceledBy: USER_SELECT,
  plan: PLAN_SELECT,
  _count: { select: { attachments: true } },
} as const;

export const SALE_DETAIL_INCLUDE = {
  ...SALE_INCLUDE,
  attachments: {
    select: {
      id: true,
      fileName: true,
      mime: true,
      size: true,
      kind: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" } as const,
  },
} as const;
