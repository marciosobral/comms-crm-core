import { IsNotEmpty, IsString } from "class-validator";

export class SetSaleSellerDto {
  @IsString()
  @IsNotEmpty()
  sellerId!: string;
}
