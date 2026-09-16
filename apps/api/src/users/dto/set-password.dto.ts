import { MESSAGES } from "@comms-core/validation";
import { IsString, MinLength } from "class-validator";

export class SetPasswordDto {
  @IsString()
  @MinLength(8, { message: MESSAGES.password })
  password!: string;
}
