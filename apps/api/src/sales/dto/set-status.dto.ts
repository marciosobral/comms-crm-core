import { IsNotEmpty, IsString } from "class-validator";

export class SetSaleStatusDto {
  @IsString()
  @IsNotEmpty()
  statusId!: string;
}
