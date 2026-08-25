import { IsIn } from "class-validator";

export class SetStatusDto {
  @IsIn(["ACTIVE", "INACTIVE"], { message: "Status deve ser ACTIVE ou INACTIVE" })
  status!: "ACTIVE" | "INACTIVE";
}
