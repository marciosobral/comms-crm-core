import { IsIn } from "class-validator";
import { DEMO_PROFILE_KEYS, type DemoProfileKey } from "../demo-profiles";

export class DemoProfileDto {
  @IsIn([...DEMO_PROFILE_KEYS])
  profile!: DemoProfileKey;
}
