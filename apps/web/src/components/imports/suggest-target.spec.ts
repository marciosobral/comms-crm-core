import { describe, expect, it } from "vitest";
import { suggestTarget } from "./suggest-target";

describe("suggestTarget", () => {
  it("ignores accents and case", () => {
    const targets = [
      { id: "a", label: "Vitória Souza" },
      { id: "b", label: "Carlos Lima" },
    ];
    expect(suggestTarget("VITÓRIA", targets)).toBe("a");
  });

  it("prefers an exact match over a prefix match", () => {
    const targets = [
      { id: "a", label: "Vitoria Souza" },
      { id: "b", label: "Vitoria" },
    ];
    expect(suggestTarget("vitoria", targets)).toBe("b");
  });

  it("returns null when two targets tie for the best score", () => {
    const targets = [
      { id: "a", label: "Vitoria Souza" },
      { id: "b", label: "Vitoria Lima" },
    ];
    expect(suggestTarget("vitoria", targets)).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(suggestTarget("Fulano", [{ id: "a", label: "Carlos Lima" }])).toBeNull();
  });

  it("matches plan names exactly", () => {
    const targets = [
      { id: "a", label: "700 MB" },
      { id: "b", label: "700 MB + GP" },
    ];
    expect(suggestTarget("700 MB + GP", targets)).toBe("b");
  });
});
