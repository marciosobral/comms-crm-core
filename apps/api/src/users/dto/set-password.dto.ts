import { IsString, MinLength } from "class-validator";
import { MESSAGES } from "@comms-core/validation";

export class SetPasswordDto {
  @IsString()
  @MinLength(8, { message: MESSAGES.password })
  password!: string;
}
