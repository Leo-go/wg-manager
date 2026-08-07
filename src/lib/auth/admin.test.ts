import { afterEach, describe, expect, it } from "vitest";
import { getAdminEmails, isAdminEmail } from "@/lib/auth/admin";

describe("isAdminEmail", () => {
  afterEach(() => {
    delete process.env.ADMIN_EMAILS;
  });

  it("returns false when ADMIN_EMAILS is empty", () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail("admin@example.com")).toBe(false);
    expect(getAdminEmails()).toEqual([]);
  });

  it("matches emails case-insensitively and trims spaces", () => {
    process.env.ADMIN_EMAILS = " Admin@Example.com , other@test.com ";
    expect(isAdminEmail("admin@example.com")).toBe(true);
    expect(isAdminEmail("OTHER@test.com")).toBe(true);
    expect(isAdminEmail("nope@test.com")).toBe(false);
  });

  it("rejects null/undefined/blank", () => {
    process.env.ADMIN_EMAILS = "admin@example.com";
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail("   ")).toBe(false);
  });
});
