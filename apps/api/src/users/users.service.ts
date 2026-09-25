import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import type { AuditContext } from "../audit/audit-context.decorator";
import { AuditService } from "../audit/audit.service";
import { assertUnique } from "../common/assert-unique";
import type { Env } from "../config";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { PrismaService } from "../prisma";
import { CreateUserDto, UpdateUserDto } from "./dto";
import { SYSTEM_REFERENCE, nextReference, normalizeReference } from "./reference";

const PUBLIC_FIELDS = {
  id: true,
  name: true,
  email: true,
  cpf: true,
  phone: true,
  status: true,
  reference: true,
  externalReference: true,
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
    private readonly config: ConfigService<Env, true>,
  ) {}

  async list() {
    const users = await this.prisma.user.findMany({
      select: { ...PUBLIC_FIELDS, role: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    });
    return users.map((user) => ({ ...user, isSystem: this.isSeededAdmin(user.email) }));
  }

  async create(dto: CreateUserDto, ctx: AuditContext) {
    await this.assertEmailFree(dto.email, null);
    if (dto.cpf) await this.assertCpfFree(dto.cpf, null);
    if (dto.roleId) await this.assertRoleExists(dto.roleId);

    const passwordHash = await argon2.hash(dto.password);
    const existing = await this.prisma.user.findMany({ select: { reference: true } });
    const references = existing.map((row) => row.reference);
    const reference = dto.reference ? normalizeReference(dto.reference) : nextReference(references);
    if (reference === SYSTEM_REFERENCE || (dto.reference && references.includes(reference))) {
      throw new AppException(
        ErrorCode.USER_REFERENCE_TAKEN,
        "Referência já em uso",
        HttpStatus.CONFLICT,
      );
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        cpf: dto.cpf ?? null,
        phone: dto.phone ?? null,
        externalReference: dto.externalReference ?? null,
        roleId: dto.roleId ?? null,
        status: "ACTIVE",
        reference,
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

    this.assertNotSeededAdmin(before.email);
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
    this.assertNotSeededAdmin(before.email);
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

  async setPassword(id: string, password: string, ctx: AuditContext) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: PUBLIC_FIELDS,
    });
    this.assertNotSeededAdmin(user.email);
    const passwordHash = await argon2.hash(password);
    await this.prisma.credential.update({
      where: { userId: id },
      data: { passwordHash, refreshToken: null, refreshTokenExpiresAt: null },
    });
    await this.audit.record({
      entity: "User",
      entityId: id,
      action: "UPDATE",
      ctx,
      before: { id },
      after: { id },
    });
    return user;
  }

  /** The seeded super admin (SEED_ADMIN_EMAIL) is a fixed system account managed on the server. */
  private isSeededAdmin(email: string): boolean {
    return email.toLowerCase() === this.config.get("SEED_ADMIN_EMAIL").toLowerCase();
  }

  private assertNotSeededAdmin(email: string): void {
    if (this.isSeededAdmin(email)) {
      throw new AppException(
        ErrorCode.USER_PROTECTED,
        "O usuário administrador do sistema não pode ser alterado",
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async assertEmailFree(email: string, selfId: string | null): Promise<void> {
    const existing = await this.prisma.user.findFirst({ where: { email } });
    assertUnique(
      existing,
      selfId,
      ErrorCode.USER_EMAIL_TAKEN,
      "Já existe um usuário com esse e-mail",
    );
  }

  private async assertCpfFree(cpf: string, selfId: string | null): Promise<void> {
    const existing = await this.prisma.user.findFirst({ where: { cpf } });
    assertUnique(existing, selfId, ErrorCode.USER_CPF_TAKEN, "Já existe um usuário com esse CPF");
  }

  private async assertRoleExists(roleId: string): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new AppException(ErrorCode.ROLE_NOT_FOUND, "Cargo não encontrado");
    }
  }
}
