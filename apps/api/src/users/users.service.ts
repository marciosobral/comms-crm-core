import { HttpStatus, Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import type { AuditContext } from "../audit/audit-context.decorator";
import { AuditService } from "../audit/audit.service";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { PrismaService } from "../prisma";
import { CreateUserDto, UpdateUserDto } from "./dto";
import { generateReference } from "./reference";

const PUBLIC_FIELDS = {
  id: true,
  name: true,
  email: true,
  cpf: true,
  phone: true,
  status: true,
  reference: true,
  isSuperAdmin: true,
  roleId: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.user.findMany({
      select: { ...PUBLIC_FIELDS, role: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    });
  }

  async create(dto: CreateUserDto, ctx: AuditContext) {
    await this.assertEmailFree(dto.email, null);
    if (dto.cpf) await this.assertCpfFree(dto.cpf, null);
    if (dto.roleId) await this.assertRoleExists(dto.roleId);

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        cpf: dto.cpf ?? null,
        phone: dto.phone ?? null,
        roleId: dto.roleId ?? null,
        status: "ACTIVE",
        reference: generateReference(),
        credential: { create: { passwordHash } },
      },
      select: PUBLIC_FIELDS,
    });

    await this.audit.record({
      entity: "User",
      entityId: user.id,
      action: "CREATE",
      ctx,
      after: user,
    });
    return user;
  }

  async update(id: string, dto: UpdateUserDto, ctx: AuditContext) {
    const before = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: PUBLIC_FIELDS,
    });

    if (dto.email) await this.assertEmailFree(dto.email, id);
    if (dto.cpf) await this.assertCpfFree(dto.cpf, id);
    if (dto.roleId) await this.assertRoleExists(dto.roleId);

    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: PUBLIC_FIELDS,
    });

    await this.audit.record({
      entity: "User",
      entityId: id,
      action: "UPDATE",
      ctx,
      before,
      after: user,
    });
    return user;
  }

  async setStatus(id: string, status: "ACTIVE" | "INACTIVE", ctx: AuditContext) {
    const before = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: PUBLIC_FIELDS,
    });
    const user = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: PUBLIC_FIELDS,
    });
    await this.audit.record({
      entity: "User",
      entityId: id,
      action: "UPDATE",
      ctx,
      before,
      after: user,
    });
    return user;
  }

  private async assertEmailFree(email: string, selfId: string | null): Promise<void> {
    const existing = await this.prisma.user.findFirst({ where: { email } });
    if (existing && existing.id !== selfId) {
      throw new AppException(
        ErrorCode.USER_EMAIL_TAKEN,
        "Já existe um usuário com esse e-mail",
        HttpStatus.CONFLICT,
      );
    }
  }

  private async assertCpfFree(cpf: string, selfId: string | null): Promise<void> {
    const existing = await this.prisma.user.findFirst({ where: { cpf } });
    if (existing && existing.id !== selfId) {
      throw new AppException(
        ErrorCode.USER_CPF_TAKEN,
        "Já existe um usuário com esse CPF",
        HttpStatus.CONFLICT,
      );
    }
  }

  private async assertRoleExists(roleId: string): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new AppException(ErrorCode.ROLE_NOT_FOUND, "Cargo não encontrado");
    }
  }
}
