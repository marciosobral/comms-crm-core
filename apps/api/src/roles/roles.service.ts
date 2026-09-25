import { HttpStatus, Injectable } from "@nestjs/common";
import { AuditContext } from "../audit/audit-context.decorator";
import { AuditService } from "../audit/audit.service";
import { assertUnique } from "../common/assert-unique";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { PermissionsService } from "../permissions/permissions.service";
import { PrismaService } from "../prisma";
import { CreateRoleDto, UpdateRoleDto } from "./dto";

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.role.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    });
  }

  async create(dto: CreateRoleDto, ctx: AuditContext) {
    this.permissions.assertKnownKeys(dto.permissions);
    const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
    assertUnique(existing, null, ErrorCode.ROLE_NAME_TAKEN, "Nome de cargo já existe");
    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        active: dto.active,
        permissions: dto.permissions,
      },
    });
    await this.audit.record({
      entity: "Role",
      entityId: role.id,
      action: "CREATE",
      ctx,
      after: role,
    });
    return role;
  }

  async update(id: string, dto: UpdateRoleDto, ctx: AuditContext) {
    if (dto.permissions) this.permissions.assertKnownKeys(dto.permissions);
    if (dto.name) {
      const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
      assertUnique(existing, id, ErrorCode.ROLE_NAME_TAKEN, "Nome de cargo já existe");
    }
    const before = await this.prisma.role.findUniqueOrThrow({ where: { id } });
    const role = await this.prisma.role.update({ where: { id }, data: dto });
    await this.audit.record({
      entity: "Role",
      entityId: id,
      action: "UPDATE",
      ctx,
      before,
      after: role,
    });
    return role;
  }

  async remove(id: string, ctx: AuditContext) {
    const usersCount = await this.prisma.user.count({ where: { roleId: id } });
    if (usersCount > 0) {
      throw new AppException(
        ErrorCode.ROLE_HAS_USERS,
        "Cargo possui usuários atribuídos",
        HttpStatus.CONFLICT,
      );
    }
    const before = await this.prisma.role.findUniqueOrThrow({ where: { id } });
    await this.prisma.role.delete({ where: { id } });
    await this.audit.record({
      entity: "Role",
      entityId: id,
      action: "DELETE",
      ctx,
      before,
    });
  }
}
