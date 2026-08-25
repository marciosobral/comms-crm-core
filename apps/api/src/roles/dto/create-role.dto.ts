import { IsArray, IsNotEmpty, IsString } from "class-validator";

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}
