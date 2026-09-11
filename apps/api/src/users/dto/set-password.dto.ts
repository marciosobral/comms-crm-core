import { IsString, MinLength } from "class-validator";

export class SetPasswordDto {
  @IsString()
  @MinLength(8, { message: "Senha deve ter ao menos 8 caracteres" })
  password!: string;
}
