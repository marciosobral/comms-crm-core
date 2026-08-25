import { Allow } from "class-validator";

export class UpdateSettingDto {
  @Allow()
  value!: unknown;
}
