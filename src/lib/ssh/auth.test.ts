import { afterEach, describe, expect, it } from "vitest";
import {
  normalizePemKey,
  resolveSshAuth,
} from "@/lib/ssh/auth";

describe("normalizePemKey", () => {
  it("expands escaped newlines and trims", () => {
    expect(normalizePemKey("  line1\\nline2\\n  ")).toBe("line1\nline2");
  });
});

describe("resolveSshAuth", () => {
  afterEach(() => {
    delete process.env.WG_SSH_PRIVATE_KEY;
    delete process.env.WG_SSH_PRIVATE_KEY_PASSPHRASE;
  });

  it("prefers per-server private key over password and platform key", () => {
    process.env.WG_SSH_PRIVATE_KEY = "platform-key";
    const auth = resolveSshAuth({
      sshPrivateKey: "row-key\\n",
      sshPassword: "secret",
      sshPrivateKeyPassphrase: "phrase",
    });
    expect(auth).toEqual({
      type: "privateKey",
      privateKey: "row-key",
      passphrase: "phrase",
    });
  });

  it("uses password when no per-server key (even if platform key exists)", () => {
    process.env.WG_SSH_PRIVATE_KEY = "platform-key";
    const auth = resolveSshAuth({
      sshPassword: "  root-pass  ",
      sshPrivateKey: null,
    });
    expect(auth).toEqual({ type: "password", password: "root-pass" });
  });

  it("falls back to platform key", () => {
    process.env.WG_SSH_PRIVATE_KEY = "plat\\nkey";
    process.env.WG_SSH_PRIVATE_KEY_PASSPHRASE = "pp";
    const auth = resolveSshAuth({});
    expect(auth).toEqual({
      type: "privateKey",
      privateKey: "plat\nkey",
      passphrase: "pp",
    });
  });

  it("throws when no credentials are available", () => {
    expect(() => resolveSshAuth({})).toThrow(/No SSH credentials/);
  });
});
