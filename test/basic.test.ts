import { describe, it, expect } from "vitest";
import { KHQRGenerator, decodeTlv } from "../src/index";

describe("konthaina-khqr", () => {
  it("generates a QR with valid CRC", () => {
    const res = new KHQRGenerator("individual")
      .setBakongAccountId("john_smith@devb")
      .setMerchantName("John Smith")
      .setCurrency("USD")
      .setAmount("1.00")
      .generate();

    expect(KHQRGenerator.verify(res.qr)).toBe(true);
  });

  it("dynamic mode includes created and expiration timestamps in tag 99", () => {
    const res = new KHQRGenerator("individual")
      .setBakongAccountId("john_smith@devb")
      .setMerchantName("John Smith")
      .setCurrency("USD")
      .setAmount("1.00")
      .setExpirationTimestamp("1742250654184")
      .generate();

    expect(res.timestamp).toMatch(/^\d+$/);
    expect(res.expirationTimestamp).toBe("1742250654184");
    expect(KHQRGenerator.verify(res.qr)).toBe(true);

    const tlvs = decodeTlv(res.qr);
    expect(tlvs["99"]).toBe(`0013${res.timestamp}01131742250654184`);
  });

  it("dynamic mode defaults expiration to 5 minutes", () => {
    const before = Date.now();
    const res = new KHQRGenerator("individual")
      .setBakongAccountId("john_smith@devb")
      .setMerchantName("John Smith")
      .setCurrency("USD")
      .setAmount("1.00")
      .generate();
    const after = Date.now();

    expect(Number(res.expirationTimestamp)).toBeGreaterThanOrEqual(before + 5 * 60 * 1000);
    expect(Number(res.expirationTimestamp)).toBeLessThanOrEqual(after + 5 * 60 * 1000);
  });

  it("static mode omits timestamp (tag 99)", () => {
    const res = new KHQRGenerator("individual")
      .setStatic(true)
      .setBakongAccountId("john_smith@devb")
      .setMerchantName("John Smith")
      .setCurrency("USD")
      .generate();

    expect(res.timestamp).toBe(null);
    expect(res.expirationTimestamp).toBe(null);
    expect(KHQRGenerator.verify(res.qr)).toBe(true);

    const tlvs = decodeTlv(res.qr);
    expect(tlvs["99"]).toBeUndefined();
    expect(tlvs["63"]).toBeDefined();
  });

  it("merchant type requires merchantId and acquiringBank", () => {
    expect(() =>
      new KHQRGenerator("merchant")
        .setBakongAccountId("dev_merchant@devb")
        .setMerchantName("Dev Store")
        .generate(),
    ).toThrow();
  });
});
