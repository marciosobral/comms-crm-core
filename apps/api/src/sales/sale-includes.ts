export const DOMAIN_SELECT = { select: { id: true, value: true } } as const;
export const USER_SELECT = { select: { id: true, name: true } } as const;
export const PLAN_SELECT = {
  select: { id: true, name: true, basePrice: true, minPrice: true },
} as const;

export const SALE_INCLUDE = {
  customer: true,
  status: DOMAIN_SELECT,
  paymentMethod: DOMAIN_SELECT,
  system: DOMAIN_SELECT,
  mailing: DOMAIN_SELECT,
  pdv: DOMAIN_SELECT,
  seller: USER_SELECT,
  supervisor: USER_SELECT,
  bko: USER_SELECT,
  auditor: USER_SELECT,
  canceledBy: USER_SELECT,
  fixedPlan: PLAN_SELECT,
  internetPlan: PLAN_SELECT,
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
      createdAt: true,
      uploadedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" } as const,
  },
} as const;
