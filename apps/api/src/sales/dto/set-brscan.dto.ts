import { IsBoolean } from "class-validator";

export class SetSaleBrscanDto {
  @IsBoolean()
  approved!: boolean;
}
