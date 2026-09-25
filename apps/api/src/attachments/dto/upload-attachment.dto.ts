import { IsEnum, IsOptional } from "class-validator";
import { AttachmentKind } from "../../../prisma/generated/prisma/client/client";

export class UploadAttachmentDto {
  @IsOptional()
  @IsEnum(AttachmentKind)
  kind?: AttachmentKind;
}
