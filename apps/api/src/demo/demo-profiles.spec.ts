import { describe, expect, it } from "vitest";
import { DEMO_PROFILES, DEMO_PROFILE_KEYS, publicDemoProfiles } from "./demo-profiles";

describe("demo profiles", () => {
  it("lists the four profiles without their accounts", () => {
    expect(publicDemoProfiles().map((profile) => profile.key)).toEqual([...DEMO_PROFILE_KEYS]);
    for (const profile of publicDemoProfiles()) {
      expect(Object.keys(profile).sort()).toEqual(["description", "key", "label"]);
    }
  });

  it("uses placeholder emails", () => {
    for (const key of DEMO_PROFILE_KEYS) {
      expect(DEMO_PROFILES[key].email).toMatch(/@example\.com$/);
    }
  });
});
