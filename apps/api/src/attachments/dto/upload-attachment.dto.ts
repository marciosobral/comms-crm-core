import { AttachmentKind } from "@prisma-client";
import { IsEnum, IsOptional } from "class-validator";

export class UploadAttachmentDto {
  @IsOptional()
  @IsEnum(AttachmentKind)
  kind?: AttachmentKind;
}
