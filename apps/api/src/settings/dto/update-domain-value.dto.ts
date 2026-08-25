import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateDomainValueDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  value?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}
