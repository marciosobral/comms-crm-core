import { IsNotEmpty, IsString } from "class-validator";

export class CancelSaleDto {
  @IsString()
  @IsNotEmpty({ message: "Informe o motivo do cancelamento" })
  reason!: string;
}
