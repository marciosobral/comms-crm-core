import { createReadStream } from "node:fs";
import { mkdir, rename, unlink } from "node:fs/promises";
import { extname, join } from "node:path";
import { HttpStatus, Injectable, StreamableFile } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AttachmentKind } from "../../prisma/generated/prisma/client/client";
import type { AuditContext } from "../audit/audit-context.decorator";
import { AuditService } from "../audit/audit.service";
import type { Env } from "../config";
import { AppException } from "../logging/app-exception";
import { ErrorCode } from "../logging/error-codes";
import { PrismaService } from "../prisma";
import type { SaleActor } from "../sales/sales.service";
import { SalesService } from "../sales/sales.service";
import { SystemSettingsService } from "../settings";

const AUDIO_MIMES = [
  "audio/mpeg",
  "audio/ogg",
  "audio/opus",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
];
const DOCUMENT_MIMES = ["image/png", "image/jpeg", "application/pdf"];

const MIMES_BY_KIND: Record<AttachmentKind, string[]> = {
  AUDIO: AUDIO_MIMES,
  PROOF_OF_ADDRESS: DOCUMENT_MIMES,
  OTHER: [...DOCUMENT_MIMES, ...AUDIO_MIMES],
};

export function assertAttachmentAllowed(
  mime: string,
  sizeBytes: number,
  maxMb: number,
  kind: AttachmentKind = "OTHER",
): void {
  if (!MIMES_BY_KIND[kind].includes(mime)) {
    throw new AppException(ErrorCode.ATTACHMENT_TYPE_INVALID, "Tipo de arquivo não permitido");
  }
  if (sizeBytes > maxMb * 1024 * 1024) {
    throw new AppException(
      ErrorCode.ATTACHMENT_TOO_LARGE,
      `Arquivo excede o limite de ${maxMb} MB`,
    );
  }
}

export function assertCanUpload(actor: SaleActor, saleSellerId: string): void {
  if (actor.status === "ACTIVE" && actor.isSuperAdmin) return;
  const granted = new Set(actor.role?.permissions ?? []);
  const allowed =
    actor.status === "ACTIVE" &&
    (granted.has("sales.edit") || (granted.has("sales.create") && saleSellerId === actor.id));
  if (!allowed) {
    throw new AppException(
      ErrorCode.FORBIDDEN,
      "Sem permissão para anexar arquivos nesta venda",
      HttpStatus.FORBIDDEN,
    );
  }
}

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sales: SalesService,
    private readonly settings: SystemSettingsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private uploadDir(): string {
    return this.config.get("UPLOAD_DIR");
  }

  private async maxMb(): Promise<number> {
    const setting = await this.settings.get("UPLOAD_MAX_MB");
    const value = Number(setting?.value);
    return Number.isFinite(value) && value > 0 ? value : 25;
  }

  async upload(
    saleId: string,
    file: Express.Multer.File,
    kind: AttachmentKind,
    actor: SaleActor,
    ctx: AuditContext,
  ) {
    try {
      const sale = await this.sales.detail(saleId, actor);
      assertCanUpload(actor, sale.sellerId);
      assertAttachmentAllowed(file.mimetype, file.size, await this.maxMb(), kind);
    } catch (error) {
      await unlink(file.path).catch(() => undefined);
      throw error;
    }

    const attachment = await this.prisma.attachment.create({
      data: {
        saleId,
        fileName: file.originalname,
        path: "",
        mime: file.mimetype,
        size: file.size,
        kind,
        uploadedById: actor.id,
      },
    });

    const dir = join(this.uploadDir(), saleId);
    await mkdir(dir, { recursive: true });
    const finalPath = join(dir, `${attachment.id}${extname(file.originalname)}`);
    await rename(file.path, finalPath);
    const saved = await this.prisma.attachment.update({
      where: { id: attachment.id },
      data: { path: finalPath },
    });

    await this.audit.record({
      entity: "Attachment",
      entityId: attachment.id,
      action: "CREATE",
      ctx,
      after: { saleId, fileName: file.originalname, mime: file.mimetype, size: file.size, kind },
    });
    return saved;
  }

  async download(
    id: string,
    actor: SaleActor,
  ): Promise<{ file: StreamableFile; mime: string; fileName: string }> {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) {
      throw new AppException(
        ErrorCode.ATTACHMENT_NOT_FOUND,
        "Anexo não encontrado",
        HttpStatus.NOT_FOUND,
      );
    }
    await this.sales.detail(attachment.saleId, actor);
    return {
      file: new StreamableFile(createReadStream(attachment.path)),
      mime: attachment.mime,
      fileName: attachment.fileName,
    };
  }

  async remove(id: string, actor: SaleActor, ctx: AuditContext) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) {
      throw new AppException(
        ErrorCode.ATTACHMENT_NOT_FOUND,
        "Anexo não encontrado",
        HttpStatus.NOT_FOUND,
      );
    }
    await this.sales.detail(attachment.saleId, actor);
    await this.prisma.attachment.delete({ where: { id } });
    await unlink(attachment.path).catch(() => undefined);
    await this.audit.record({
      entity: "Attachment",
      entityId: id,
      action: "DELETE",
      ctx,
      before: { saleId: attachment.saleId, fileName: attachment.fileName },
    });
  }
}
