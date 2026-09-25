import { describe, expect, it } from "vitest";
import { toCsvBlob } from "./csv";

describe("toCsvBlob", () => {
  it("quotes every cell and joins columns with semicolons", async () => {
    const blob = toCsvBlob(["Nome", "E-mail"], [["Fulano de Tal", "fulano@example.com"]]);
    const text = await blob.text();
    expect(text).toBe('"Nome";"E-mail"\n"Fulano de Tal";"fulano@example.com"');
  });

  it("sets the CSV content type", () => {
    const blob = toCsvBlob(["Nome"], []);
    expect(blob.type).toBe("text/csv;charset=utf-8;");
  });

  it("joins rows with newlines", async () => {
    const blob = toCsvBlob(["A"], [["1"], ["2"]]);
    const text = await blob.text();
    expect(text).toBe('"A"\n"1"\n"2"');
  });
});
