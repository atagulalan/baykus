import { describe, expect, it } from "vitest";
import { HANDLE_PATTERN, sanitizeHandleInput } from "./handleInput.ts";

describe("sanitizeHandleInput", () => {
  it("keeps lowercase alnum and hyphen", () => {
    expect(sanitizeHandleInput("xava-42")).toBe("xava-42");
  });

  it("lowercases and drops punctuation / spaces", () => {
    expect(sanitizeHandleInput("Xava.Name;")).toBe("xavaname");
    expect(sanitizeHandleInput("ava name")).toBe("avaname");
  });

  it("takes only the local part of an email suggest", () => {
    expect(sanitizeHandleInput("user@gmail.com")).toBe("user");
    expect(sanitizeHandleInput("User.Name+tag@mail.com")).toBe("usernametag");
  });

  it("rejects @ and other specials for validity", () => {
    expect(HANDLE_PATTERN.test("user@x")).toBe(false);
    expect(HANDLE_PATTERN.test(sanitizeHandleInput("user@x"))).toBe(true);
    expect(HANDLE_PATTERN.test("ab")).toBe(false);
    expect(HANDLE_PATTERN.test("abc")).toBe(true);
  });

  it("caps at 30 chars", () => {
    expect(sanitizeHandleInput("a".repeat(40))).toHaveLength(30);
  });
});
